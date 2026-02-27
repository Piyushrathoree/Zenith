import type { Request, Response } from 'express';
import { Task } from './task.model.ts';
import { Channel } from './channel.model.ts';
import { DailyPlanner } from './dailyPlanner.model.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';

// ════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════

export const createTask = async (req: Request, res: Response): Promise<void> => {
    const { taskDescription, due, status, notes } = req.body;
    const { channel } = req.params;

    if (!taskDescription) {
        res.status(400).json(new ApiError(400, 'taskDescription is required'));
        return;
    }

    const task = new Task({
        taskDescription,
        status: status || 'todo',
        start: new Date(),
        due,
        notes,
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

export const updateTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;
    const { status, taskDescription, notes, due } = req.body;

    const task = await Task.findOneAndUpdate(
        { _id: taskId, userId: req.userId },
        { status, taskDescription, notes, due },
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
