import type { Request, Response } from "express";
import User from "../models/user.model.ts";
import { LoginUserSchema, RegisterUserSchema } from "../schema/user.schema.ts";
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
    
        const hashedPassword = hashPassword(password);
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
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
        return new ApiResponse(
            201,
            { newUser, token },
            "user created successfully"
        );
    } catch (error) {
        console.error(error)
        throw new ApiError(500 , `${error}`)
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
    
        const isPasswordCorrect = user.comparePassword(password)
        if (!isPasswordCorrect ) throw new ApiError(401, "wrong username or password")
    
        const token = user.generateAuthToken()
        if (!token) {
            throw new ApiError(404, "token not created");
        }
        return new ApiResponse(
            201,
            { user, token },
            "user created successfully"
        );
    } catch (error) {
        console.error(error)
        throw new ApiError(500, `${error}`)
    }
};

const updateUser = async (req:Request ,res:Response) =>{
    
}
