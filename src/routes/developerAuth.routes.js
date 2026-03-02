/**
 * @file Developer Google OAuth routes.
 */

const express = require('express');
const passport = require('passport');
const { issueDeveloperJwt } = require('../services/developerAuth.service');

const router = express.Router();

/**
 * Parses OAuth state payload.
 * @param {string|undefined} rawState
 * @returns {{redirectUri?:string}}
 */
function parseState(rawState) {
  if (!rawState) return {};
  try {
    const decoded = Buffer.from(String(rawState), 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (_error) {
    return {};
  }
}

/**
 * Encodes OAuth state payload.
 * @param {object} payload
 * @returns {string}
 */
function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * Basic redirect-uri allowlist guard.
 * @param {string} redirectUri
 * @returns {boolean}
 */
function isAllowedRedirectUri(redirectUri) {
  try {
    const url = new URL(redirectUri);
    const base = process.env.BASE_URL || '';
    const frontendOrigin = process.env.FRONTEND_ORIGIN || '';
    const allowed = new Set(
      [
        base,
        frontendOrigin,
        'https://obaol.com',
        'https://www.obaol.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ].filter(Boolean)
    );
    return Array.from(allowed).some((origin) => url.origin === origin);
  } catch (_error) {
    return false;
  }
}

/**
 * GET /api/developer/auth/google
 * Initiates Google OAuth login.
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: true
}));

router.get('/google/start', (req, res, next) => {
  const redirectUri = String(req.query.redirect_uri || '').trim();
  const state = encodeState({
    redirectUri: isAllowedRedirectUri(redirectUri) ? redirectUri : undefined
  });
  return passport.authenticate('google', { scope: ['profile', 'email'], session: true, state })(req, res, next);
});

/**
 * GET /api/developer/auth/google/callback
 * Handles Google OAuth callback and issues JWT.
 */
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: true }, async (err, developer) => {
    try {
      if (err) return next(err);
      if (!developer) {
        return res.status(401).json({ success: false, message: 'Google authentication failed.' });
      }

      const token = issueDeveloperJwt(developer);
      const state = parseState(String(req.query.state || ''));
      const redirectUri = String(state.redirectUri || '').trim();

      const finalizeJson = () =>
        res.json({
          success: true,
          token,
          developer: {
            email: developer.email,
            name: developer.name
          }
        });

      // Passport session is temporary for OAuth handshake only.
      req.logout(() => {
        if (req.session) {
          req.session.destroy(() => {
            res.clearCookie('connect.sid');
            if (redirectUri && isAllowedRedirectUri(redirectUri)) {
              const destination = new URL(redirectUri);
              destination.searchParams.set('token', token);
              destination.searchParams.set('email', String(developer.email || ''));
              destination.searchParams.set('name', String(developer.name || ''));
              return res.redirect(destination.toString());
            }
            return finalizeJson();
          });
          return;
        }
        if (redirectUri && isAllowedRedirectUri(redirectUri)) {
          const destination = new URL(redirectUri);
          destination.searchParams.set('token', token);
          destination.searchParams.set('email', String(developer.email || ''));
          destination.searchParams.set('name', String(developer.name || ''));
          return res.redirect(destination.toString());
        }
        return finalizeJson();
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

module.exports = router;
