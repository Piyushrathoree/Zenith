import { z } from 'zod';

// ─── Shared reusable fields ────────────────────────────────────────────────────

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(20, 'Password must be at most 20 characters')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );

const emailSchema = z.string().email('Invalid email address');

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const RegisterUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(20).optional(),
    email: emailSchema,
    password: passwordSchema,
});

export const LoginUserSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export const UpdateUserSchema = z.object({
    name: z.string().min(2).max(20).optional(),
    password: passwordSchema.optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
});

export const ForgotPasswordSchema = z.object({
    email: emailSchema,
});

export const ResetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
});

export const ChangePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: passwordSchema,
});
