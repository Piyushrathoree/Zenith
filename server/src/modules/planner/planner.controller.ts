import type { Request, Response } from 'express';
import { Task } from './task.model.ts';
import { Channel } from './channel.model.ts';
import { DailyPlanner } from './dailyPlanner.model.ts';
import { RecurringTask } from './recurringTask.model.ts';
import { runRolloverForUser } from './rollover.ts';
import { queueCalendarDelete, queueCalendarSync } from '../calendar/calendar.queue.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { dateKeyToUtcMidnight, localDateKey, normalizeStartTime } from '../../utils/time.ts';

// ════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════

const VALID_TASK_SOURCES = ['github', 'gmail', 'notion'];

function normalizeSubtasks(raw: unknown): { id: string; title: string; completed: boolean }[] | null {
    if (raw === undefined) return null;
    if (!Array.isArray(raw)) return null;
    return raw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item, index) => ({
            id: typeof item.id === 'string' && item.id ? item.id : `sub-${index}-${Date.now()}`,
            title: typeof item.title === 'string' ? item.title.trim() : '',
            completed: Boolean(item.completed),
        }))
        .filter((item) => item.title.length > 0);
}

export const createTask = async (req: Request, res: Response): Promise<void> => {
    const { taskDescription, due, status, notes, duration, startTime, source, externalId, link, subtasks, inBacklog } = req.body;
    const { channel } = req.params;

    if (!taskDescription) {
        res.status(400).json(new ApiError(400, 'taskDescription is required'));
        return;
    }

    if (source !== undefined && !VALID_TASK_SOURCES.includes(source)) {
        res.status(400).json(new ApiError(400, 'source must be one of github, gmail, or notion'));
        return;
    }

    let normalizedStartTime: string | undefined;
    if (startTime !== undefined) {
        const normalized = normalizeStartTime(String(startTime));
        if (normalized === null) {
            res.status(400).json(new ApiError(400, 'startTime must look like "HH:mm"'));
            return;
        }
        normalizedStartTime = normalized;
    }

    // One task per integration item: adding the same item again returns the task it already has.
    if (source && externalId) {
        const existing = await Task.findOne({ userId: req.userId, source, externalId });
        if (existing) {
            res.status(200).json(new ApiResponse(200, existing, 'Already planned'));
            return;
        }
    }

    // A backlog task has no day and no time, so any due or startTime sent with it is ignored.
    const goesToBacklog = inBacklog === true;
    const task = new Task({
        taskDescription,
        status: status || 'todo',
        start: new Date(),
        due: goesToBacklog ? undefined : due,
        notes,
        duration,
        startTime: goesToBacklog ? '' : normalizedStartTime,
        source,
        externalId,
        link,
        subtasks: normalizeSubtasks(subtasks) ?? [],
        userId: req.userId,
        channel: channel || 'work',
        inBacklog: goesToBacklog,
        backloggedAt: goesToBacklog ? new Date() : undefined,
        backlogReason: goesToBacklog ? 'manual' : undefined,
    });
    await task.save();
    await queueCalendarSync(String(req.userId), [String(task._id)]);

    res.status(201).json(new ApiResponse(201, task, 'Task created successfully'));
};

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
    const tasks = await Task.find({ userId: req.userId });
    res.status(200).json(new ApiResponse(200, tasks, 'Tasks fetched successfully'));
};

// Backlog: tasks with no day, newest first.
export const getBacklog = async (req: Request, res: Response): Promise<void> => {
    const tasks = await Task.find({ userId: req.userId, inBacklog: true }).sort({ backloggedAt: -1 });
    res.status(200).json(new ApiResponse(200, tasks, 'Backlog fetched successfully'));
};

export const getTasksByChannel = async (req: Request, res: Response): Promise<void> => {
    const { channel } = req.params;
    const tasks = await Task.find({ userId: req.userId, channel });
    res.status(200).json(new ApiResponse(200, tasks, 'Tasks fetched successfully'));
};

// Single-task fetch, scoped to the requesting user.
// Mounted at GET /tasks/id/:taskId (see planner.routes.ts) rather than GET /tasks/:taskId
// to avoid ambiguity with the existing GET /tasks/:channel route, since both would
// otherwise occupy the same one-segment path after /tasks.
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;

    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
        res.status(404).json(new ApiError(404, 'Task not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, task, 'Task fetched successfully'));
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;
    const { status, taskDescription, notes, due, channel, duration, startTime, source, externalId, link, subtasks, inBacklog } = req.body;

    if (source !== undefined && !VALID_TASK_SOURCES.includes(source)) {
        res.status(400).json(new ApiError(400, 'source must be one of github, gmail, or notion'));
        return;
    }

    const $set: Record<string, unknown> = {};
    if (status !== undefined) $set.status = status;
    if (taskDescription !== undefined) $set.taskDescription = taskDescription;
    if (notes !== undefined) $set.notes = notes;
    if (due !== undefined) $set.due = due;
    if (channel !== undefined) $set.channel = channel;
    if (duration !== undefined) $set.duration = duration;
    if (startTime !== undefined) {
        const normalized = normalizeStartTime(String(startTime));
        if (normalized === null) {
            res.status(400).json(new ApiError(400, 'startTime must look like "HH:mm"'));
            return;
        }
        $set.startTime = normalized;
    }
    if (source !== undefined) $set.source = source;
    if (externalId !== undefined) $set.externalId = externalId;
    if (link !== undefined) $set.link = link;
    if (subtasks !== undefined) {
        const normalized = normalizeSubtasks(subtasks);
        if (normalized === null) {
            res.status(400).json(new ApiError(400, 'subtasks must be an array'));
            return;
        }
        $set.subtasks = normalized;
    }

    // Moving into the backlog clears the day and time. Moving out needs the new day.
    const $unset: Record<string, ''> = {};
    if (inBacklog === true) {
        $set.inBacklog = true;
        $set.backloggedAt = new Date();
        $set.backlogReason = 'manual';
        $set.startTime = '';
        $unset.due = '';
        delete $set.due; // a due sent in the same request is ignored
    } else if (inBacklog === false) {
        if (due === undefined) {
            res.status(400).json(new ApiError(400, 'due is required when moving a task out of the backlog'));
            return;
        }
        $set.inBacklog = false;
        $unset.backloggedAt = '';
        $unset.backlogReason = '';
        $unset.backlogFromDue = '';
    }

    // Editing a recurring occurrence detaches it, so a later "Save for all future" leaves it alone.
    const detachingFields = ['taskDescription', 'due', 'channel', 'duration', 'startTime', 'inBacklog'];
    if (detachingFields.some((field) => req.body[field] !== undefined)) {
        const existing = await Task.findOne({ _id: taskId, userId: req.userId }).select('recurringTaskId');
        if (existing?.recurringTaskId) $set.recurrenceDetached = true;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys($set).length > 0) update.$set = $set;
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    const task = Object.keys(update).length === 0
        ? await Task.findOne({ _id: taskId, userId: req.userId })
        : await Task.findOneAndUpdate(
            { _id: taskId, userId: req.userId },
            update,
            { new: true, runValidators: true }
        );

    if (!task) {
        res.status(404).json(new ApiError(404, 'Task not found'));
        return;
    }

    await queueCalendarSync(String(req.userId), [String(task._id)]);

    res.status(200).json(new ApiResponse(200, task, 'Task updated successfully'));
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;

    const task = await Task.findOneAndDelete({ _id: taskId, userId: req.userId });
    if (!task) {
        res.status(404).json(new ApiError(404, 'Task not found'));
        return;
    }

    // The task is gone from Zenith, so its calendar event goes too.
    if (task.calendarEventId) await queueCalendarDelete(String(req.userId), [task.calendarEventId]);

    // Remember the deleted day, so the hourly job does not bring the occurrence back.
    if (task.recurringTaskId && task.occurrenceDate) {
        await RecurringTask.updateOne(
            { _id: task.recurringTaskId, userId: req.userId },
            { $addToSet: { exceptions: task.occurrenceDate } }
        );
    }

    res.status(200).json(new ApiResponse(200, null, 'Task deleted successfully'));
};

// ════════════════════════════════════════════════════════
// CHANNELS (Projects)
// ════════════════════════════════════════════════════════

// Carries unfinished tasks forward for the caller. Runs at most once a day per user.
export const runRollover = async (req: Request, res: Response): Promise<void> => {
    const result = await runRolloverForUser(req.userId!);
    res.status(200).json(new ApiResponse(200, result, 'Rollover checked'));
};

export const getAllChannels = async (req: Request, res: Response): Promise<void> => {
    // Bug fix: old service had no userId filter — returned ALL channels globally
    const channels = await Channel.find({ userId: req.userId });
    res.status(200).json(new ApiResponse(200, channels, 'Channels fetched successfully'));
};

export const createChannel = async (req: Request, res: Response): Promise<void> => {
    const { name, channelDescription } = req.body;

    if (!name) {
        res.status(400).json(new ApiError(400, 'Channel name is required'));
        return;
    }

    const channel = new Channel({
        name,
        channelDescription,
        userId: req.userId,
    });
    await channel.save();

    res.status(201).json(new ApiResponse(201, channel, 'Channel created successfully'));
};

export const updateChannel = async (req: Request, res: Response): Promise<void> => {
    const { channelId } = req.params;
    const { name, channelDescription } = req.body;

    const channel = await Channel.findOneAndUpdate(
        { _id: channelId, userId: req.userId },
        { name, channelDescription },
        { new: true, runValidators: true }
    );

    if (!channel) {
        res.status(404).json(new ApiError(404, 'Channel not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, channel, 'Channel updated successfully'));
};

export const deleteChannel = async (req: Request, res: Response): Promise<void> => {
    const { channelId } = req.params;

    const channel = await Channel.findOneAndDelete({ _id: channelId, userId: req.userId });
    if (!channel) {
        res.status(404).json(new ApiError(404, 'Channel not found'));
        return;
    }

    // Orphan behavior: tasks reference channels by their string name, not by id,
    // and are intentionally NOT cascade-deleted or reassigned here. Deleting a
    // channel leaves existing tasks with a `channel` value that no longer matches
    // any Channel document. They remain fully accessible via GET /tasks and
    // GET /tasks/id/:taskId, just not via GET /tasks/:channel for the deleted name.
    res.status(200).json(new ApiResponse(200, null, 'Channel deleted successfully'));
};

// ════════════════════════════════════════════════════════
// DAILY PLANNER
// ════════════════════════════════════════════════════════

export const createDailyPlanner = async (req: Request, res: Response): Promise<void> => {
    const { notes } = req.body;

    const planner = new DailyPlanner({
        notes,
        date: dateKeyToUtcMidnight(localDateKey(new Date(), req.userTimezone ?? 'UTC')),
        userId: req.userId,
    });
    await planner.save();

    res.status(201).json(new ApiResponse(201, planner, 'Daily planner created successfully'));
};

export const getTodaysPlan = async (req: Request, res: Response): Promise<void> => {
    // "Today" is the user's local day, not the server's clock day.
    const todayKey = localDateKey(new Date(), req.userTimezone ?? 'UTC');

    const plan = await DailyPlanner.findOne({
        userId: req.userId,
        date: dateKeyToUtcMidnight(todayKey),
    }).populate('tasks');

    if (!plan) {
        res.status(404).json(new ApiError(404, 'No daily planner found for today'));
        return;
    }

    res.status(200).json(new ApiResponse(200, plan, "Today's plan fetched successfully"));
};

export const updateDailyPlanner = async (req: Request, res: Response): Promise<void> => {
    const { date } = req.params;
    const { tasks, notes } = req.body;

    const dateStr = Array.isArray(date) ? date[0] : date;
    const targetDate = new Date(dateStr);
    targetDate.setUTCHours(0, 0, 0, 0);

    // upsert: true — creates the planner if it doesn't yet exist for this date
    const plan = await DailyPlanner.findOneAndUpdate(
        { userId: req.userId, date: targetDate },
        { $set: { tasks, notes } },
        { new: true, upsert: true, runValidators: true }
    ).populate('tasks');

    res.status(200).json(new ApiResponse(200, plan, 'Daily planner updated successfully'));
};
