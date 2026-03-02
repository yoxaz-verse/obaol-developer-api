"use strict";
/**
 * @file Inquiry service.
 */
const Inquiry = require('../models/Inquiry');
const { sanitizeDoc } = require('../utils/sanitize');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * Validates and creates inquiry.
 * @param {object} payload
 * @param {string} payload.email
 * @param {string} payload.commodity
 * @param {object} payload.reqFields
 * @returns {Promise<object>}
 */
async function createInquiry(payload) {
    const email = String(payload?.email || '').trim().toLowerCase();
    const commodity = String(payload?.commodity || '').trim();
    const reqFields = payload?.reqFields;
    if (!email || !EMAIL_REGEX.test(email)) {
        const err = new Error('Valid email is required.');
        err.statusCode = 400;
        throw err;
    }
    if (!commodity) {
        const err = new Error('Commodity is required.');
        err.statusCode = 400;
        throw err;
    }
    if (!reqFields || typeof reqFields !== 'object' || Array.isArray(reqFields)) {
        const err = new Error('reqFields must be a valid object.');
        err.statusCode = 400;
        throw err;
    }
    const doc = await Inquiry.create({ email, commodity, reqFields });
    return sanitizeDoc(doc);
}
module.exports = {
    createInquiry
};
