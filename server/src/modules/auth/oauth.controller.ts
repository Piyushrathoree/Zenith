import type { Request, Response } from 'express';
import { env } from '../../config/env.ts';
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
 * logout - ends the Passport session and redirects to login page.
 */
export const logout = (req: Request, res: Response): void => {
    req.logout((err) => {
        if (err) {
            res.status(500).json({ message: 'Logout error' });
            return;
        }
        res.redirect(`${env.FRONTEND_URL}/login`);
    });
};
