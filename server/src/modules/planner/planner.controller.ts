import type { Request, Response } from 'express';
import { Task } from './task.model.ts';
import { Channel } from './channel.model.ts';
import { DailyPlanner } from './dailyPlanner.model.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';

// ════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════

const VALID_TASK_SOURCES = ['github', 'gmail', 'notion'];

export const createTask = async (req: Request, res: Response): Promise<void> => {
    const { taskDescription, due, status, notes, duration, startTime, source, externalId, link } = req.body;
    const { channel } = req.params;

    if (!taskDescription) {
        res.status(400).json(new ApiError(400, 'taskDescription is required'));
        return;
    }

    if (source !== undefined && !VALID_TASK_SOURCES.includes(source)) {
        res.status(400).json(new ApiError(400, 'source must be one of github, gmail, or notion'));
        return;
    }

    const task = new Task({
        taskDescription,
        status: status || 'todo',
        start: new Date(),
        due,
        notes,
        duration,
        startTime,
        source,
        externalId,
        link,
        userId: req.userId,
        channel: channel || 'work',
    });
    await task.save();

    res.status(201).json(new ApiResponse(201, task, 'Task created successfully'));
};

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
    const tasks = await Task.find({ userId: req.userId });
    res.status(200).json(new ApiResponse(200, tasks, 'Tasks fetched successfully'));
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
    const { status, taskDescription, notes, due, channel, duration, startTime, source, externalId, link } = req.body;

    if (source !== undefined && !VALID_TASK_SOURCES.includes(source)) {
        res.status(400).json(new ApiError(400, 'source must be one of github, gmail, or notion'));
        return;
    }

    const task = await Task.findOneAndUpdate(
        { _id: taskId, userId: req.userId },
        { status, taskDescription, notes, due, channel, duration, startTime, source, externalId, link },
        { new: true, runValidators: true }
    );

    if (!task) {
        res.status(404).json(new ApiError(404, 'Task not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, task, 'Task updated successfully'));
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;

    const task = await Task.findOneAndDelete({ _id: taskId, userId: req.userId });
    if (!task) {
        res.status(404).json(new ApiError(404, 'Task not found'));
        return;
    }

    res.status(200).json(new ApiResponse(200, null, 'Task deleted successfully'));
};

// ════════════════════════════════════════════════════════
// CHANNELS (Projects)
// ════════════════════════════════════════════════════════

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
        date: new Date(),
        userId: req.userId,
    });
    await planner.save();

    res.status(201).json(new ApiResponse(201, planner, 'Daily planner created successfully'));
};

export const getTodaysPlan = async (req: Request, res: Response): Promise<void> => {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);

    const plan = await DailyPlanner.findOne({
        userId: req.userId,
        date: { $gte: startOfToday, $lte: endOfToday },
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
