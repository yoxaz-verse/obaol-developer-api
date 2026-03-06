/**
 * @file MCP connector token lifecycle service.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');
const McpConnectorToken = require('../models/McpConnectorToken');
const { deriveTokenHash } = require('../middleware/apiKeyAuth');

const DEFAULT_EXPIRY_DAYS = Number(process.env.MCP_CONNECTOR_TOKEN_TTL_DAYS || 30);
const MAX_EXPIRY_DAYS = 365;
const MIN_EXPIRY_DAYS = 1;

function generateRawConnectorToken() {
  return `obaol_mcp_${crypto.randomBytes(24).toString('hex')}`;
}

function resolveExpiryDays(input) {
  const raw = input === undefined || input === null || input === '' ? DEFAULT_EXPIRY_DAYS : Number(input);
  if (!Number.isFinite(raw)) {
    const err = new Error('expiresInDays must be numeric.');
    err.statusCode = 400;
    throw err;
  }
  return Math.max(MIN_EXPIRY_DAYS, Math.min(MAX_EXPIRY_DAYS, Math.floor(raw)));
}

async function listMcpConnectors({ developerId }) {
  const rows = await McpConnectorToken.find({ developerId }).sort({ createdAt: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    label: row.label || '',
    token_prefix: row.token_prefix,
    apiKeyId: String(row.apiKeyId),
    is_active: Boolean(row.is_active),
    revoked_at: row.revoked_at || null,
    expires_at: row.expires_at || null,
    last_used_at: row.last_used_at || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

async function createMcpConnector({ developerId, apiKeyId, label, expiresInDays }) {
  if (!mongoose.Types.ObjectId.isValid(apiKeyId)) {
    const err = new Error('Invalid apiKeyId.');
    err.statusCode = 400;
    throw err;
  }

  const apiKey = await ApiKey.findOne({
    _id: apiKeyId,
    developerId,
    is_active: true,
    revoked_at: null
  }).lean();

  if (!apiKey) {
    const err = new Error('Active API key not found for this developer.');
    err.statusCode = 404;
    throw err;
  }

  const cleanLabel = String(label || '').trim();
  const days = resolveExpiryDays(expiresInDays);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const rawToken = generateRawConnectorToken();
  const tokenHash = deriveTokenHash(rawToken);

  const created = await McpConnectorToken.create({
    developerId,
    apiKeyId,
    label: cleanLabel,
    token_hash: tokenHash,
    token_prefix: rawToken.slice(0, 14),
    is_active: true,
    revoked_at: null,
    expires_at: expiresAt
  });

  const baseUrl = String(process.env.PUBLIC_API_BASE_URL || 'https://api.obaol.com').replace(/\/+$/, '');
  const mcpUrl = `${baseUrl}/mcp?connectorToken=${encodeURIComponent(rawToken)}`;

  return {
    connectorToken: rawToken,
    mcpUrl,
    connector: {
      id: String(created._id),
      label: created.label || '',
      token_prefix: created.token_prefix,
      apiKeyId: String(created.apiKeyId),
      is_active: Boolean(created.is_active),
      revoked_at: created.revoked_at || null,
      expires_at: created.expires_at || null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    }
  };
}

async function revokeMcpConnector({ developerId, connectorId }) {
  if (!mongoose.Types.ObjectId.isValid(connectorId)) {
    const err = new Error('Invalid connector id.');
    err.statusCode = 400;
    throw err;
  }

  const row = await McpConnectorToken.findOneAndUpdate(
    { _id: connectorId, developerId },
    { $set: { is_active: false, revoked_at: new Date() } },
    { new: true }
  ).lean();

  if (!row) {
    const err = new Error('Connector token not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    id: String(row._id),
    is_active: Boolean(row.is_active),
    revoked_at: row.revoked_at || null
  };
}

async function validateMcpConnector({ developerId, connectorId }) {
  if (!connectorId) {
    return { valid: false, reason: 'connectorId is required.' };
  }
  if (!mongoose.Types.ObjectId.isValid(connectorId)) {
    return { valid: false, reason: 'Invalid connector id.' };
  }
  const now = new Date();
  const row = await McpConnectorToken.findOne({ _id: connectorId, developerId }).lean();
  if (!row) return { valid: false, reason: 'Connector not found.' };
  if (!row.is_active || row.revoked_at) return { valid: false, reason: 'Connector is revoked/inactive.' };
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) {
    return { valid: false, reason: 'Connector token is expired.' };
  }
  return { valid: true };
}

module.exports = {
  listMcpConnectors,
  createMcpConnector,
  revokeMcpConnector,
  validateMcpConnector
};
