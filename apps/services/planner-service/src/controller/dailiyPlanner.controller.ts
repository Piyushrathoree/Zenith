import { DailyPlanner } from "../models/dailyPlanner.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import type { Request, Response } from "express";

const createDailyPlanner = async (req: Request, res: Response) => {
    const { notes } = req.body;
    try {
        const newDailyPlanner = new DailyPlanner({
            notes,
            date: Date.now(),
            userId: req.userId,
        });
        await newDailyPlanner.save();
        if (!newDailyPlanner) {
            throw new ApiError(
                400,
                "something went wrong while creating a daily planner."
            );
        }
        res.status(201).json(
            new ApiResponse(
                201,
                newDailyPlanner,
                "new daily planner created successfully"
            )
        );
    } catch (err) {
        throw new ApiError(500, "something went wrong.");
    }
};

const getTodaysPlan = async (req: Request, res: Response) => {
    try {
        const todaysPlan = await DailyPlanner.findOne({
            userId: req.userId,
            date: { $eq: new Date().setHours(0, 0, 0, 0) },
        }).populate("tasks");
        if (!todaysPlan) {
            throw new ApiError(404, "no daily planner found for today");
        }
        res.status(200).json(
            new ApiResponse(200, todaysPlan, "todays plan fetched successfully")
        );
    } catch (err) {
        throw new ApiError(500, "something went wrong");
    }
};

// getting todays date
const getStartOfDay = (dateString: string): Date => {
    const date = new Date(dateString);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const updateDailyPlanner = async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new ApiError(401, "unauthorized");
    }
    const { date } = req.params;
    const { tasks, notes } = req.body;

    if (!date) {
        throw new ApiError(400, "date parameter is required");
    }

    const targetDate = getStartOfDay(date);
    try {
        const todaysNewPlan = await DailyPlanner.findByIdAndUpdate(
            {
                userId,
                date: targetDate,
            },
            {
                $set: { tasks: tasks, notes: notes },
            },
            {
                new: true,
                upsert: true, // <-- This is the magic. It creates the doc if it doesn't exist.
                runValidators: true, // Ensures your model's rules are followed
            }
        ).populate("tasks");
        if (!todaysNewPlan) {
            throw new ApiError(400, "something went wrong with dailyplanner");
        }
        res.status(201).json(
            new ApiResponse(
                200,
                todaysNewPlan,
                "daily planner updated successfully"
            )
        );
    } catch (err) {
        throw new ApiError(500, "something went wrong");
    }
};

export { createDailyPlanner, getTodaysPlan, updateDailyPlanner };
