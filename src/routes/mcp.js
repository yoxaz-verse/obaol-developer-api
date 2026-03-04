/**
 * @file MCP route over SSE + JSON-RPC bridge.
 */

const express = require('express');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { TOOL_DEFINITIONS, executeTool } = require('../mcp/tools');

const router = express.Router();

function tryLoadMcpSdk() {
  try {
    // Optional: if installed, we can expose presence and future-proof hooks.
    // eslint-disable-next-line global-require
    return require('@modelcontextprotocol/server-sdk');
  } catch (_error) {
    return null;
  }
}

const mcpSdk = tryLoadMcpSdk();

function sendSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * GET /mcp
 * Opens SSE transport endpoint for MCP clients.
 */
router.get('/', apiKeyAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sendSse(res, 'ready', {
    protocol: 'mcp',
    transport: 'sse',
    endpoint: '/mcp',
    sdkLoaded: Boolean(mcpSdk),
    tools: TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  });

  const keepAlive = setInterval(() => {
    sendSse(res, 'ping', { ts: Date.now() });
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    res.end();
  });
});

/**
 * POST /mcp
 * Minimal MCP JSON-RPC bridge for tools/list and tools/call.
 */
router.post('/', apiKeyAuth, async (req, res) => {
  const body = req.body || {};
  const id = body.id ?? null;
  const method = body.method;
  const params = body.params || {};

  try {
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'obaol-mcp-bridge',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      });
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOL_DEFINITIONS
        }
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const data = await executeTool(toolName, toolArgs, req);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data)
            }
          ]
        }
      });
    }

    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${String(method || '')}`
      }
    });
  } catch (error) {
    const message = error?.message || 'MCP execution error';
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: statusCode === 403 ? -32003 : -32000,
        message
      }
    });
  }
});

module.exports = router;
