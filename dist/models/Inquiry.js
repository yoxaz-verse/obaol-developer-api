"use strict";
/**
 * @file Inquiry model.
 */
const mongoose = require('mongoose');
const InquirySchema = new mongoose.Schema({
    email: { type: String, required: true, trim: true, index: true },
    commodity: { type: String, required: true, trim: true, index: true },
    reqFields: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
module.exports = mongoose.model('Inquiry', InquirySchema);
