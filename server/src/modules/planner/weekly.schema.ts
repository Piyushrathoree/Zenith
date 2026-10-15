import { z } from 'zod';

const goalSchema = z.object({
    id: z.string().min(1).max(64),
    title: z.string().trim().min(1).max(200),
    progress: z.number().int().min(0).max(100),
    target: z.number().int().min(1).max(100),
});

export const UpdateWeeklyPlanSchema = z.object({
    goals: z.array(goalSchema).max(20).optional(),
    priorities: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
    reviewNotes: z.string().max(5000).optional(),
    reflection: z.object({
        wentWell: z.string().max(3000),
        didnt: z.string().max(3000),
        change: z.string().max(3000),
    }).optional(),
    planningCompleted: z.boolean().optional(),
    reviewCompleted: z.boolean().optional(),
});
