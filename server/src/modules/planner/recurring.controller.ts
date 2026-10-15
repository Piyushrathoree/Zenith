import type { Request, Response } from 'express';
import { RecurringTask, type IRecurringTask } from './recurringTask.model.ts';
import { deleteFutureOccurrences, materializeRule, validateRule } from './recurrence.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { dateKeyToUtcMidnight, normalizeStartTime, utcMidnightToDateKey } from '../../utils/time.ts';
import { queueCalendarDelete, queueCalendarSync } from '../calendar/calendar.queue.ts';

function toDTO(rule: IRecurringTask) {
    return {
        id: String(rule._id),
        title: rule.title,
        channel: rule.channel,
        duration: rule.duration,
        startTime: rule.startTime,
        notes: rule.notes,
        rrule: rule.rrule,
        startsOn: utcMidnightToDateKey(rule.startsOn),
        endsOn: rule.endsOn ? utcMidnightToDateKey(rule.endsOn) : null,
    };
}

export const listRecurring = async (req: Request, res: Response): Promise<void> => {
    const rules = await RecurringTask.find({ userId: req.userId, active: true }).sort({ createdAt: 1 });
    res.status(200).json(new ApiResponse(200, rules.map(toDTO), 'Repeating tasks fetched successfully'));
};

export const createRecurring = async (req: Request, res: Response): Promise<void> => {
    const { title, channel, duration, startTime, notes, rrule, startsOn, endsOn } = req.body;

    const ruleError = validateRule(rrule);
    if (ruleError) {
        res.status(400).json(new ApiError(400, ruleError));
        return;
    }

    const normalizedStart = normalizeStartTime(startTime);
    if (normalizedStart === null) {
        res.status(400).json(new ApiError(400, 'startTime must look like "HH:mm"'));
        return;
    }

    if (endsOn && endsOn < startsOn) {
        res.status(400).json(new ApiError(400, 'endsOn must be on or after startsOn'));
        return;
    }

    const rule = await RecurringTask.create({
        userId: req.userId,
        title,
        channel,
        duration,
        startTime: normalizedStart,
        notes,
        rrule,
        startsOn: dateKeyToUtcMidnight(startsOn),
        endsOn: endsOn ? dateKeyToUtcMidnight(endsOn) : undefined,
    });

    const createdIds = await materializeRule(rule, req.userTimezone ?? 'UTC');
    await queueCalendarSync(String(req.userId), createdIds);

    res.status(201).json(new ApiResponse(
        201,
        { rule: toDTO(rule), createdCount: createdIds.length },
        'Repeating task created'
    ));
};

/** Applies the change to the template, then rebuilds the future occurrences. Edited days are kept. */
export const updateRecurring = async (req: Request, res: Response): Promise<void> => {
    const rule = await RecurringTask.findOne({ _id: req.params.id, userId: req.userId, active: true });
    if (!rule) {
        res.status(404).json(new ApiError(404, 'Repeating task not found'));
        return;
    }

    const { title, channel, duration, startTime, notes, rrule, startsOn, endsOn } = req.body;

    if (rrule !== undefined) {
        const ruleError = validateRule(rrule);
        if (ruleError) {
            res.status(400).json(new ApiError(400, ruleError));
            return;
        }
        rule.rrule = rrule;
    }

    if (startTime !== undefined) {
        const normalizedStart = normalizeStartTime(startTime);
        if (normalizedStart === null) {
            res.status(400).json(new ApiError(400, 'startTime must look like "HH:mm"'));
            return;
        }
        rule.startTime = normalizedStart;
    }

    if (title !== undefined) rule.title = title;
    if (channel !== undefined) rule.channel = channel;
    if (duration !== undefined) rule.duration = duration;
    if (notes !== undefined) rule.notes = notes;
    if (startsOn !== undefined) rule.startsOn = dateKeyToUtcMidnight(startsOn);
    if (endsOn !== undefined) rule.endsOn = endsOn ? dateKeyToUtcMidnight(endsOn) : undefined;

    await rule.save();

    const timeZone = req.userTimezone ?? 'UTC';
    const removedEventIds = await deleteFutureOccurrences(rule, timeZone);
    const createdIds = await materializeRule(rule, timeZone);
    await queueCalendarDelete(String(req.userId), removedEventIds);
    await queueCalendarSync(String(req.userId), createdIds);

    res.status(200).json(new ApiResponse(200, toDTO(rule), 'Repeating task updated'));
};

/** Ends the series. Past and completed days stay. Future, not done days are removed. */
export const stopRecurring = async (req: Request, res: Response): Promise<void> => {
    const rule = await RecurringTask.findOne({ _id: req.params.id, userId: req.userId, active: true });
    if (!rule) {
        res.status(404).json(new ApiError(404, 'Repeating task not found'));
        return;
    }

    rule.active = false;
    await rule.save();
    const removedEventIds = await deleteFutureOccurrences(rule, req.userTimezone ?? 'UTC');
    await queueCalendarDelete(String(req.userId), removedEventIds);

    res.status(200).json(new ApiResponse(200, null, 'Stopped repeating'));
};
