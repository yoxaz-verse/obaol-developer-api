"use strict";
/**
 * @file API usage tracker middleware.
 */
const crypto = require('crypto');
const ApiRequestLog = require('../models/ApiRequestLog');
const ApiKey = require('../models/ApiKey');
/**
 * Tracks API requests per key/developer after response completes.
 */
function apiUsageTracker(req, res, next) {
    const start = Date.now();
    res.on('finish', async () => {
        try {
            const apiKey = req.apiKey;
            if (!apiKey?.id || !apiKey?.developerId)
                return;
            const ip = String(req.ip || req.headers['x-forwarded-for'] || '');
            const ipHash = ip
                ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24)
                : null;
            await ApiRequestLog.create({
                developerId: apiKey.developerId,
                apiKeyId: apiKey.id,
                route: req.baseUrl ? `${req.baseUrl}${req.path}` : req.path,
                method: req.method,
                statusCode: res.statusCode,
                timestamp: new Date(),
                latencyMs: Date.now() - start,
                ipHash
            });
            await ApiKey.updateOne({ _id: apiKey.id }, { $set: { last_used_at: new Date() } });
        }
        catch (_error) {
            // no-op: usage logging must never break request flow
        }
    });
    return next();
}
module.exports = {
    apiUsageTracker
};
