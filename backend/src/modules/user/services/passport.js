import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserModel from '../../../db/models/User.model.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let user = await UserModel.findOne({ email });

        if (!user) {
          user = await UserModel.create({
            name: profile.displayName,
            email,
            password: crypto.randomUUID(), // or a dummy one since it's OAuth only
            googleTokens: {
              access_token: accessToken,
              refresh_token: refreshToken,
            }
          });
        } else {
          user.googleTokens = {
            access_token: accessToken,
            refresh_token: refreshToken ?? user.googleTokens.refresh_token, // don’t overwrite if undefined
          };
          await user.save();
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);
