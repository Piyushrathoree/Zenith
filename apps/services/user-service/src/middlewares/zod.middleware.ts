import type { Request , Response, NextFunction } from "express";
import type { ZodSchema } from "zod/v3";
import { ApiError } from "../utils/ApiError";

const validate = (schema: ZodSchema) =>(req:Request , res:Response , next:NextFunction)=> {
    const result = schema.safeParse(req.body)
    if (!result.success){
        throw new ApiError(400, result.error.errors.map(err => err.message).join(', '))
    }
    req.body = result.data
    next()
};

export default validate