"use strict";
/**
 * @file Product routes (variant-rate hierarchy).
 */
const express = require('express');
const { requirePermission } = require('../../middleware/apiKeyAuth');
const { getProducts } = require('../../services/product.service');
const router = express.Router();
/**
 * GET /v1/products/live
 * Optional query: associateCompany, page, limit
 */
router.get('/live', requirePermission('products:read'), async (req, res, next) => {
    try {
        const data = await getProducts({
            liveOnly: true,
            associateCompany: req.query.associateCompany,
            page: req.query.page,
            limit: req.query.limit
        });
        return res.json({ success: true, data: data.items, meta: data.meta });
    }
    catch (error) {
        return next(error);
    }
});
/**
 * GET /v1/products/all
 * Optional query: associateCompany, page, limit
 */
router.get('/all', requirePermission('products:read'), async (req, res, next) => {
    try {
        const data = await getProducts({
            liveOnly: false,
            associateCompany: req.query.associateCompany,
            page: req.query.page,
            limit: req.query.limit
        });
        return res.json({ success: true, data: data.items, meta: data.meta });
    }
    catch (error) {
        return next(error);
    }
});
module.exports = router;
