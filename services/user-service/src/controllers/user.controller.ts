import type { Request, Response } from "express";
import User from "../models/user.model.ts";

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
import { generateVerificationCode, hashPassword } from "../utils/util.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";

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

        const verificationCode = generateVerificationCode();
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
        const id = req.user?._id;
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
    const id = req.user?._id;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "User deleted successfully"));
};


export { RegisterUser, LoginUser, updateUser, deleteUser };
