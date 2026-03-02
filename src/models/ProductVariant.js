/**
 * @file ProductVariant model mapped to existing OBAOL collection.
 */

const mongoose = require('mongoose');

const ProductVariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, default: true },
    isLive: { type: Boolean, default: false },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: 'productvariants',
    timestamps: false,
    strict: false
  }
);

module.exports = mongoose.model('ProductVariant', ProductVariantSchema);
