"use strict";
/**
 * @file Product listing service based on variant-rate hierarchy.
 */
const mongoose = require('mongoose');
require('../models/Product');
require('../models/ProductVariant');
const VariantRate = require('../models/VariantRate');
/**
 * Builds query for product listing.
 * @param {object} params
 * @param {boolean} params.liveOnly
 * @param {string} [params.associateCompany]
 * @returns {object}
 */
function buildQuery({ liveOnly, associateCompany }) {
    const query = { isDeleted: { $ne: true } };
    if (liveOnly) {
        query.isLive = true;
    }
    if (associateCompany && mongoose.Types.ObjectId.isValid(associateCompany)) {
        query.associateCompany = associateCompany;
    }
    return query;
}
/**
 * Maps VariantRate docs into public DTO preserving hierarchy.
 * @param {Array<object>} rows
 * @returns {Array<object>}
 */
function mapRows(rows) {
    return rows.map((row) => {
        const variant = row.productVariant || null;
        const product = variant?.product || null;
        return {
            id: String(row._id),
            rate: Number(row.rate || 0),
            commission: row.commission ?? null,
            isLive: Boolean(row.isLive),
            associateCompany: row.associateCompany ? String(row.associateCompany) : null,
            createdAt: row.createdAt || null,
            updatedAt: row.updatedAt || null,
            hierarchy: {
                product: product
                    ? {
                        id: String(product._id),
                        name: product.name || null,
                        description: product.description || null
                    }
                    : null,
                productVariant: variant
                    ? {
                        id: String(variant._id),
                        name: variant.name || null,
                        description: variant.description || null,
                        isAvailable: Boolean(variant.isAvailable),
                        isLive: Boolean(variant.isLive)
                    }
                    : null
            }
        };
    });
}
/**
 * Fetches variant-rate based products.
 * @param {object} params
 * @param {boolean} params.liveOnly
 * @param {string} [params.associateCompany]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {Promise<{items:Array<object>,meta:object}>}
 */
async function getProducts(params) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
    const skip = (page - 1) * limit;
    const query = buildQuery(params);
    const [rows, total] = await Promise.all([
        VariantRate.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
            path: 'productVariant',
            select: 'name description isAvailable isLive product',
            populate: {
                path: 'product',
                select: 'name description'
            }
        })
            .lean(),
        VariantRate.countDocuments(query)
    ]);
    return {
        items: mapRows(rows),
        meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit) || 1
        }
    };
}
module.exports = {
    getProducts
};
