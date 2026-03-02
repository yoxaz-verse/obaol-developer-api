"use strict";
/**
 * @file Passport Google OAuth strategy setup.
 */
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { findOrCreateDeveloper } = require('../services/developerAuth.service');
/**
 * Configures passport Google OAuth strategy.
 */
function configurePassport() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    if (!clientID || !clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET must be configured.');
    }
    passport.use(new GoogleStrategy({
        clientID,
        clientSecret,
        callbackURL: `${baseUrl}/api/developer/auth/google/callback`
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile?.emails?.[0]?.value;
            const name = profile?.displayName || profile?.name?.givenName || 'Developer';
            const googleId = profile?.id;
            const developer = await findOrCreateDeveloper({
                email,
                name,
                googleId
            });
            return done(null, developer);
        }
        catch (error) {
            return done(error);
        }
    }));
    passport.serializeUser((user, done) => {
        done(null, String(user?._id || ''));
    });
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await require('../models/Developer').findById(id).lean();
            done(null, user || false);
        }
        catch (error) {
            done(error);
        }
    });
}
module.exports = {
    configurePassport
};
