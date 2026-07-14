import { Document, Schema, model, Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.ts';

// ─── User (email/password + OAuth, unified) ────────────────────────────────────
// Google and GitHub sign-in used to create separate AuthUser documents. That is
// why OAuth JWTs never resolved in authMiddleware (it only ever looked at this
// User collection) and why OAuth users never got a plan/trial. OAuth accounts
// now live here too - see config/passport.ts for the find-or-link-or-create flow.

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string; // absent for OAuth-only accounts
    avatarUrl?: string;
    verificationCode?: string;
    verificationTokenExpiresAt?: Date;
    isVerified?: boolean;
    resetPasswordToken?: string;
    resetPasswordTokenExpires?: Date;
    lastLogin?: Date;

    // OAuth
    authProviders: string[]; // e.g. ['local'], ['google'], or ['local', 'github'] once linked
    googleId?: string;
    githubId?: string;

    // Subscription
    plan: 'free' | 'pro';
    trialEndsAt?: Date; // set to now + 7 days on registration (local and OAuth)

    // Methods
    generateAuthToken: () => string;
    comparePassword: (password: string) => Promise<boolean>;
    isTrialActive: boolean; // virtual
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // not required - OAuth-only accounts have no password
    avatarUrl: { type: String },

    verificationCode: { type: String },
    verificationTokenExpiresAt: { type: Date },
    isVerified: { type: Boolean, default: false },

    resetPasswordToken: { type: String },
    resetPasswordTokenExpires: { type: Date },
    lastLogin: { type: Date, default: Date.now },

    // ─── OAuth ────────────────────────────────────────────────────────────────
    authProviders: { type: [String], default: ['local'] },
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },

    // ─── Subscription ─────────────────────────────────────────────────────────
    // All new users start on 'free' but get a 7-day trial (trialEndsAt).
    // During trial, feature gates treat them as 'pro'.
    // When updating a user's plan after payment, set plan: 'pro'.
    plan: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free',
    },
    trialEndsAt: {
        type: Date,
        // Set by RegisterUser controller (and the OAuth strategies): Date.now() + 7 days
    },
});

// ─── Pre-save hook: hash password if it changed ────────────────────────────────
// Guarded for OAuth-only accounts, which never set a password at all.
userSchema.pre('save', async function (next) {
    if (!this.password || !this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// ─── Method: generate JWT ─────────────────────────────────────────────────────
// Token only includes id - plan is always fetched fresh from the DB in authMiddleware.
// Used by both local login and the OAuth callbacks, so every JWT is produced the
// same way and resolves the same way in authMiddleware.
userSchema.methods.generateAuthToken = function (): string {
    return jwt.sign({ id: this._id }, env.JWT_SECRET, { expiresIn: '10d' });
};

// ─── Method: compare password ─────────────────────────────────────────────────
// OAuth-only accounts have no password, so they can never match a local login attempt.
userSchema.methods.comparePassword = function (password: string): Promise<boolean> {
    if (!this.password) return Promise.resolve(false);
    return bcrypt.compare(password, this.password);
};

// ─── Virtual: isTrialActive ───────────────────────────────────────────────────
userSchema.virtual('isTrialActive').get(function () {
    return this.trialEndsAt ? Date.now() < this.trialEndsAt.getTime() : false;
});

const User = model<IUser>('User', userSchema);
export default User;
