/**
 * @file Price model.
 */

const mongoose = require('mongoose');

const PriceSchema = new mongoose.Schema(
  {
    commodity: { type: String, required: true, trim: true, index: true },
    value: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD', trim: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Price', PriceSchema);
