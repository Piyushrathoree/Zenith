import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { AuthUser } from '../modules/auth/auth.model.ts';
import { env } from './env.ts';

// ─── Serialize / Deserialize ───────────────────────────────────────────────────
// Used by express-session for OAuth browser flows
passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await AuthUser.findById(id);
        done(null, user as any);
    } catch (err) {
        done(err);
    }
});

// ─── Google Strategy ──────────────────────────────────────────────────────────
passport.use(
    new GoogleStrategy(
        {
            clientID: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${env.API_BASE_URL}/api/v1/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                let user = await AuthUser.findOne({ providerId: profile.id });
                if (!user) {
                    user = await AuthUser.create({
                        provider: 'google',
                        providerId: profile.id,
                        email: profile.emails?.[0]?.value,
                        name: profile.displayName,
                        avatar: profile.photos?.[0]?.value,
                    });
                }
                return done(null, user as any);
            } catch (err) {
                return done(err as Error);
            }
        }
    )
);

// ─── GitHub Strategy ───────────────────────────────────────────────────────────
passport.use(
    new GitHubStrategy(
        {
            clientID: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            callbackURL: `${env.API_BASE_URL}/api/v1/auth/github/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
                let user = await AuthUser.findOne({ providerId: profile.id });
                if (!user) {
                    user = await AuthUser.create({
                        provider: 'github',
                        providerId: profile.id,
                        email: profile.emails?.[0]?.value,
                        name: profile.displayName || profile.username,
                        avatar: profile.photos?.[0]?.value,
                    });
                }
                return done(null, user as any);
            } catch (err) {
                return done(err as Error);
            }
        }
    )
);

export default passport;
