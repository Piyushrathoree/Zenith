import { Project } from "../models/project.model"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import type { Response } from "express"

export const GetAllProjects = async (res: Response) => {
    try {
        const Projects = await Project.find()
        if (!Projects) {
            throw new ApiError(404, "no projects found")
        }
        return res.status(200).json(new ApiResponse(200, Projects, "projects fetched successfully"))
    } catch (error) {

    }
}