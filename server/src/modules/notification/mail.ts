import nodemailer from 'nodemailer';
import { env } from '../../config/env.ts';
import { welcomeEmail, verificationCodeMail, resetPasswordMail } from './templates.ts';
import { ApiError } from '../../utils/ApiError.ts';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
    },
});

export type EmailJobData = {
    email: string;
    code?: string;
    resetLink?: string;
};

export const sendVerificationCode = async ({ email, code }: EmailJobData): Promise<void> => {
    if (!code) throw new ApiError(400, 'Verification code is required');
    await transporter.sendMail({
        from: env.GMAIL_USER,
        to: email,
        subject: 'Verify your Zenith account',
        html: verificationCodeMail.replace('VERIFICATION_CODE', code),
    });
};

export const sendWelcomeMail = async ({ email }: EmailJobData): Promise<void> => {
    await transporter.sendMail({
        from: env.GMAIL_USER,
        to: email,
        subject: 'Welcome to Zenith!',
        html: welcomeEmail.replace('FRONTEND_URL', env.FRONTEND_URL),
    });
};

export const sendForgotPasswordMail = async ({ email, resetLink }: EmailJobData): Promise<void> => {
    if (!resetLink) throw new ApiError(400, 'Reset link is required');
    await transporter.sendMail({
        from: env.GMAIL_USER,
        to: email,
        subject: 'Reset your Zenith password',
        html: resetPasswordMail.replace('RESET_LINK', resetLink),
    });
};
