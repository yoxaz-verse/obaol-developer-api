/**
 * @file Trader model.
 */

const mongoose = require('mongoose');

const TraderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    verified: { type: Boolean, default: false, index: true },
    contact: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trader', TraderSchema);
