import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// This is global augmentaion -- basically we are letting express  know the ' req ' is having a userid
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

interface UserPayload {
    sub: string // it will be used as userID 
}

const isAuthenticated = (req: Request, next: NextFunction) => {
    const token = req.headers['authorization']?.split(" ")[1]
    if (!token) {
        throw new ApiError(401, "unauthorized")
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;

        req.userId = payload.sub

        next()
    } catch (error) {
        console.log(error)
        throw new ApiError(500, "invalid or expired token")
    }
}


export default isAuthenticated