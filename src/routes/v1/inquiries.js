/**
 * @file Inquiry routes.
 */

const express = require('express');
const { createInquiry } = require('../../services/inquiry.service');
const { requirePermission } = require('../../middleware/apiKeyAuth');

const router = express.Router();

/**
 * POST /v1/inquiries
 */
router.post('/', requirePermission('inquiries:create'), async (req, res, next) => {
  try {
    const data = await createInquiry(req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
