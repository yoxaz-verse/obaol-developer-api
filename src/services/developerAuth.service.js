/**
 * @file Developer OAuth service helpers.
 */

const jwt = require('jsonwebtoken');
const Developer = require('../models/Developer');

/**
 * Upserts a developer using Google profile payload.
 * @param {{googleId:string,email:string,name:string}} payload
 * @returns {Promise<any>}
 */
async function findOrCreateDeveloper(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const googleId = String(payload.googleId || '').trim();
  const name = String(payload.name || email.split('@')[0] || 'Developer').trim();

  if (!email || !googleId) {
    const err = new Error('Google profile is missing required fields.');
    err.statusCode = 401;
    throw err;
  }

  const developer = await Developer.findOneAndUpdate(
    {
      $or: [{ googleId }, { email }]
    },
    {
      $set: {
        email,
        name,
        googleId,
        googleSub: googleId,
        role: 'developer',
        isActive: true,
        lastLoginAt: new Date()
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return developer;
}

/**
 * Issues JWT token for developer login.
 * @param {any} developer
 * @returns {string}
 */
function issueDeveloperJwt(developer) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET is missing.');
    err.statusCode = 500;
    throw err;
  }

  return jwt.sign(
    {
      sub: String(developer._id),
      role: 'developer',
      email: developer.email,
      name: developer.name
    },
    secret,
    {
      expiresIn: '12h',
      issuer: 'obaol-api',
      audience: 'obaol-developer-mode'
    }
  );
}

module.exports = {
  findOrCreateDeveloper,
  issueDeveloperJwt
};
