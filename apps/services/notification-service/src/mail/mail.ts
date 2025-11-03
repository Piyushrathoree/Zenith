import nodemailer from "nodemailer";
import {
    verificationCodeMail,
    welcomeEmail,
    resetPasswordMail,
} from "./mailTemplate";
import { ApiError } from "../utils/ApiError";


const myMail = process.env.GMAIL!;
const mailPasscode = process.env.GMAIL_PASSCODE!;
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: myMail,
        pass: mailPasscode,
    },
});
type JobData = {
    email: string,
    code?: string,
    resetLink?: string
}

const sendVerificationCode = async (data: JobData) => {
    try {
        const { email, code } = data;
        if (!code) {
            throw new ApiError(404, "verification code not found")
        }
        const mailOptions = {
            from: myMail,
            to: email,
            subject: "Welcome To Zenith !!",
            text: "verification code for Zenith",
            html: verificationCodeMail.replace("VERIFICATION_CODE", code),
        };
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "something went wrong while sending mail ");
    }
};

const sendWelcomeMail = async (data: JobData) => {
    try {
        const { email } = data;
        const mailOptions = {
            from: myMail,
            to: email,
            subject: "Welcome back To Zenith !!",
            text: "Welcome back to Zenith !!",
            html: welcomeEmail,
        };
        const response = await transporter.sendMail(mailOptions);
        return response;
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "something went wrong while sending mail ");
    }
};

const sendForgotPasswordMail = async (data: JobData) => {
    try {
        const { email, resetLink } = data
        if (!resetLink) {
            throw new ApiError(404, "verification code not found")
        }
        const mailOptions = {
            from: myMail,
            to: email,
            subject: "RESET your password",
            text: "Reset password link",
            html: resetPasswordMail.replace("RESET_LINK", resetLink),
        };
        const response = await transporter.sendMail(mailOptions);
        return response;
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "something went wrong while sending mail ");
    }
};

export { sendForgotPasswordMail, sendVerificationCode, sendWelcomeMail };
