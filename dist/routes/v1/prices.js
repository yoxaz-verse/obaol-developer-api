"use strict";
/**
 * @file Price routes.
 */
const express = require('express');
const { getPrices } = require('../../services/price.service');
const { requirePermission } = require('../../middleware/apiKeyAuth');
const router = express.Router();
/**
 * GET /v1/prices?commodity=
 */
router.get('/', requirePermission('prices:read'), async (req, res, next) => {
    try {
        const data = await getPrices({ commodity: req.query.commodity });
        return res.json({ success: true, data });
    }
    catch (error) {
        return next(error);
    }
});
module.exports = router;
