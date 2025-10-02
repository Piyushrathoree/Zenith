import nodemailer from "nodemailer";
import {
    verificationCodeMail,
    welcomeEmail,
    resetPasswordMail,
} from "./mailTemplate";

const myMail = process.env.GMAIL!;
const mailPasscode = process.env.GMAIL_PASSCODE!;
const resetLink: string = "http://localhost:3000/user/reset-password";
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: myMail,
        pass: mailPasscode,
    },
});

const sendVerificationCode = async (email: string, code: string) => {
    const mailOptions = {
        from: myMail,
        to: email,
        subject: "Welcome To Zenith !!",
        text: "verification code for Zenith",
        html: verificationCodeMail.replace("VERIFICATION_CODE", code),
    };
};

const sendWelcomeMail = async (email: string, code: string) => {
    const mailOptions = {
        from: myMail,
        to: email,
        subject: "Welcome back To Zenith !!",
        text: "Welcome back to Zenith !!",
        html: welcomeEmail,
    };
};

const sendResetPasswordMail = async (email: string, code: string) => {
    const mailOptions = {
        from: myMail,
        to: email,
        subject: "RESET your password",
        text: "Reset password link",
        html: resetPasswordMail.replace("RESET_LINK", resetLink),
    };
};

export { sendResetPasswordMail, sendVerificationCode, sendWelcomeMail };
