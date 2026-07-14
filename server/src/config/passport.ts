import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../modules/auth/auth.model.ts';
import { env } from './env.ts';

// Trial length for brand-new OAuth users, matching RegisterUser's local signup trial.
const TRIAL_DAYS = 7;

// ─── Serialize / Deserialize ───────────────────────────────────────────────────
// Used by express-session for OAuth browser flows.
// OAuth accounts live in the single User collection (see modules/auth/auth.model.ts) -
// there is no more separate AuthUser collection to keep in sync.
passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user as any);
    } catch (err) {
        done(err);
    }
});

type OAuthProvider = 'google' | 'github';

/**
 * findOrLinkOAuthUser
 *
 * Unifies OAuth sign-in onto the single User model:
 *  1. If a User already has this provider's id, return it as-is.
 *  2. Else if a User with the same email exists (they signed up with
 *     email/password first, or with a different provider), link this
 *     provider onto that existing account rather than creating a duplicate.
 *  3. Else create a brand-new User with plan='free', a 7-day trial, and
 *     isVerified=true (OAuth emails are already verified by the provider).
 *
 * Returns the user document plus an isNewUser flag so the OAuth callback can
 * decide whether to enqueue a welcome email.
 */
async function findOrLinkOAuthUser(
    provider: OAuthProvider,
    providerId: string,
    email: string | undefined,
    name: string | undefined,
    avatarUrl: string | undefined
): Promise<{ user: InstanceType<typeof User>; isNewUser: boolean }> {
    const idField: 'googleId' | 'githubId' = provider === 'google' ? 'googleId' : 'githubId';

    const existingByProvider = await User.findOne({ [idField]: providerId });
    if (existingByProvider) {
        return { user: existingByProvider, isNewUser: false };
    }

    if (!email) {
        // Without an email we cannot safely link or create a User (email is
        // required + unique on the model). GitHub in particular can omit it
        // if the account's email is private and the primary scope is missing.
        throw new Error(`${provider} did not return an email address; cannot create or link account`);
    }

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
        existingByEmail[idField] = providerId;
        if (!existingByEmail.authProviders.includes(provider)) {
            existingByEmail.authProviders.push(provider);
        }
        await existingByEmail.save();
        return { user: existingByEmail, isNewUser: false };
    }

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const newUser = new User({
        name: name || email.split('@')[0],
        email,
        avatarUrl,
        authProviders: [provider],
        [idField]: providerId,
        isVerified: true, // OAuth emails are pre-verified by the provider
        plan: 'free',
        trialEndsAt,
    });
    await newUser.save();
    return { user: newUser, isNewUser: true };
}

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
                const { user, isNewUser } = await findOrLinkOAuthUser(
                    'google',
                    profile.id,
                    profile.emails?.[0]?.value,
                    profile.displayName,
                    profile.photos?.[0]?.value
                );
                // Transient, request-scoped flag - not persisted, just read once
                // by oauth.controller.ts to decide whether to send a welcome email.
                (user as any).isNewUser = isNewUser;
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
                const { user, isNewUser } = await findOrLinkOAuthUser(
                    'github',
                    profile.id,
                    profile.emails?.[0]?.value,
                    profile.displayName || profile.username,
                    profile.photos?.[0]?.value
                );
                (user as any).isNewUser = isNewUser;
                return done(null, user as any);
            } catch (err) {
                return done(err as Error);
            }
        }
    )
);

export default passport;
