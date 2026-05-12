import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as dotenv from 'dotenv';
import User from './User';

dotenv.config();

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

// Configure the Google Strategy
// Make sure to add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.trim().toLowerCase();
          if (!email) {
            return done(new Error('Google account did not provide an email address.'), undefined);
          }

          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });
          const latestProfileImage = profile.photos?.[0].value;

          if (user) {
            if (latestProfileImage && user.profileImage !== latestProfileImage) {
              user.profileImage = latestProfileImage;
              await user.save();
            }
            return done(null, user);
          }

          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            user.authProvider = 'google';
            user.profileImage = latestProfileImage || user.profileImage;
            await user.save();
            return done(null, user);
          }

          // If not, create a new user
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email,
            profileImage: latestProfileImage,
            authProvider: 'google',
          });

          done(null, user);
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
