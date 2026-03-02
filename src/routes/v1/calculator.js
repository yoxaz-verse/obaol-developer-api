/**
 * @file Calculator routes.
 */

const express = require('express');
const { calculateCif } = require('../../services/calculator.service');
const { requirePermission } = require('../../middleware/apiKeyAuth');

const router = express.Router();

/**
 * POST /v1/calculate/cif
 */
router.post('/cif', requirePermission('calculator:use'), async (req, res, next) => {
  try {
    const data = calculateCif(req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
