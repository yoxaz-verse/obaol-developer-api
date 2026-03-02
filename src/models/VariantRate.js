/**
 * @file VariantRate model mapped to existing OBAOL collection.
 */

const mongoose = require('mongoose');

const VariantRateSchema = new mongoose.Schema(
  {
    rate: { type: Number, required: true },
    commission: { type: Number },
    selected: { type: Boolean, default: false },
    productVariant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    associate: { type: mongoose.Schema.Types.ObjectId, ref: 'Associate' },
    associateCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'AssociateCompany' },
    isLive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    collection: 'variantrates',
    timestamps: true,
    strict: false
  }
);

module.exports = mongoose.model('VariantRate', VariantRateSchema);
