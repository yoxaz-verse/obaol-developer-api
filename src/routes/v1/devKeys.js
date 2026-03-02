/**
 * @file Developer API key management routes.
 */

const express = require('express');
const {
  PERMISSION_PRESETS,
  createDevKey,
  listDevKeys,
  updateDevKey,
  revokeDevKey,
  getDevKeyUsage
} = require('../../services/devKeys.service');

const router = express.Router();

/**
 * GET /v1/dev-keys/presets
 */
router.get('/presets', async (_req, res) => {
  return res.json({ success: true, data: PERMISSION_PRESETS });
});

/**
 * GET /v1/dev-keys
 */
router.get('/', async (req, res, next) => {
  try {
    const data = await listDevKeys({ developerId: req.developer.id });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /v1/dev-keys
 */
router.post('/', async (req, res, next) => {
  try {
    const data = await createDevKey({
      developerId: req.developer.id,
      label: req.body?.label,
      permissions: req.body?.permissions,
      permissionPreset: req.body?.permissionPreset,
      rate_limit: req.body?.rate_limit
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /v1/dev-keys/:id
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const data = await updateDevKey({
      developerId: req.developer.id,
      keyId: req.params.id,
      label: req.body?.label,
      permissions: req.body?.permissions,
      permissionPreset: req.body?.permissionPreset,
      rate_limit: req.body?.rate_limit
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /v1/dev-keys/:id/revoke
 */
router.post('/:id/revoke', async (req, res, next) => {
  try {
    const data = await revokeDevKey({
      developerId: req.developer.id,
      keyId: req.params.id
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /v1/dev-keys/:id/usage
 */
router.get('/:id/usage', async (req, res, next) => {
  try {
    const data = await getDevKeyUsage({
      developerId: req.developer.id,
      keyId: req.params.id
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
