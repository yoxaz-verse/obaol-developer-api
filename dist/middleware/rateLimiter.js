"use strict";
/**
 * @file Rate limiter middleware.
 */
const rateLimit = require('express-rate-limit');
/**
 * Global baseline limiter.
 */
const baselineLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' }
});
/**
 * Dynamic per-key limiter.
 */
const apiKeyRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: (req) => Number(req.apiKey?.rate_limit || 60),
    keyGenerator: (req) => String(req.apiKey?.id || req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'API key rate limit exceeded.' }
});
module.exports = {
    baselineLimiter,
    apiKeyRateLimiter
};
