/**
 * @file Express app composition.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const v1Routes = require('./routes/v1');
const developerAuthRoutes = require('./routes/developerAuth.routes');
const { baselineLimiter } = require('./middleware/rateLimiter');
const { configurePassport } = require('./config/passport');

const app = express();
configurePassport();

const CHATGPT_ALLOWED_ORIGINS = [
  'https://chat.openai.com',
  'https://chatgpt.com'
];

const ENV_ALLOWED_ORIGINS = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set([...CHATGPT_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS]);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(baselineLimiter);
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

/**
 * Health endpoint.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/info', (_req, res) => {
  res.json({
    name: 'OBAOL Developer API',
    version: '1.0',
    description: 'API for accessing OBAOL commodity data, traders, and trade automation tools'
  });
});

app.get('/docs', (_req, res) => {
  res.json({
    name: 'OBAOL Developer API',
    version: '1.0',
    baseUrl: 'https://api.obaol.com',
    openapi: 'https://api.obaol.com/openapi.yaml',
    authentication: {
      type: 'apiKey',
      header: 'Authorization',
      format: 'Bearer <API_KEY>'
    },
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check endpoint' },
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
    path.join(__dirname, '..', 'src', 'openapi', 'openapi.yaml')
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
