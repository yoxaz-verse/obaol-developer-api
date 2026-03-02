"use strict";
/**
 * @file Developer JWT auth middleware.
 */
const jwt = require('jsonwebtoken');
const Developer = require('../models/Developer');
/**
 * Middleware for developer-auth protected routes.
 */
async function devAuth(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header.' });
        }
        const token = auth.slice(7).trim();
        if (!token) {
            return res.status(401).json({ success: false, message: 'Developer token is required.' });
        }
        const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, message: 'JWT secret is not configured.' });
        }
        const decoded = jwt.verify(token, secret);
        const developerId = String(decoded?.sub || '');
        if (!developerId) {
            return res.status(401).json({ success: false, message: 'Invalid developer token.' });
        }
        const developer = await Developer.findById(developerId).lean();
        if (!developer || !developer.isActive) {
            return res.status(401).json({ success: false, message: 'Developer account is inactive.' });
        }
        req.developer = {
            id: String(developer._id),
            email: developer.email,
            name: developer.name,
            isActive: developer.isActive
        };
        return next();
    }
    catch (_error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired developer token.' });
    }
}
module.exports = {
    devAuth
};
