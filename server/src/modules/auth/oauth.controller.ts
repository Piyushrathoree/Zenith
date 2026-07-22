import type { Request, Response } from 'express';
import { env } from '../../config/env.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { EmailQueue } from '../notification/email.producer.ts';

/**
 * googleCallback - called after Passport verifies Google OAuth.
 * Passport sets req.user to the unified User document (see config/passport.ts),
 * with a transient isNewUser flag when the account was just created.
 * We reuse the User model's generateAuthToken so the JWT is produced exactly
 * the same way as local login, meaning it encodes User._id and resolves
 * correctly in auth.middleware.ts on every protected route.
 */
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
    const user = req.user as any;
    const token = user.generateAuthToken();

    if (user.isNewUser) {
        await EmailQueue.add('send-welcome-email', { email: user.email });
    }

    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
};

/**
 * githubCallback - same flow as googleCallback.
 */
export const githubCallback = async (req: Request, res: Response): Promise<void> => {
    const user = req.user as any;
    const token = user.generateAuthToken();

    if (user.isNewUser) {
        await EmailQueue.add('send-welcome-email', { email: user.email });
    }

    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
};

/**
 * logout - ends the Passport session, destroys the express-session record and
 * clears its cookie.
 *
 * Two things this deliberately does NOT do:
 *   1. It does not redirect. The client calls this over fetch, so a 302 would
 *      just make it download the login page's HTML.
 *   2. It does not require an existing session (see auth.routes.ts). Logging
 *      out is idempotent, and a user whose JWT is already gone from
 *      localStorage still needs a way to drop the session cookie - gating this
 *      behind authMiddleware is exactly what left users with a live cookie and
 *      no way to clear it.
 */
export const logout = (req: Request, res: Response): void => {
    const respond = (): void => {
        // Matches express-session's default cookie name (app.ts sets no custom
        // `name`), so this clears the same cookie the session middleware set.
        res.clearCookie('connect.sid');
        res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
    };

    const destroySession = (): void => {
        // Guarded: if the session middleware never attached a session, calling
        // destroy() would be a TypeError, and optional chaining alone would
        // skip the callback and hang the request with no response.
        if (!req.session) {
            respond();
            return;
        }
        req.session.destroy(() => respond());
    };

    if (typeof req.logout === 'function') {
        // Passport's logout only clears req.user; the session itself still has
        // to be destroyed separately, which is why destroySession runs after.
        req.logout(() => destroySession());
        return;
    }

    destroySession();
};
