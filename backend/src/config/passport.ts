import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './env.js';
import { prisma } from '../lib/prisma.js';

export const googleStrategy = new GoogleStrategy(
  {
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google'));

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName || email.split('@')[0],
            password: '', // No password for OAuth users
          },
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
);
