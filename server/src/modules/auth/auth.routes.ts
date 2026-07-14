import { Router } from 'express';
import passport from 'passport';
import authMiddleware from '../../middleware/auth.middleware.ts';
import validate from '../../middleware/validate.middleware.ts';
import { authLimiter } from '../../middleware/rateLimit.middleware.ts';
import {
    RegisterUser, LoginUser, updateUser, deleteUser,
    getUserById, getUserByEmail, ForgotPassword, resetPassword, changePassword,
    verifyEmail, resendVerification,
} from './auth.controller.ts';
import { googleCallback, githubCallback, logout } from './oauth.controller.ts';
import {
    RegisterUserSchema, LoginUserSchema, UpdateUserSchema,
    ForgotPasswordSchema, ResetPasswordSchema, ChangePasswordSchema,
    VerifyEmailSchema, ResendVerificationSchema,
} from './auth.schema.ts';

const router = Router();

// ─── Public routes (rate-limited by IP to prevent brute-force) ────────────────
router.post('/register', authLimiter, validate(RegisterUserSchema), RegisterUser);
router.post('/login', authLimiter, validate(LoginUserSchema), LoginUser);
router.post('/forgot-password', authLimiter, validate(ForgotPasswordSchema), ForgotPassword);
router.post('/reset-password', validate(ResetPasswordSchema), resetPassword);
router.post('/verify-email', authLimiter, validate(VerifyEmailSchema), verifyEmail);
router.post('/resend-verification', authLimiter, validate(ResendVerificationSchema), resendVerification);

// ─── Protected routes ─────────────────────────────────────────────────────────
// update/delete/me still take :userId in the URL for backward compatibility with
// existing frontend calls, but the controllers now verify req.userId matches the
// param and return 403 otherwise (fixes an IDOR - see auth.controller.ts).
router.put('/update/:userId', authMiddleware, validate(UpdateUserSchema), updateUser);
router.delete('/delete/:userId', authMiddleware, deleteUser);
router.get('/me/:userId', authMiddleware, getUserById);
router.get('/user', authMiddleware, getUserByEmail); // restricted to the caller's own email, see controller
router.post('/change-password', authMiddleware, validate(ChangePasswordSchema), changePassword);
router.post('/logout', authMiddleware, logout);

// ─── OAuth: Google ────────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/api/v1/auth/login' }),
    googleCallback
);

// ─── OAuth: GitHub ────────────────────────────────────────────────────────────
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/api/v1/auth/login' }),
    githubCallback
);

export default router;
