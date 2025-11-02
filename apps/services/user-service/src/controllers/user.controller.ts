import type { Request, Response } from "express";
import User from "../models/user.model.ts";
import crypto from "crypto";

declare global {
    namespace Express {
        interface User {
            _id: string;
            name: string;
            email: string;
            isVerified?: boolean;
            lastLogin?: Date;
            verificationCode?: string;
            verificationCodeExpires?: Date;
            resetPasswordToken?: string;
            resetPasswordTokenExpires?: Date;
            id?: string;
        }
    }
}

import {
    LoginUserSchema,
    RegisterUserSchema,
    UpdateUserSchema,
} from "../schema/user.schema.ts";
import { ApiError } from "../utils/ApiError.ts";
import { generateCode, hashPassword } from "../utils/util.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { sendForgotPasswordMail } from "../mail/mail.ts";

import { EmailQueue } from "../messaging/producer.ts";

const RegisterUser = async (req: Request, res: Response) => {
    try {
        const result = RegisterUserSchema.safeParse(req.body);
        console.log(result);
        if (!result.success) {
            throw new ApiError(400, `${result.error}`);
        }
        const { name, email, password } = result.data;

        const existingUser = await User.findOne({ email });
        if (existingUser) throw new ApiError(400, "user already exists");

        const verificationCode = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        const newUser = new User({
            name,
            email,
            password,
            verificationCode,
            verificationTokenExpiresAt: expiresAt,
        });
        await newUser.save();
        if (!newUser) {
            throw new ApiError(400, "something went wrong while creating user");
        }
        const token = newUser.generateAuthToken();
        if (!token) {
            throw new ApiError(404, "token not created");
        }
        
        // adding the verification code to the queue to send to notification service
        await EmailQueue.add('send-verification-email', {
            email: newUser.email,
            name: newUser.name,
            verificationCode: newUser.verificationCode,
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { newUser, token },
                    "user created successfully"
                )
            );
    } catch (error) {
        console.error(error);
        throw new ApiError(500, `${error}`);
    }
};

const LoginUser = async (req: Request, res: Response) => {
    try {
        const result = LoginUserSchema.safeParse(req.body);
        if (!result.success) {
            throw new ApiError(400, `${result.error}`);
        }
        const { email, password } = result.data;
        const user = await User.findOne({ email });
        if (!user) throw new ApiError(400, "user not exist!! please signUp");

        const isPasswordCorrect = await user.comparePassword(password);
        console.log(isPasswordCorrect);

        if (!isPasswordCorrect)
            throw new ApiError(401, "wrong username or password");

        const token = user.generateAuthToken();
        if (!token) {
            return res
                .status(201)
                .json(
                    new ApiResponse(
                        201,
                        { user, token },
                        "user logged in successfully"
                    )
                );
        }
    } catch (error) {
        console.error(error);
        throw new ApiError(500, `${error}`);
    }
};

const updateUser = async (req: Request, res: Response) => {
    try {
        const result = UpdateUserSchema.safeParse(req.body);
        if (!result.success) {
            throw new ApiError(400, `${result.error}`);
        }
        const { name, avatarUrl } = result.data;
        const id = req.params?.userId;
        const updateData: Partial<{
            name: string;
            avatarUrl: string;
        }> = {};
        if (name) updateData.name = name;
        if (avatarUrl) updateData.avatarUrl = avatarUrl;

        const user = await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, { user }, "User updated successfully"));
    } catch (error) {
        console.error(error);
        throw new ApiError(500, `${error}`);
    }
};

const deleteUser = async (req: Request, res: Response) => {
    const id = req.params?.userId;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "User deleted successfully"));
};

const getUserById = async (req: Request, res: Response) => {
    const id = req.params?.userId;
    if (!id) {
        throw new ApiError(404, "user not found");
    }
    const user = await User.findById(id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "User fetched successfully"));
};

const getUserByEmail = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(404, "user not found");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "User fetched successfully"));
};

const ForgotPassword = async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send({ message: "All fields are required" });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ message: "User not found" });
        }
        const resetPasswordToken = crypto.randomBytes(20).toString("hex");
        const resetPasswordTokenExpires = Date.now() + 10 * 60 * 1000;

        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordTokenExpires = new Date(resetPasswordTokenExpires);
        await user.save();

        const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetPasswordToken}`;
        await sendForgotPasswordMail(email, resetLink);

        return res.status(200).json({
            success: true,
            message: "password reset link has been sent to your email",
            resetPasswordToken,
        });
    } catch (error) {
        throw new Error(
            error instanceof Error ? error.message : "An unknown error occurred"
        );
    }
};

const resetPassword = async (req:Request , res:Response)=>{
    const token = req.params.token
    const password = req.body.password

    if (!token || !password) {
        throw new ApiError(404 , "something is missing");
    }
    try  {
        const user = await User.findOne({
            resetPasswordToken:token,
            resetPasswordTokenExpires: { $gt: Date.now() }
        })
        if (!user) {
            return res
                .status(400)
                .json({ message: "Invalid or expired token" });
        }
        const hashedPassword = await hashPassword(password)
        user.password = hashedPassword
        user.resetPasswordToken = undefined
        user.resetPasswordTokenExpires = undefined

        await user.save()
        return new ApiResponse(200 , user, "password changed successfully" , )  
    }catch(err){
        console.error(err)
        throw new ApiError(500 , "something went wrong")
    }
}

const changePassword = async (req:Request , res:Response)=>{
    const {oldPassword , newPassword} = req.body
    if (!oldPassword || !newPassword) {
        throw new ApiError(404 , "something is missing");
    }
    try {
        const user = await User.findById(req.user?._id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            throw new ApiError(401, "Old password is incorrect");
        }
        user.password = await hashPassword(newPassword);
        await user.save();
        return new ApiResponse(200, user, "Password changed successfully");
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Something went wrong");
    }
}


export {
    RegisterUser,
    LoginUser,
    updateUser,
    deleteUser,
    getUserById,
    getUserByEmail,
    ForgotPassword,
    resetPassword,
    changePassword
};
