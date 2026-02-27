import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import type { Request, Response, NextFunction } from 'express';
import { env } from './config/env.ts';
import { ApiError } from './utils/ApiError.ts';

// ─── Route imports ─────────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes.ts';
import plannerRoutes from './modules/planner/planner.routes.ts';
import integrationRoutes from './modules/integration/integration.routes.ts';

const app = express();

// ─── Security headers ──────────────────────────────────────────────────────────
// helmet sets sensible HTTP headers (X-Content-Type-Options, CSP, HSTS, etc.)
app.use(helmet());

// ─── CORS ──────────────────────────────────────────────────────────────────────
// Allow the Next.js frontend to call the API with credentials (cookies/auth headers)
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session + Passport (for OAuth browser flows) ──────────────────────────────
app.use(session({
    secret: env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/planner', plannerRoutes);
app.use('/api/v1/integrations', integrationRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json(new ApiError(404, 'Route not found'));
});

// ─── Global error handler ──────────────────────────────────────────────────────
// Catches any ApiError thrown from controllers or middleware
// Must have 4 params — Express identifies this as an error handler via arity
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors,
        });
        return;
    }
    // Unexpected errors — don't leak details in production
    console.error('[Unhandled Error]', err);
    res.status(500).json(new ApiError(500, 'Internal server error'));
});

export default app;
