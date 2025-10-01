import type { Request, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import jwt from 'jsonwebtoken'
import User from "../models/user.model.ts";

// declaring user for export it using middleware
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const authMiddleware =async (req:Request ,next:NextFunction ) =>{
    try {
        const token = req.headers.authorization?.split(" ")[1]
        if (!token){
            throw new ApiError(401, "unauthorized")
        }
        let decodedToken: string | jwt.JwtPayload;
        try {
            decodedToken = jwt.verify(token , process.env.JWT_SECRET!)
        }catch(err) { 
            console.error('JWT Verification Error:', err);
            throw new ApiError(401, "Invalid access token");
        }
    
        if (typeof decodedToken !== "object" || decodedToken === null || !('_id' in decodedToken)) {
            throw new ApiError(401, "Invalid access token payload");
        }
    
        const user = await User.findById((decodedToken as { _id: string })._id).select("-password")
        if (!user) {
            console.error('User not found for ID:', decodedToken?._id);
            throw new ApiError(401, "Invalid access token");
        }
        req.user  = user 
        next()
    } catch (error) {
        console.error(error)
        throw new ApiError(401 , "Unauthorized!!")
    }
}

export default authMiddleware