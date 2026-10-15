// Global Express type augmentation — single source of truth
// replaces the 3 conflicting declare global blocks in the old services

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userPlan?: 'free' | 'pro';
            isTrialActive?: boolean;
            userTimezone?: string;
            userWeekStartsOn?: 0 | 1;
            user?: {
                _id: string;
                name: string;
                email: string;
                isVerified?: boolean;
                lastLogin?: Date;
            };
        }
    }
}

export {};
