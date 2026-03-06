"use strict";
/**
 * @file Express app composition.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const v1Routes = require('./routes/v1');
const developerAuthRoutes = require('./routes/developerAuth.routes');
const mcpServer = require('./mcp/server');
const { baselineLimiter } = require('./middleware/rateLimiter');
const { configurePassport } = require('./config/passport');
const app = express();
configurePassport();
const ENV_ALLOWED_ORIGINS = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const ALLOWED_ORIGINS = new Set([
    'https://chat.openai.com',
    'https://chatgpt.com',
    'https://obaol.com',
    'https://www.obaol.com',
    'https://developers.obaol.com',
    'http://localhost:3000',
    ...ENV_ALLOWED_ORIGINS
]);
app.use((req, res, next) => {
    res.setHeader('X-Accel-Buffering', 'no');
    next();
});
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// MCP server mounted early to bypass global rate limiting
// and before express.json so SSE POST body stream remains SDK-compatible.
app.use('/mcp', mcpServer);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(baselineLimiter);
// Stateless auth - no sessions for API persistence
app.use(passport.initialize());
/**
 * Health endpoint.
 */
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'obaol-developer-api',
        version: '1.0',
        mcp: '/mcp'
    });
});
app.get('/api/info', (_req, res) => {
    res.json({
        name: 'OBAOL Developer API',
        version: '1.0',
        description: 'API for accessing OBAOL commodity data, traders, and trade automation tools',
        mcp: 'https://api.obaol.com/mcp'
    });
});
app.get('/docs', (_req, res) => {
    res.json({
        name: 'OBAOL Developer API',
        version: '1.0',
        baseUrl: 'https://api.obaol.com',
        openapi: 'https://api.obaol.com/openapi.yaml',
        mcp: 'https://api.obaol.com/mcp',
        authentication: {
            type: 'mixed',
            connect: 'No Auth (GET /mcp)',
            messages: 'API key required on POST /mcp',
            header: 'Authorization',
            query: 'apiKey or connectorToken',
            format: 'Bearer <API_KEY|CONNECTOR_TOKEN> or ?apiKey=<API_KEY> or ?connectorToken=<MCP_CONNECTOR_TOKEN>',
            recommendedForChatGPT: 'Use connectorToken URL in No Auth connector mode.'
        },
        endpoints: [
            { method: 'GET', path: '/health', description: 'Health check endpoint' },
            { method: 'GET', path: '/mcp/health', description: 'MCP health endpoint (JSON)' },
            { method: 'GET', path: '/mcp/info', description: 'MCP metadata and tools (JSON)' },
            { method: 'GET', path: '/mcp', description: 'MCP SSE stream endpoint (No Auth connect; optionally include ?apiKey=... or ?connectorToken=...)' },
            { method: 'POST', path: '/mcp?sessionId=...&apiKey=...|connectorToken=...', description: 'MCP JSON-RPC transport endpoint (auth required)' },
            { method: 'GET', path: '/v1/dev-mcp/connectors', description: 'Developer connector tokens list (developer auth required)' },
            { method: 'POST', path: '/v1/dev-mcp/connectors', description: 'Create MCP connector token (developer auth required)' },
            { method: 'GET', path: '/v1/prices', description: 'Fetch prices by optional commodity filter' },
            { method: 'GET', path: '/v1/traders', description: 'Fetch traders by optional verified filter' },
            { method: 'POST', path: '/v1/inquiries', description: 'Create a new inquiry' },
            { method: 'POST', path: '/v1/calculate/cif', description: 'Calculate CFR/CIF values' }
        ]
    });
});
app.get('/openapi.yaml', (_req, res) => {
    const candidatePaths = [
        path.join(process.cwd(), 'src', 'openapi', 'openapi.yaml'),
        path.join(process.cwd(), 'dist', 'openapi', 'openapi.yaml'),
        path.join(__dirname, 'openapi', 'openapi.yaml'),
        path.join(__dirname, '..', 'openapi', 'openapi.yaml')
    ];
    const filePath = candidatePaths.find((p) => fs.existsSync(p));
    if (!filePath) {
        return res.status(404).json({ success: false, message: 'OpenAPI schema not found.' });
    }
    res.type('application/yaml');
    return res.sendFile(filePath);
});
app.use('/api/developer/auth', developerAuthRoutes);
app.use('/v1', v1Routes);
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});
// Centralized error handler.
app.use((err, _req, res, _next) => {
    const status = Number(err?.statusCode || 500);
    const message = err?.message || 'Internal server error.';
    res.status(status).json({ success: false, message });
});
module.exports = app;
