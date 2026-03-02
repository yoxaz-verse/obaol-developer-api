"use strict";
/**
 * @file Express app composition.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const v1Routes = require('./routes/v1');
const developerAuthRoutes = require('./routes/developerAuth.routes');
const { baselineLimiter } = require('./middleware/rateLimiter');
const { configurePassport } = require('./config/passport');
const app = express();
configurePassport();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(baselineLimiter);
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());
/**
 * Health endpoint.
 */
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
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
