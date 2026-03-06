/**
 * @file API key authentication middleware.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const ApiKey = require('../models/ApiKey');
const McpConnectorToken = require('../models/McpConnectorToken');

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
    let rawToken = '';
    let authMode = 'apiKey';

    if (auth.startsWith('Bearer ')) {
      rawToken = auth.slice(7).trim();
    } else if (req.query.connectorToken) {
      rawToken = String(req.query.connectorToken).trim();
      authMode = 'connectorToken';
    } else if (req.query.apiKey || req.query.token) {
      rawToken = String(req.query.apiKey || req.query.token).trim();
    }

    if (!rawToken && auth.startsWith('Bearer connector ')) {
      rawToken = auth.slice('Bearer connector '.length).trim();
      authMode = 'connectorToken';
    }

    if (!rawToken) {
      return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header, apiKey, or connectorToken parameter.' });
    }

    // Connector token mode: maps to an active underlying API key.
    if (authMode === 'connectorToken') {
      const derivedConnectorHash = deriveTokenHash(rawToken);
      const now = new Date();
      const connector = await McpConnectorToken.findOne({
        token_hash: derivedConnectorHash,
        is_active: true,
        revoked_at: null,
        $or: [{ expires_at: null }, { expires_at: { $gt: now } }]
      }).lean();

      if (!connector) {
        return res.status(401).json({ success: false, message: 'Invalid or expired connector token.' });
      }

      const apiKey = await ApiKey.findOne({
        _id: connector.apiKeyId,
        is_active: true,
        revoked_at: null
      }).lean();

      if (!apiKey) {
        return res.status(401).json({ success: false, message: 'Connector token is linked to an inactive API key.' });
      }

      req.apiKey = {
        id: String(apiKey._id),
        developerId: apiKey.developerId ? String(apiKey.developerId) : null,
        name: apiKey.name || apiKey.label || 'Unnamed key',
        key_prefix: apiKey.key_prefix || null,
        permissions: Array.isArray(apiKey.permissions) ? apiKey.permissions : [],
        rate_limit: Number(apiKey.rate_limit || 60)
      };
      req.mcpConnector = {
        id: String(connector._id),
        token_prefix: connector.token_prefix || null
      };

      await McpConnectorToken.updateOne({ _id: connector._id }, { $set: { last_used_at: now } });
      return next();
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
      // Fallback: allow connector token in Authorization Bearer form.
      const now = new Date();
      const connector = await McpConnectorToken.findOne({
        token_hash: derivedHash,
        is_active: true,
        revoked_at: null,
        $or: [{ expires_at: null }, { expires_at: { $gt: now } }]
      }).lean();

      if (connector) {
        const mappedKey = await ApiKey.findOne({
          _id: connector.apiKeyId,
          is_active: true,
          revoked_at: null
        }).lean();

        if (!mappedKey) {
          return res.status(401).json({ success: false, message: 'Connector token is linked to an inactive API key.' });
        }

        req.apiKey = {
          id: String(mappedKey._id),
          developerId: mappedKey.developerId ? String(mappedKey.developerId) : null,
          name: mappedKey.name || mappedKey.label || 'Unnamed key',
          key_prefix: mappedKey.key_prefix || null,
          permissions: Array.isArray(mappedKey.permissions) ? mappedKey.permissions : [],
          rate_limit: Number(mappedKey.rate_limit || 60)
        };
        req.mcpConnector = {
          id: String(connector._id),
          token_prefix: connector.token_prefix || null
        };
        await McpConnectorToken.updateOne({ _id: connector._id }, { $set: { last_used_at: now } });
        return next();
      }

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
