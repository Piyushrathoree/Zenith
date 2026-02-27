import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.ts';

/**
 * googleCallback — called after Passport verifies Google OAuth.
 * Passport sets req.user (the AuthUser document).
 * We sign a JWT and redirect to the frontend with it in the URL.
 */
export const googleCallback = (req: Request, res: Response): void => {
    const user = req.user as any;
    const token = jwt.sign({ id: user._id }, env.JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
};

/**
 * githubCallback — same flow as googleCallback.
 */
export const githubCallback = (req: Request, res: Response): void => {
    const user = req.user as any;
    const token = jwt.sign({ id: user._id }, env.JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
};

/**
 * logout — ends the Passport session and redirects to login page.
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
