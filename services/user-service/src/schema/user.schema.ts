import {z} from 'zod' 

const RegisterUserSchema = z.object({
    name: z.string().min(2).max(20).optional(),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
            { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" }
        ).max(20)
    
})
const LoginUserSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
            { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" }
        ).max(20)
})

const UpdateUserSchema = z.object({
    name: z.string().min(2).max(20).optional(),
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
            { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" }
        )
        .max(20)
        .optional(),
    avatarUrl:z.string().optional()
})

export {RegisterUserSchema,LoginUserSchema,UpdateUserSchema}