import {Document, Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

interface IUser extends Document{
    name :string ,
    email :string,
    password:string ,
    avatarUrl? :string ,
    verificationCode?: string;
    verificationTokenExpiresAt?: Date;
    isVerified?: boolean;
    resetPasswordToken?: string;
    resetPasswordTokenExpires?: Date;
    lastLogin?: Date;
    generateAuthToken: () => string;
    comparePassword: (password: string) => Promise<boolean>;
}
const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required:true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required:true
    },
    avatarUrl: {
        type: String,
    },
    verificationCode: String,
    verificationTokenExpiresAt: Date,
    isVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: String,
    resetPasswordTokenExpires: Date,
    lastLogin: {
        type: Date,
        default: Date.now,
    }
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.generateAuthToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET!, {
        expiresIn: "10d",
    });
};

userSchema.methods.comparePassword = function (password: string) {
    return bcrypt.compare(password, this.password);
};
const User = model<IUser>("User", userSchema);
export default User