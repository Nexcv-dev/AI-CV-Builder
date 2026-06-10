import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as dotenv from 'dotenv';
import User from './User';
import { roleForEmail, syncUserRoleFromAllowlist } from './userRole';

dotenv.config();

export const GOOGLE_EMAIL_CONFLICT_MESSAGE = 'A NexCV account already exists for this email. Sign in with email first.';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export const resolveGoogleOAuthUser = async (profile: any) => {
  const email = profile.emails?.[0]?.value?.trim().toLowerCase();
  if (!email) {
    throw new Error('Google account did not provide an email address.');
  }

  let user = await User.findOne({ googleId: profile.id });
  const latestProfileImage = profile.photos?.[0].value;

  if (user) {
    if (latestProfileImage && user.profileImage !== latestProfileImage) {
      user.profileImage = latestProfileImage;
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }
    await syncUserRoleFromAllowlist(user);
    return { user };
  }

  user = await User.findOne({ email });
  if (user) {
    return {
      user: null,
      info: { message: GOOGLE_EMAIL_CONFLICT_MESSAGE },
    };
  }

  user = await User.create({
    googleId: profile.id,
    displayName: profile.displayName,
    email,
    profileImage: latestProfileImage,
    role: roleForEmail(email),
    emailVerified: true,
    authProvider: 'google',
  });
  (user as any).wasNewlyCreated = true;

  return { user };
};

// Configure the Google Strategy
// Make sure to add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL}/api/auth/google/callback`
          : '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const result = await resolveGoogleOAuthUser(profile);
          if (!result.user) return done(null, false, result.info);
          done(null, result.user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
} else {
  console.warn("Google Auth variables missing in .env. Google Strategy not initialized.");
}

export default passport;
