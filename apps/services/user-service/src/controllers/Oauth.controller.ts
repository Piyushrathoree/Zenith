import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

passport.serializeUser((user, done) => {
    done(null, (user as any)._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await AuthUser.findById(id);
        done(null, user as any );
    } catch (err) {
        done(err);
    }
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
        },
        async (_accessToken:string, _refreshToken:string, profile:any, done:any) => {
            try {
                let user = await AuthUser.findOne({ providerId: profile.id });
                if (!user) {
                    user = await AuthUser.create({
                        provider: "google",
                        providerId: profile.id,
                        email: profile.emails?.[0]?.value,
                        name: profile.displayName,
                        avatar: profile.photos?.[0]?.value,
                    });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            callbackURL:process.env.GITHUB_CALLBACK_URL!,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
                let user = await AuthUser.findOne({ providerId: profile.id });
                if (!user) {
                    user = await AuthUser.create({
                        provider: "github",
                        providerId: profile.id,
                        email: profile.emails?.[0]?.value,
                        name: profile.displayName || profile.username,
                        avatar: profile.photos?.[0]?.value,
                    });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);


import type{ Request, Response } from "express";
import { AuthUser } from "../models/auth.model";

export const googleCallback = (req: Request, res: Response) => {
    const user = req.user as any;

    // Create a JWT token for the user
    const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
};

export const githubCallback = (req: Request, res: Response) => {
    const user = req.user as any;

    // Create a JWT token for the user
    const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '7d' }
    );
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
};

export const logout = (req: Request, res: Response) => {
    req.logout(err => {
        if (err) return res.status(500).send("Logout error.");
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`);
    });
};