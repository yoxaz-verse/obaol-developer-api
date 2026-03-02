/**
 * @file API key authentication middleware.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const ApiKey = require('../models/ApiKey');

/**
 * Derives deterministic HMAC hash for token lookup.
 * @param {string} token
 * @returns {string}
 */
function deriveTokenHash(token) {
  const secret = process.env.API_KEY_SECRET || '';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

/**
 * Safe string compare.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeCompare(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

/**
 * API key authentication middleware.
 */
async function apiKeyAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';

    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header.' });
    }

    const rawToken = auth.slice(7).trim();
    if (!rawToken) {
      return res.status(401).json({ success: false, message: 'API key token is required.' });
    }

    const derivedHash = deriveTokenHash(rawToken);
    let apiKey = await ApiKey.findOne({ key_hash: derivedHash, is_active: true, revoked_at: null }).lean();

    // Optional backward-compatible fallback if stored hash is bcrypt style.
    if (!apiKey) {
      const candidateRows = await ApiKey.find({ is_active: true, revoked_at: null })
        .select('label name key_prefix key_hash permissions rate_limit is_active developerId')
        .lean();

      for (const row of candidateRows) {
        if (String(row.key_hash || '').startsWith('$2')) {
          const match = await bcrypt.compare(rawToken, row.key_hash);
          if (match) {
            apiKey = row;
            break;
          }
        }
      }
    }

    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Invalid API key.' });
    }

    if (!String(apiKey.key_hash || '').startsWith('$2') && !safeCompare(apiKey.key_hash, derivedHash)) {
      return res.status(401).json({ success: false, message: 'Invalid API key.' });
    }

    req.apiKey = {
      id: String(apiKey._id),
      developerId: apiKey.developerId ? String(apiKey.developerId) : null,
      name: apiKey.name || apiKey.label || 'Unnamed key',
      key_prefix: apiKey.key_prefix || null,
      permissions: Array.isArray(apiKey.permissions) ? apiKey.permissions : [],
      rate_limit: Number(apiKey.rate_limit || 60)
    };

    return next();
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'API key auth failed.' });
  }
}

/**
 * Permission middleware factory.
 * @param {string} requiredPermission
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    const permissions = req.apiKey?.permissions || [];
    if (permissions.includes('*') || permissions.includes(requiredPermission)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  };
}

module.exports = {
  apiKeyAuth,
  requirePermission,
  deriveTokenHash
};
