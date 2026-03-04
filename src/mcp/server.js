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
      required: true,
      header: 'Authorization',
      format: 'Bearer <API_KEY>'
    },
    transport: {
      connect: 'GET /mcp',
      messages: 'POST /mcp?sessionId=<id>'
    },
    tools: TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description
    }))
  });
});

router.use(apiKeyAuth);

/**
 * GET /mcp
 * Opens the MCP SSE transport stream for a new session.
 */
router.get('/', async (req, res) => {
  try {
    const apiKey = req.apiKey;

    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');
    // Ensure headers are sent immediately to open the proxy pipe.
    res.flushHeaders();

    const { SSEServerTransport } = await loadSdk();
    const transport = new SSEServerTransport('/mcp', res);
    const server = await buildSessionServer(apiKey);

    sessions.set(transport.sessionId, {
      server,
      transport,
      apiKeyId: apiKey?.id || null,
      apiKey
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
router.post('/', async (req, res) => {
  try {
    const requestId = req.body?.id ?? null;
    const sessionId = String(req.query.sessionId || '');
    if (!sessionId) {
      return jsonRpcError(
        res,
        requestId,
        -32602,
        'Missing sessionId query parameter.',
        400
      );
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return jsonRpcError(
        res,
        requestId,
        -32001,
        'MCP session not found or expired.',
        404
      );
    }

    if (!req.apiKey || req.apiKey.id !== session.apiKeyId) {
      return jsonRpcError(
        res,
        requestId,
        -32003,
        'Session/API key mismatch.',
        403
      );
    }

    await session.transport.handlePostMessage(req, res);
    return null;
  } catch (error) {
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
