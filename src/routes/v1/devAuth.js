/**
 * @file Developer auth routes.
 */

const express = require('express');
const { loginWithGoogle } = require('../../services/devAuth.service');
const { devAuth } = require('../../middleware/devAuth');

const router = express.Router();

/**
 * POST /v1/dev-auth/google
 */
router.post('/google', async (req, res, next) => {
  try {
    const idToken = String(req.body?.idToken || '').trim();
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required.' });
    }

    const data = await loginWithGoogle(idToken);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /v1/dev-auth/me
 */
router.get('/me', devAuth, async (req, res) => {
  return res.json({ success: true, data: req.developer });
});

/**
 * POST /v1/dev-auth/logout
 */
router.post('/logout', devAuth, async (_req, res) => {
  return res.json({ success: true, data: { loggedOut: true } });
});

module.exports = router;
