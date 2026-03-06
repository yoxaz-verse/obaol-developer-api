/**
 * @file McpConnectorToken model.
 * Developer-issued connector tokens that map to an existing API key.
 */

const mongoose = require('mongoose');

const McpConnectorTokenSchema = new mongoose.Schema(
  {
    developerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer', required: true, index: true },
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
    label: { type: String, trim: true, default: '' },
    token_hash: { type: String, required: true, trim: true, unique: true, index: true },
    token_prefix: { type: String, required: true, trim: true },
    is_active: { type: Boolean, default: true, index: true },
    revoked_at: { type: Date, default: null },
    expires_at: { type: Date, default: null, index: true },
    last_used_at: { type: Date, default: null }
  },
  { timestamps: true }
);

McpConnectorTokenSchema.index({ developerId: 1, createdAt: -1 });
McpConnectorTokenSchema.index({ apiKeyId: 1, createdAt: -1 });

module.exports = mongoose.model('McpConnectorToken', McpConnectorTokenSchema);
