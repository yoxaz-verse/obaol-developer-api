"use strict";
/**
 * @file Price service.
 */
const Price = require('../models/Price');
const { sanitizeList } = require('../utils/sanitize');
const DEFAULT_PUBLIC_COMMISSION_PCT = 2;
/**
 * Reads price records and applies public commission rules.
 * @param {object} params
 * @param {string} [params.commodity]
 * @returns {Promise<Array<object>>}
 */
async function getPrices({ commodity }) {
    const query = {};
    if (commodity) {
        query.commodity = { $regex: `^${String(commodity).trim()}$`, $options: 'i' };
    }
    const rows = await Price.find(query).sort({ updatedAt: -1 }).lean();
    const sanitized = sanitizeList(rows);
    return sanitized.map((row) => {
        const value = Number(row.value || 0);
        const publicValue = Number((value * (1 + DEFAULT_PUBLIC_COMMISSION_PCT / 100)).toFixed(2));
        return {
            ...row,
            publicValue,
            commissionPct: DEFAULT_PUBLIC_COMMISSION_PCT
        };
    });
}
module.exports = {
    getPrices
};
