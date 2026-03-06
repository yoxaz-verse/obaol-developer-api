"use strict";
/**
 * @file Developer MCP connector management routes.
 */
const express = require('express');
const { listMcpConnectors, createMcpConnector, revokeMcpConnector, validateMcpConnector } = require('../../services/mcpConnectorAuth.service');
const router = express.Router();
router.get('/connectors', async (req, res, next) => {
    try {
        const data = await listMcpConnectors({ developerId: req.developer.id });
        return res.json({ success: true, data });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/connectors', async (req, res, next) => {
    try {
        const data = await createMcpConnector({
            developerId: req.developer.id,
            apiKeyId: req.body?.apiKeyId,
            label: req.body?.label,
            expiresInDays: req.body?.expiresInDays
        });
        return res.status(201).json({ success: true, data });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/connectors/:id/revoke', async (req, res, next) => {
    try {
        const data = await revokeMcpConnector({
            developerId: req.developer.id,
            connectorId: req.params.id
        });
        return res.json({ success: true, data });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/validate', async (req, res, next) => {
    try {
        const data = await validateMcpConnector({
            developerId: req.developer.id,
            connectorId: req.body?.connectorId
        });
        return res.json({ success: true, data });
    }
    catch (error) {
        return next(error);
    }
});
module.exports = router;
