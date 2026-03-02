"use strict";
/**
 * @file Developer usage overview routes.
 */
const express = require('express');
const { getDevUsageOverview } = require('../../services/devKeys.service');
const router = express.Router();
/**
 * GET /v1/dev-usage/overview
 */
router.get('/overview', async (req, res, next) => {
    try {
        const data = await getDevUsageOverview({ developerId: req.developer.id });
        return res.json({ success: true, data });
    }
    catch (error) {
        return next(error);
    }
});
module.exports = router;
