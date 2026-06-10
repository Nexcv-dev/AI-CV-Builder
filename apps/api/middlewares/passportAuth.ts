import type { Express } from 'express';
import passport from 'passport';
import '../server-models/passportSetup';

export const configurePassportAuth = (app: Express) => {
    app.use(passport.initialize());
    app.use(passport.session());
};

export { passport };
