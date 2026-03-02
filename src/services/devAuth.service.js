/**
 * @file Developer auth service (Google OAuth token verification + session issuance).
 */

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Developer = require('../models/Developer');

const googleClient = new OAuth2Client();

/**
 * Issues a developer JWT session token.
 * @param {object} developer
 * @returns {string}
 */
function issueDeveloperToken(developer) {
  const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET is missing.');
    err.statusCode = 500;
    throw err;
  }

  return jwt.sign(
    {
      role: 'developer',
      email: developer.email,
      name: developer.name
    },
    secret,
    {
      subject: String(developer._id),
      expiresIn: '12h',
      issuer: 'obaol-api',
      audience: 'obaol-developer-mode'
    }
  );
}

/**
 * Verifies Google ID token and returns normalized profile.
 * @param {string} idToken
 * @returns {Promise<{email:string,name:string,sub:string}>}
 */
async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const err = new Error('GOOGLE_CLIENT_ID is missing.');
    err.statusCode = 500;
    throw err;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: clientId
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload?.sub) {
    const err = new Error('Google token payload is invalid.');
    err.statusCode = 401;
    throw err;
  }

  return {
    email: String(payload.email).toLowerCase(),
    name: String(payload.name || payload.email.split('@')[0]),
    sub: String(payload.sub)
  };
}

/**
 * Upserts developer and issues dev session token.
 * @param {string} idToken
 */
async function loginWithGoogle(idToken) {
  const profile = await verifyGoogleIdToken(idToken);

  const developer = await Developer.findOneAndUpdate(
    { $or: [{ googleId: profile.sub }, { googleSub: profile.sub }, { email: profile.email }] },
    {
      $set: {
        email: profile.email,
        name: profile.name,
        googleId: profile.sub,
        googleSub: profile.sub,
        role: 'developer',
        lastLoginAt: new Date(),
        isActive: true
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  const devAccessToken = issueDeveloperToken(developer);

  return {
    developer: {
      id: String(developer._id),
      email: developer.email,
      name: developer.name,
      isActive: developer.isActive,
      lastLoginAt: developer.lastLoginAt
    },
    devAccessToken
  };
}

module.exports = {
  loginWithGoogle,
  issueDeveloperToken
};
