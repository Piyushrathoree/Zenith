import type { Request, Response } from 'express';
import { z } from 'zod';
import { HiddenItem } from './hiddenItem.model.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';

// Hide or snooze integration items (Phase 13).

export const HideItemSchema = z.object({
    provider: z.enum(['github', 'gmail', 'notion']),
    externalId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    until: z.string().datetime().optional(),
});

/** POST /integrations/hidden: hide for good, or snooze until a time. */
export const hideItem = async (req: Request, res: Response): Promise<void> => {
    const { provider, externalId, until } = req.body;
    await HiddenItem.findOneAndUpdate(
        { userId: req.userId, provider, externalId },
        until ? { $set: { until: new Date(until) } } : { $unset: { until: '' } },
        { upsert: true }
    );
    res.status(200).json(new ApiResponse(200, { provider, externalId, until: until ?? null }, 'Item hidden'));
};

/** DELETE /integrations/hidden/:provider/:externalId: show it again. */
export const unhideItem = async (req: Request, res: Response): Promise<void> => {
    const { provider, externalId } = req.params;
    const deleted = await HiddenItem.findOneAndDelete({ userId: req.userId, provider, externalId });
    if (!deleted) {
        res.status(404).json(new ApiError(404, 'That item is not hidden'));
        return;
    }
    res.status(200).json(new ApiResponse(200, null, 'Item shown again'));
};
