"use strict";
/**
 * @file Product model mapped to existing OBAOL collection.
 */
const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
    state: [{ type: mongoose.Schema.Types.ObjectId, ref: 'State' }],
    createdAt: { type: Date, default: Date.now }
}, {
    collection: 'products',
    timestamps: false,
    strict: false
});
module.exports = mongoose.model('Product', ProductSchema);
