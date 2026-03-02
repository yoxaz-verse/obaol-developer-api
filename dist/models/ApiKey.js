"use strict";
/**
 * @file ApiKey model.
 * Stores API key metadata with deterministic hash for lookup.
 */
const mongoose = require('mongoose');
const ApiKeySchema = new mongoose.Schema({
    name: { type: String, trim: true },
    label: { type: String, required: true, trim: true },
    key_hash: { type: String, required: true, trim: true, index: true },
    key_prefix: { type: String, required: true, trim: true },
    developerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer', required: true, index: true },
    permissions: { type: [String], default: [] },
    rate_limit: { type: Number, default: 60, min: 1, max: 5000 },
    is_active: { type: Boolean, default: true, index: true },
    last_used_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null }
}, { timestamps: true });
ApiKeySchema.index({ name: 1 }, { unique: true, sparse: true });
ApiKeySchema.index({ developerId: 1, createdAt: -1 });
ApiKeySchema.pre('validate', function preValidate(next) {
    if (!this.name && this.label) {
        this.name = `${String(this.label).trim()}-${String(this._id).slice(-6)}`;
    }
    next();
});
module.exports = mongoose.model('ApiKey', ApiKeySchema);
