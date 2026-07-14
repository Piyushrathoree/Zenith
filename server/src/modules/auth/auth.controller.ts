import type { Request, Response } from 'express';
import crypto from 'crypto';
import User from './auth.model.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { generateCode } from '../../utils/helpers.ts';
import { EmailQueue } from '../notification/email.producer.ts';
import {
    RegisterUserSchema,
    LoginUserSchema,
    UpdateUserSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    ChangePasswordSchema,
} from './auth.schema.ts';

// ─── Register ──────────────────────────────────────────────────────────────────
export const RegisterUser = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        res.status(409).json(new ApiError(409, 'Email already registered'));
        return;
    }

    const verificationCode = generateCode().toString();
    // Trial ends 7 days from registration
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = new User({
        name,
        email,
        password,
        verificationCode,
        verificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        trialEndsAt,
    });
    await user.save();

    const token = user.generateAuthToken();

    // Queue verification email (async — doesn't block the response)
    await EmailQueue.add('send-verification-email', { email, code: verificationCode });

    res.status(201).json(new ApiResponse(201, { token, trialEndsAt }, 'Registration successful — check your email for verification code'));
};

// ─── Login ─────────────────────────────────────────────────────────────────────
export const LoginUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        res.status(401).json(new ApiError(401, 'Invalid email or password'));
        return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        res.status(401).json(new ApiError(401, 'Invalid email or password'));
        return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateAuthToken();
    const isTrialActive = user.trialEndsAt ? Date.now() < user.trialEndsAt.getTime() : false;

    res.status(200).json(new ApiResponse(200, {
        token,
        plan: user.plan,
        isTrialActive,
        trialEndsAt: user.trialEndsAt,
    }, 'Login successful'));
};

// ─── Update User ───────────────────────────────────────────────────────────────
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    // IDOR guard: the route is authenticated but takes the target id from the
    // URL, so without this check any logged-in user could update anyone else's
    // account. Only the account owner may update it.
    if (userId !== req.userId) {
        res.status(403).json(new ApiError(403, 'You can only update your own account'));
        return;
    }

    const { name, avatarUrl } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        { name, avatarUrl },
        { new: true, runValidators: true }
    ).select('-password -verificationCode -resetPasswordToken');

    if (!user) {
        res.status(404).json(new ApiError(404, 'User not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, user, 'User updated successfully'));
};

// ─── Delete User ───────────────────────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    // IDOR guard - see comment in updateUser above.
    if (userId !== req.userId) {
        res.status(403).json(new ApiError(403, 'You can only delete your own account'));
        return;
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
        res.status(404).json(new ApiError(404, 'User not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
};

// ─── Get User By ID ────────────────────────────────────────────────────────────
export const getUserById = async (req: Request, res: Response): Promise<void> => {
    // IDOR guard - see comment in updateUser above.
    if (req.params.userId !== req.userId) {
        res.status(403).json(new ApiError(403, 'You can only view your own account'));
        return;
    }

    const user = await User.findById(req.params.userId)
        .select('-password -verificationCode -resetPasswordToken');

    if (!user) {
        res.status(404).json(new ApiError(404, 'User not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
};

// ─── Get User By Email ─────────────────────────────────────────────────────────
// Restricted to the caller's own email. This used to accept any email in the
// query string, letting any authenticated user look up arbitrary accounts
// (IDOR). Arbitrary lookup is not a feature anything relies on, so it is
// simply removed rather than opened up behind a permission check.
export const getUserByEmail = async (req: Request, res: Response): Promise<void> => {
    const email = req.query.email as string;
    // req.user is typed via express.d.ts, but passport's own ambient types also
    // declare Request.user - cast the same way oauth.controller.ts does to read it.
    const callerEmail = (req.user as any)?.email as string | undefined;

    if (!email || email !== callerEmail) {
        res.status(403).json(new ApiError(403, 'You can only look up your own account'));
        return;
    }

    const user = await User.findOne({ email })
        .select('-password -verificationCode -resetPasswordToken');

    if (!user) {
        res.status(404).json(new ApiError(404, 'User not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
};

// ─── Forgot Password ───────────────────────────────────────────────────────────
export const ForgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    // Always return 200 to prevent email enumeration
    if (!user) {
        res.status(200).json(new ApiResponse(200, null, 'If that email exists, a reset link has been sent'));
        return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await EmailQueue.add('send-forgot-password-email', { email, resetLink });

    res.status(200).json(new ApiResponse(200, null, 'If that email exists, a reset link has been sent'));
};

// ─── Reset Password ────────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpires: { $gt: new Date() },
    });

    if (!user) {
        res.status(400).json(new ApiError(400, 'Invalid or expired reset token'));
        return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;
    await user.save();

    res.status(200).json(new ApiResponse(200, null, 'Password reset successful — please log in'));
};

// ─── Change Password ───────────────────────────────────────────────────────────
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
        res.status(404).json(new ApiError(404, 'User not found'));
        return;
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
        res.status(401).json(new ApiError(401, 'Old password is incorrect'));
        return;
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
};

// ─── Verify Email ──────────────────────────────────────────────────────────────
// RegisterUser already generates a verificationCode + expiry and queues the
// verification email; this is the endpoint that actually consumes the code.
//
// NOTE: isVerified is intentionally NOT enforced at login right now (LoginUser
// still lets unverified accounts in) - this only makes verification possible.
// To start requiring it, add a check in LoginUser (or a dedicated middleware)
// that rejects when user.isVerified is false.
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404).json(new ApiError(404, 'User not found'));
        return;
    }

    if (user.isVerified) {
        res.status(200).json(new ApiResponse(200, null, 'Email already verified'));
        return;
    }

    const isExpired = !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt.getTime() < Date.now();
    if (!user.verificationCode || user.verificationCode !== code || isExpired) {
        res.status(400).json(new ApiError(400, 'Invalid or expired verification code'));
        return;
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    // Welcome email for local signups is sent once the account is confirmed to
    // belong to the email owner. OAuth users get theirs right after account
    // creation in oauth.controller.ts, since their email is pre-verified by
    // the provider and there is no code to submit.
    await EmailQueue.add('send-welcome-email', { email: user.email });

    res.status(200).json(new ApiResponse(200, null, 'Email verified successfully'));
};

// ─── Resend Verification ───────────────────────────────────────────────────────
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    // Always return 200 to prevent email enumeration (same pattern as ForgotPassword)
    if (!user || user.isVerified) {
        res.status(200).json(new ApiResponse(200, null, 'If that account exists and is unverified, a new code has been sent'));
        return;
    }

    const verificationCode = generateCode().toString();
    user.verificationCode = verificationCode;
    user.verificationTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await EmailQueue.add('send-verification-email', { email, code: verificationCode });

    res.status(200).json(new ApiResponse(200, null, 'If that account exists and is unverified, a new code has been sent'));
};
