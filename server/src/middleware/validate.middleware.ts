import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError.ts';

/**
 * Zod request body validation middleware.
 *
 * Usage: router.post('/register', validate(RegisterUserSchema), RegisterUser)
 *
 * On failure: returns 400 with all Zod validation error messages joined.
 * On success: replaces req.body with the parsed (cleaned/coerced) data.
 */
const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const messages = result.error.issues.map((e: any) => e.message).join(', ');
        res.status(400).json(new ApiError(400, messages));
        return;
    }
    req.body = result.data;
    next();
};

export default validate;
