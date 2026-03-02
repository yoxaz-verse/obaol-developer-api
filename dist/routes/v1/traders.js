"use strict";
/**
 * @file Trader routes.
 */
const express = require('express');
const { getTraders } = require('../../services/trader.service');
const { requirePermission } = require('../../middleware/apiKeyAuth');
const router = express.Router();
/**
 * GET /v1/traders?verified=true
 */
router.get('/', requirePermission('traders:read'), async (req, res, next) => {
    try {
        const data = await getTraders({ verified: req.query.verified });
        return res.json({ success: true, data });
    }
    catch (error) {
        return next(error);
    }
});
module.exports = router;
