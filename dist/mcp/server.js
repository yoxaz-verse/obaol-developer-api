"use strict";
/**
 * @file MCP server integration using @modelcontextprotocol/sdk over SSE + JSON-RPC HTTP.
 */
const express = require('express');
const { TOOL_DEFINITIONS, executeTool } = require('./tools');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const router = express.Router();
const sessions = new Map();
let sdkPromise;
async function loadSdk() {
    if (!sdkPromise) {
        sdkPromise = Promise.all([
            import('@modelcontextprotocol/sdk/server/index.js'),
            import('@modelcontextprotocol/sdk/server/sse.js'),
            import('@modelcontextprotocol/sdk/types.js')
        ]).then(([serverMod, sseMod, typesMod]) => ({
            Server: serverMod.Server,
            SSEServerTransport: sseMod.SSEServerTransport,
            ListToolsRequestSchema: typesMod.ListToolsRequestSchema,
            CallToolRequestSchema: typesMod.CallToolRequestSchema
        }));
    }
    return sdkPromise;
}
function maskKeyForLog(raw) {
    const token = String(raw || '').trim();
    if (!token)
        return 'none';
    if (token.length <= 8)
        return `${token.slice(0, 2)}***`;
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
async function buildSessionServer(getApiKey) {
    const { Server, ListToolsRequestSchema, CallToolRequestSchema } = await loadSdk();
    const mcpServer = new Server({
        name: 'obaol-mcp-server',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {}
        }
    });
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOL_DEFINITIONS
    }));
    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const toolName = request?.params?.name;
        const toolArgs = request?.params?.arguments || {};
        const data = await executeTool(toolName, toolArgs, getApiKey());
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data)
                }
            ]
        };
    });
    return mcpServer;
}
function jsonRpcError(res, id, code, message, status = 400) {
    return res.status(status).json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
            code,
            message
        }
    });
}
router.get('/health', (_req, res) => {
    return res.json({
        success: true,
        status: 'ok',
        transport: 'sse+post',
        endpoint: '/mcp'
    });
});
router.get('/info', (_req, res) => {
    return res.json({
        success: true,
        name: 'obaol-mcp-server',
        version: '1.0.0',
        auth: {
            mode: 'NO_AUTH_CONNECT__API_KEY_ON_MESSAGES',
            connect: {
                required: false
            },
            messages: {
                required: true,
                header: 'Authorization',
                query: 'apiKey or connectorToken',
                format: 'Bearer <API_KEY|CONNECTOR_TOKEN> or ?apiKey=<API_KEY> or ?connectorToken=<MCP_CONNECTOR_TOKEN>'
            }
        },
        transport: {
            connect: 'GET /mcp or GET /mcp?apiKey=<API_KEY> or GET /mcp?connectorToken=<MCP_CONNECTOR_TOKEN>',
            messages: 'POST /mcp?sessionId=<id>&apiKey=<API_KEY> or POST /mcp?sessionId=<id>&connectorToken=<MCP_CONNECTOR_TOKEN>'
        },
        tools: TOOL_DEFINITIONS.map((tool) => ({
            name: tool.name,
            description: tool.description
        }))
    });
});
/**
 * GET /mcp
 * Opens the MCP SSE transport stream for a new session.
 */
router.get('/', async (req, res) => {
    try {
        const rawApiKey = req.query?.apiKey || req.query?.token;
        const rawConnectorToken = req.query?.connectorToken;
        let endpointWithAuth = '/mcp';
        if (rawApiKey) {
            endpointWithAuth = `/mcp?apiKey=${encodeURIComponent(String(rawApiKey))}`;
        }
        else if (rawConnectorToken) {
            endpointWithAuth = `/mcp?connectorToken=${encodeURIComponent(String(rawConnectorToken))}`;
        }
        const { SSEServerTransport } = await loadSdk();
        const transport = new SSEServerTransport(endpointWithAuth, res);
        const session = {
            server: null,
            transport,
            apiKeyId: null,
            apiKey: null
        };
        const server = await buildSessionServer(() => session.apiKey);
        session.server = server;
        sessions.set(transport.sessionId, session);
        const origin = req.headers.origin || 'n/a';
        const userAgent = String(req.headers['user-agent'] || '').slice(0, 120);
        console.log(`[MCP] SSE session created: sessionId=${transport.sessionId} hasApiKeyOnGet=${Boolean(rawApiKey)} hasConnectorOnGet=${Boolean(rawConnectorToken)} key=${maskKeyForLog(rawApiKey || rawConnectorToken)} origin=${origin} ua="${userAgent}"`);
        req.on('close', () => {
            sessions.delete(transport.sessionId);
        });
        res.on('close', () => {
            sessions.delete(transport.sessionId);
        });
        await server.connect(transport);
    }
    catch (error) {
        const message = error?.message || 'Failed to initialize MCP SSE transport.';
        console.error('[MCP] SSE setup error:', message);
        if (res.headersSent) {
            // Headers already flushed as SSE stream — cannot send JSON.
            // Write an SSE error event and close the stream instead.
            try {
                res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
                res.end();
            }
            catch (_) { /* ignore */ }
        }
        else {
            res.status(500).json({ success: false, message });
        }
    }
});
/**
 * POST /mcp
 * Receives MCP JSON-RPC messages for an existing SSE session.
 */
router.post('/', apiKeyAuth, async (req, res) => {
    try {
        const requestId = req.body?.id ?? null;
        const sessionId = String(req.query.sessionId || '');
        if (!sessionId) {
            return jsonRpcError(res, requestId, -32602, 'Missing sessionId query parameter.', 400);
        }
        const session = sessions.get(sessionId);
        if (!session) {
            return jsonRpcError(res, requestId, -32001, 'MCP session not found or expired.', 404);
        }
        if (!req.apiKey) {
            return jsonRpcError(res, requestId, -32003, 'Missing API key for MCP message.', 401);
        }
        if (!session.apiKeyId) {
            session.apiKeyId = req.apiKey.id;
            session.apiKey = req.apiKey;
            const keyPrefix = String(req.apiKey?.key_prefix || '').trim();
            console.log(`[MCP] Session key bound: sessionId=${sessionId} key=${keyPrefix || String(req.apiKey.id || '').slice(0, 8)}`);
        }
        else if (req.apiKey.id !== session.apiKeyId) {
            console.warn(`[MCP] Session/API key mismatch: sessionId=${sessionId} expected=${String(session.apiKeyId).slice(0, 8)} got=${String(req.apiKey.id || '').slice(0, 8)}`);
            return jsonRpcError(res, requestId, -32003, 'Session/API key mismatch.', 403);
        }
        await session.transport.handlePostMessage(req, res);
        return null;
    }
    catch (error) {
        const requestId = req.body?.id ?? null;
        const message = error?.message || 'Failed to process MCP message.';
        return jsonRpcError(res, requestId, -32603, message, 500);
    }
});
module.exports = router;
// Eagerly pre-load the SDK and type schemas to minimize first-request latency.
loadSdk().catch((err) => {
    console.error('Failed to pre-load MCP SDK:', err);
});
