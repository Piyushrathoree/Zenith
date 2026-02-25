import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { Task } from "../models/task.model";
import { ApiResponse } from "../utils/ApiResponse";

const createTask = async (req: Request, res: Response) => {
    const { taskDescription, due, status, notes } = req.body
    const { channel } = req.params
    if (!taskDescription) {
        throw new ApiError(404, "taskdescription not found")
    }

    try {
        const newTask = new Task({
            taskDescription,
            status,
            start: Date.now(),
            due,
            notes,
            userId: req.userId,
            channel: channel || "work"
        })
        await newTask.save()
        if (!newTask) {
            throw new ApiError(400, "task not created ")
        }
        res.status(201).json(
            new ApiResponse(201, newTask, "new task created successfully")
        )
    } catch (err) {
        throw new ApiError(500, "something went wrong")
    }
}

const getAllTasks = async (req: Request, res: Response) => {
    try {
        const tasks = await Task.find({ userId: req.userId })
        if (!tasks) {
            throw new ApiError(404, "no tasks found")
        }
        res.status(200).json(
            new ApiResponse(200, tasks, "tasks fetched successfully")
        )
    } catch (err) {
        throw new ApiError(500, "something went wrong")
    }
}

const getTasksByChannel = async (req: Request, res: Response) => {
    const { channel } = req.params
    try {
        const tasks = await Task.find({ userId: req.userId, channel })
        if (!tasks) {
            throw new ApiError(404, "no tasks found for this channel")
        }
        res.status(200).json(
            new ApiResponse(200, tasks, "tasks fetched successfully")
        )
    }

    catch (err) {
        throw new ApiError(500, "something went wrong")
    }
}

const updateTask = async (req: Request, res: Response) => {
    const { taskId } = req.params
    const { status , taskDescription } = req.body
    try {
        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, userId: req.userId },
            { status, taskDescription },
            { new: true }
        )
        if (!updatedTask) {
            throw new ApiError(404, "task not found")
        }
        res.status(200).json(
            new ApiResponse(200, updatedTask, "task status updated successfully")
        )
    } catch (err) {
        throw new ApiError(500, "something went wrong")
    }
}

const delteTask = async (req: Request, res: Response) => {
    const { taskId } = req.params
    try {
        const deletedTask = await Task.findOneAndDelete({ _id: taskId, userId: req.userId })
        if (!deletedTask) {
            throw new ApiError(404, "task not found")
        }
        res.status(200).json(
            new ApiResponse(200, deletedTask, "task deleted successfully")
        )
    } catch (err) {
        throw new ApiError(500, "something went wrong")
    }
}

export {
    createTask,
    getAllTasks,
    getTasksByChannel,
    updateTask,
    delteTask
}