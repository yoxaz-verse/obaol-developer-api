/**
 * @file Developer API key lifecycle + usage summary service.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');
const ApiRequestLog = require('../models/ApiRequestLog');
const { deriveTokenHash } = require('../middleware/apiKeyAuth');

const PERMISSION_PRESETS = {
  read_only: ['prices:read', 'traders:read', 'products:read'],
  automation_basic: ['prices:read', 'traders:read', 'products:read', 'inquiries:create', 'calculator:use'],
  full_api: ['*']
};

const MIN_RATE_LIMIT = 10;
const MAX_RATE_LIMIT = 5000;

/**
 * Generates a new raw API key.
 * @returns {string}
 */
function generateRawApiKey() {
  return `obaol_live_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Resolves permissions from explicit list or preset.
 * @param {string[]|undefined} permissions
 * @param {string|undefined} preset
 * @returns {string[]}
 */
function resolvePermissions(permissions, preset) {
  if (Array.isArray(permissions) && permissions.length > 0) {
    return [...new Set(permissions.map((x) => String(x).trim()).filter(Boolean))];
  }

  const key = String(preset || 'automation_basic');
  const resolved = PERMISSION_PRESETS[key];
  if (!resolved) {
    const err = new Error('Invalid permission preset.');
    err.statusCode = 400;
    throw err;
  }

  if (key === 'full_api' && String(process.env.DEV_ALLOW_FULL_API || '').toLowerCase() !== 'true') {
    const err = new Error('full_api preset is restricted.');
    err.statusCode = 403;
    throw err;
  }

  return resolved;
}

/**
 * Validates and bounds rate limit.
 * @param {number|string|undefined} input
 * @returns {number}
 */
function resolveRateLimit(input) {
  const parsed = Number(input ?? 120);
  if (!Number.isFinite(parsed)) {
    const err = new Error('rate_limit must be numeric.');
    err.statusCode = 400;
    throw err;
  }
  return Math.max(MIN_RATE_LIMIT, Math.min(MAX_RATE_LIMIT, Math.floor(parsed)));
}

/**
 * Creates a developer-owned key.
 */
async function createDevKey({ developerId, label, permissions, permissionPreset, rate_limit }) {
  const cleanLabel = String(label || '').trim();
  if (!cleanLabel) {
    const err = new Error('label is required.');
    err.statusCode = 400;
    throw err;
  }

  const resolvedPermissions = resolvePermissions(permissions, permissionPreset);
  const resolvedRate = resolveRateLimit(rate_limit);

  const rawKey = generateRawApiKey();
  const key_hash = deriveTokenHash(rawKey);

  const created = await ApiKey.create({
    label: cleanLabel,
    key_hash,
    key_prefix: rawKey.slice(0, 12),
    developerId,
    permissions: resolvedPermissions,
    rate_limit: resolvedRate,
    is_active: true,
    revoked_at: null
  });

  return {
    rawApiKey: rawKey,
    key: {
      id: String(created._id),
      label: created.label,
      key_prefix: created.key_prefix,
      permissions: created.permissions,
      rate_limit: created.rate_limit,
      is_active: created.is_active,
      createdAt: created.createdAt
    }
  };
}

/**
 * Lists developer keys (masked; no raw key, no hash).
 */
async function listDevKeys({ developerId }) {
  const rows = await ApiKey.find({ developerId })
    .sort({ createdAt: -1 })
    .lean();

  return rows.map((row) => ({
    id: String(row._id),
    label: row.label,
    key_prefix: row.key_prefix,
    permissions: row.permissions || [],
    rate_limit: row.rate_limit,
    is_active: Boolean(row.is_active),
    revoked_at: row.revoked_at || null,
    last_used_at: row.last_used_at || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

/**
 * Updates key metadata.
 */
async function updateDevKey({ developerId, keyId, label, permissions, permissionPreset, rate_limit }) {
  if (!mongoose.Types.ObjectId.isValid(keyId)) {
    const err = new Error('Invalid key id.');
    err.statusCode = 400;
    throw err;
  }

  const update = {};

  if (label !== undefined) {
    const cleanLabel = String(label || '').trim();
    if (!cleanLabel) {
      const err = new Error('label cannot be empty.');
      err.statusCode = 400;
      throw err;
    }
    update.label = cleanLabel;
  }

  if (permissions !== undefined || permissionPreset !== undefined) {
    update.permissions = resolvePermissions(permissions, permissionPreset);
  }

  if (rate_limit !== undefined) {
    update.rate_limit = resolveRateLimit(rate_limit);
  }

  const row = await ApiKey.findOneAndUpdate(
    { _id: keyId, developerId },
    { $set: update },
    { new: true }
  ).lean();

  if (!row) {
    const err = new Error('API key not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    id: String(row._id),
    label: row.label,
    key_prefix: row.key_prefix,
    permissions: row.permissions || [],
    rate_limit: row.rate_limit,
    is_active: Boolean(row.is_active),
    revoked_at: row.revoked_at || null,
    last_used_at: row.last_used_at || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/**
 * Revokes a key.
 */
async function revokeDevKey({ developerId, keyId }) {
  if (!mongoose.Types.ObjectId.isValid(keyId)) {
    const err = new Error('Invalid key id.');
    err.statusCode = 400;
    throw err;
  }

  const row = await ApiKey.findOneAndUpdate(
    { _id: keyId, developerId },
    { $set: { is_active: false, revoked_at: new Date() } },
    { new: true }
  ).lean();

  if (!row) {
    const err = new Error('API key not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    id: String(row._id),
    label: row.label,
    is_active: Boolean(row.is_active),
    revoked_at: row.revoked_at || null
  };
}

/**
 * Aggregates usage for one key.
 */
async function getDevKeyUsage({ developerId, keyId }) {
  if (!mongoose.Types.ObjectId.isValid(keyId)) {
    const err = new Error('Invalid key id.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [k24, k7, k30, topRoutes] = await Promise.all([
    ApiRequestLog.countDocuments({ developerId, apiKeyId: keyId, timestamp: { $gte: dayAgo } }),
    ApiRequestLog.countDocuments({ developerId, apiKeyId: keyId, timestamp: { $gte: weekAgo } }),
    ApiRequestLog.countDocuments({ developerId, apiKeyId: keyId, timestamp: { $gte: monthAgo } }),
    ApiRequestLog.aggregate([
      { $match: { developerId: new mongoose.Types.ObjectId(developerId), apiKeyId: new mongoose.Types.ObjectId(keyId), timestamp: { $gte: monthAgo } } },
      { $group: { _id: { route: '$route', method: '$method' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  return {
    requests24h: k24,
    requests7d: k7,
    requests30d: k30,
    topRoutes: topRoutes.map((row) => ({
      route: row._id.route,
      method: row._id.method,
      count: row.count
    }))
  };
}

/**
 * Aggregates developer usage overview.
 */
async function getDevUsageOverview({ developerId }) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [r24, r7, r30, statusSplit, topRoutes, perKey] = await Promise.all([
    ApiRequestLog.countDocuments({ developerId, timestamp: { $gte: dayAgo } }),
    ApiRequestLog.countDocuments({ developerId, timestamp: { $gte: weekAgo } }),
    ApiRequestLog.countDocuments({ developerId, timestamp: { $gte: monthAgo } }),
    ApiRequestLog.aggregate([
      { $match: { developerId: new mongoose.Types.ObjectId(developerId), timestamp: { $gte: monthAgo } } },
      { $group: { _id: { ok: { $lt: ['$statusCode', 400] } }, count: { $sum: 1 } } }
    ]),
    ApiRequestLog.aggregate([
      { $match: { developerId: new mongoose.Types.ObjectId(developerId), timestamp: { $gte: monthAgo } } },
      { $group: { _id: { route: '$route', method: '$method' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    ApiRequestLog.aggregate([
      { $match: { developerId: new mongoose.Types.ObjectId(developerId), timestamp: { $gte: monthAgo } } },
      { $group: { _id: '$apiKeyId', requests30d: { $sum: 1 } } },
      {
        $lookup: {
          from: 'apikeys',
          localField: '_id',
          foreignField: '_id',
          as: 'apiKey'
        }
      },
      { $unwind: { path: '$apiKey', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, apiKeyId: '$_id', label: '$apiKey.label', key_prefix: '$apiKey.key_prefix', requests30d: 1 } },
      { $sort: { requests30d: -1 } },
      { $limit: 20 }
    ])
  ]);

  const success = statusSplit.find((x) => x._id.ok === true)?.count || 0;
  const errors = statusSplit.find((x) => x._id.ok === false)?.count || 0;

  return {
    requests24h: r24,
    requests7d: r7,
    requests30d: r30,
    successRequests30d: success,
    errorRequests30d: errors,
    topRoutes: topRoutes.map((row) => ({ route: row._id.route, method: row._id.method, count: row.count })),
    perKey: perKey.map((row) => ({
      apiKeyId: String(row.apiKeyId),
      label: row.label || 'Unknown key',
      key_prefix: row.key_prefix || null,
      requests30d: row.requests30d
    }))
  };
}

module.exports = {
  PERMISSION_PRESETS,
  createDevKey,
  listDevKeys,
  updateDevKey,
  revokeDevKey,
  getDevKeyUsage,
  getDevUsageOverview
};
