"use strict";
/**
 * @file Developer model for Developer Mode identity.
 */
const mongoose = require('mongoose');
const DeveloperSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    googleId: { type: String, required: true, unique: true, trim: true, index: true },
    googleSub: { type: String, unique: true, sparse: true, trim: true, index: true },
    role: { type: String, default: 'developer', enum: ['developer'] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.model('Developer', DeveloperSchema);
