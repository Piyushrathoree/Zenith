import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.ts';
import { env } from '../config/env.ts';
import User from '../modules/auth/auth.model.ts';

interface JwtPayload {
    id: string;
}

/**
 * Unified auth middleware.
 *
 * What it does:
 *  1. Extracts the JWT from the Authorization header
 *  2. Verifies the token
 *  3. Looks up the user in the DB to get the CURRENT plan + trialEndsAt
 *     (DB lookup ensures plan changes take effect immediately, not stale JWT)
 *  4. Sets req.userId, req.userPlan, req.isTrialActive on the request
 *
 * Replaces 3 inconsistent auth middlewares from the old services.
 */
const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json(new ApiError(401, 'Unauthorized — no token provided'));
            return;
        }

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        } catch {
            res.status(401).json(new ApiError(401, 'Unauthorized — invalid or expired token'));
            return;
        }

        // Look up user to get fresh plan data (not stale from JWT)
        const user = await User.findById(decoded.id).select('plan trialEndsAt name email isVerified');
        if (!user) {
            res.status(401).json(new ApiError(401, 'Unauthorized — user not found'));
            return;
        }

        req.userId = decoded.id;
        req.userPlan = user.plan as 'free' | 'pro';
        req.isTrialActive = user.trialEndsAt ? Date.now() < user.trialEndsAt.getTime() : false;
        req.user = {
            _id: decoded.id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
        };

        next();
    } catch (error) {
        console.error('[authMiddleware] Error:', error);
        res.status(401).json(new ApiError(401, 'Unauthorized'));
    }
};

export default authMiddleware;
