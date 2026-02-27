import { Document, Schema, model, Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.ts';

// ─── User (email/password auth) ───────────────────────────────────────────────

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    avatarUrl?: string;
    verificationCode?: string;
    verificationTokenExpiresAt?: Date;
    isVerified?: boolean;
    resetPasswordToken?: string;
    resetPasswordTokenExpires?: Date;
    lastLogin?: Date;

    // Subscription
    plan: 'free' | 'pro';
    trialEndsAt?: Date; // set to now + 7 days on registration

    // Methods
    generateAuthToken: () => string;
    comparePassword: (password: string) => Promise<boolean>;
    isTrialActive: boolean; // virtual
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarUrl: { type: String },

    verificationCode: { type: String },
    verificationTokenExpiresAt: { type: Date },
    isVerified: { type: Boolean, default: false },

    resetPasswordToken: { type: String },
    resetPasswordTokenExpires: { type: Date },
    lastLogin: { type: Date, default: Date.now },

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
        // Set by RegisterUser controller: Date.now() + 7 days
    },
});

// ─── Pre-save hook: hash password if it changed ────────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// ─── Method: generate JWT ─────────────────────────────────────────────────────
// Token only includes id — plan is always fetched fresh from the DB in authMiddleware
userSchema.methods.generateAuthToken = function (): string {
    return jwt.sign({ id: this._id }, env.JWT_SECRET, { expiresIn: '10d' });
};

// ─── Method: compare password ─────────────────────────────────────────────────
userSchema.methods.comparePassword = function (password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
};

// ─── Virtual: isTrialActive ───────────────────────────────────────────────────
userSchema.virtual('isTrialActive').get(function () {
    return this.trialEndsAt ? Date.now() < this.trialEndsAt.getTime() : false;
});

const User = model<IUser>('User', userSchema);
export default User;


// ─── AuthUser (OAuth-only users: Google & GitHub) ─────────────────────────────
// These users don't have passwords. Created by Passport strategies.

export interface IAuthUser extends Document {
    provider: 'google' | 'github';
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
}

const authUserSchema = new Schema<IAuthUser>({
    provider: { type: String, required: true },
    providerId: { type: String, required: true, unique: true },
    email: { type: String },
    name: { type: String },
    avatar: { type: String },
});

export const AuthUser = model<IAuthUser>('AuthUser', authUserSchema);
