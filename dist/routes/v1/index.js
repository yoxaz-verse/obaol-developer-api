"use strict";
/**
 * @file v1 API routes aggregator.
 */
const express = require('express');
const pricesRouter = require('./prices');
const tradersRouter = require('./traders');
const inquiriesRouter = require('./inquiries');
const calculatorRouter = require('./calculator');
const productsRouter = require('./products');
const devAuthRouter = require('./devAuth');
const devKeysRouter = require('./devKeys');
const devUsageRouter = require('./devUsage');
const { apiKeyAuth } = require('../../middleware/apiKeyAuth');
const { devAuth } = require('../../middleware/devAuth');
const { apiKeyRateLimiter } = require('../../middleware/rateLimiter');
const { apiUsageTracker } = require('../../middleware/apiUsageTracker');
const router = express.Router();
// Developer auth and management (JWT developer token, not API key).
router.use('/dev-auth', devAuthRouter);
router.use('/dev-keys', devAuth, devKeysRouter);
router.use('/dev-usage', devAuth, devUsageRouter);
// Business APIs protected by API key.
router.use(apiKeyAuth, apiKeyRateLimiter, apiUsageTracker);
router.use('/prices', pricesRouter);
router.use('/traders', tradersRouter);
router.use('/inquiries', inquiriesRouter);
router.use('/calculate', calculatorRouter);
router.use('/products', productsRouter);
module.exports = router;
