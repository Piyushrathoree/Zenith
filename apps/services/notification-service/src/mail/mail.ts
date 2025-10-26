import nodemailer from "nodemailer";
import {
    verificationCodeMail,
    welcomeEmail,
    resetPasswordMail,
} from "./mailTemplate";
import { ApiError } from "../../../user-service/src/utils/ApiError";

const myMail = process.env.GMAIL!;
const mailPasscode = process.env.GMAIL_PASSCODE!;
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: myMail,
        pass: mailPasscode,
    },
});

const sendVerificationCode = async (email: string, code: string) => {
    try {
        const mailOptions = {
            from: myMail,
            to: email,
            subject: "Welcome To Zenith !!",
            text: "verification code for Zenith",
            html: verificationCodeMail.replace("VERIFICATION_CODE", code),
        };
        const data = await transporter.sendMail(mailOptions);
        return data;
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "something went wrong while sending mail ");
    }
};

const sendWelcomeMail = async (email: string, code: string) => {
    try {
        const mailOptions = {
            from: myMail,
            to: email,
            subject: "Welcome back To Zenith !!",
            text: "Welcome back to Zenith !!",
            html: welcomeEmail,
        };
        const data = await transporter.sendMail(mailOptions);
        return data;
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "something went wrong while sending mail ");
    }
};

const sendForgotPasswordMail = async (email: string, resetLink: string) => {
    try {
        const mailOptions = {
            from: myMail,
            to: email,
            subject: "RESET your password",
            text: "Reset password link",
            html: resetPasswordMail.replace("RESET_LINK", resetLink),
        };
        const data = await transporter.sendMail(mailOptions);
        return data;
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "something went wrong while sending mail ");
    }
};

export { sendForgotPasswordMail, sendVerificationCode, sendWelcomeMail };
