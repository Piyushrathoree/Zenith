// Global Express type augmentation — single source of truth
// replaces the 3 conflicting declare global blocks in the old services

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userPlan?: 'free' | 'pro';
            isTrialActive?: boolean;
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
