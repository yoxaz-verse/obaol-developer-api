/**
 * @file MCP server integration using @modelcontextprotocol/sdk over SSE + JSON-RPC HTTP.
 */

const express = require('express');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { TOOL_DEFINITIONS, executeTool } = require('./tools');

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

async function buildSessionServer(apiKey) {
  const { Server, ListToolsRequestSchema, CallToolRequestSchema } = await loadSdk();

  const mcpServer = new Server(
    {
      name: 'obaol-mcp-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request?.params?.name;
    const toolArgs = request?.params?.arguments || {};
    const data = await executeTool(toolName, toolArgs, apiKey);

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

/**
 * GET /mcp
 * Opens the MCP SSE transport stream for a new session.
 */
router.get('/', apiKeyAuth, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`event: ready\n`);
    res.write(
      `data: ${JSON.stringify({
        protocol: 'mcp',
        transport: 'sse',
        endpoint: '/mcp',
        tools: TOOL_DEFINITIONS.map((tool) => tool.name)
      })}\n\n`
    );
    const { SSEServerTransport } = await loadSdk();
    const transport = new SSEServerTransport('/mcp', res);
    const server = await buildSessionServer(req.apiKey);

    sessions.set(transport.sessionId, {
      server,
      transport,
      apiKeyId: req.apiKey?.id || null
    });

    req.on('close', () => {
      sessions.delete(transport.sessionId);
    });
    res.on('close', () => {
      sessions.delete(transport.sessionId);
    });

    await server.connect(transport);
  } catch (error) {
    const message = error?.message || 'Failed to initialize MCP SSE transport.';
    return res.status(500).json({ success: false, message });
  }
});

/**
 * POST /mcp
 * Receives MCP JSON-RPC messages for an existing SSE session.
 */
router.post('/', apiKeyAuth, async (req, res) => {
  try {
    const sessionId = String(req.query.sessionId || '');
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionId query parameter.'
      });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'MCP session not found or expired.'
      });
    }

    if (session.apiKeyId && req.apiKey?.id !== session.apiKeyId) {
      return res.status(403).json({
        success: false,
        message: 'API key does not match MCP session owner.'
      });
    }

    await session.transport.handlePostMessage(req, res);
    return null;
  } catch (error) {
    const message = error?.message || 'Failed to process MCP message.';
    return res.status(500).json({ success: false, message });
  }
});

module.exports = router;
