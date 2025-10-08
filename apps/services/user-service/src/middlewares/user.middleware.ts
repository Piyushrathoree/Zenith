import type { Request, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import jwt from 'jsonwebtoken'

// declaring user for export it using middleware
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const authMiddleware =async (req:Request ,next:NextFunction ) =>{
    try {
        const token = req.headers.authorization?.split(" ")[1]
        if (!token){
            throw new ApiError(401, "unauthorized")
        }
        let decoded: string | jwt.JwtPayload;
        try {
            decoded = jwt.verify(token , process.env.JWT_SECRET!)
        }catch(err) { 
            console.error('JWT Verification Error:', err);
            throw new ApiError(401, "Invalid access token");
        }
    
        if (typeof decoded === "object" && decoded !== null) {
            req.user = decoded as {
                _id: string;
                name: string;
                email: string;
                isVerified: boolean;
                lastLogin?: Date;
                verificationCode?: string;
                verificationCodeExpires?: Date;
                resetPasswordToken?: string;
                resetPasswordTokenExpires?: Date;
            };
        } else {
            throw new Error("Invalid token payload");
        }
        if (!req.user) {
            throw new ApiError(401, "unauthorized")
        }
        next()
    } catch (error) {
        console.error(error)
        throw new ApiError(401 , "Unauthorized!!")
    }
}

export default authMiddleware