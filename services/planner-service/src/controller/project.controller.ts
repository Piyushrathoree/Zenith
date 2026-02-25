import { Channel } from "../models/project.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import type { Request, Response } from "express";

export const GetAllChannels = async (res: Response) => {
    try {
        const Channels = await Channel.find();
        if (!Channels) {
            throw new ApiError(404, "no channels found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, Channels, "Channels fetched successfully"));
    } catch (error) { }
};

export const CreateProject = async (req: Request, res: Response) => {
    const { ChannelName, ChannelDescription } = req.body;
    if (!ChannelName) {
        throw new ApiError(404, "channel name not found");
    }
    try {
        const NewChannel = new Channel({
            name: ChannelName,
            ChannelDescription,
            userId: req.userId,
        });
        await NewChannel.save();
        if (!NewChannel) {
            throw new ApiError(400, "something went wrong while creating a project.");
        }
        res
            .status(201)
            .json(
                new ApiResponse(200, NewChannel, "new project created successfully")
            );
    } catch (err) {
        throw new ApiError(500, "something went wrong.");
    }
};

