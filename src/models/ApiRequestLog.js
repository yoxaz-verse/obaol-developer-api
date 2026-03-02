/**
 * @file API request usage log model.
 */

const mongoose = require('mongoose');

const ttlDays = Number(process.env.API_USAGE_TTL_DAYS || 30);
const ttlSeconds = Math.max(ttlDays, 1) * 24 * 60 * 60;

const ApiRequestLogSchema = new mongoose.Schema(
  {
    developerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer', required: true, index: true },
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
    route: { type: String, required: true, trim: true },
    method: { type: String, required: true, trim: true },
    statusCode: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    latencyMs: { type: Number, default: null },
    ipHash: { type: String, default: null }
  },
  { timestamps: false }
);

ApiRequestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: ttlSeconds });
ApiRequestLogSchema.index({ developerId: 1, timestamp: -1 });
ApiRequestLogSchema.index({ apiKeyId: 1, timestamp: -1 });

module.exports = mongoose.model('ApiRequestLog', ApiRequestLogSchema);
