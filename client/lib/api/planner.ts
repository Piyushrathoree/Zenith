/**
 * Planner service functions, typed against server/src/modules/planner.
 *
 * Every route below is mounted under /api/v1/planner (see
 * server/src/modules/planner/planner.routes.ts), requires the Bearer token
 * (authMiddleware runs on the whole router), and returns/accepts the shapes
 * defined in the model files in that same folder:
 *   - task.model.ts          -> ServerTask
 *   - channel.model.ts       -> ServerChannel
 *   - dailyPlanner.model.ts  -> ServerDailyPlanner
 *
 * Responses are unwrapped by apiClient already (it strips the ApiResponse
 * envelope and throws ApiRequestError on failure), so every function here
 * resolves directly with the `data` payload.
 *
 * As of this pass, updateTask (PUT /planner/tasks/:taskId) and createTask
 * (POST /planner/tasks/:channel) also accept `channel`, `duration`
 * ("H:mm" style string like "1:00") and `startTime` ("HH:mm", optional).
 * Server Task documents now persist `duration`/`startTime`, so a task's
 * tag/channel, duration and time-of-day all round trip across a reload -
 * see plannerMapping.ts for how these map onto the client Task shape.
 *
 * There is now also a single-task fetch, GET /planner/tasks/id/:taskId
 * (getTaskById below) - mounted under /id/ rather than /:taskId because
 * that single path segment after /tasks is already used by
 * GET /planner/tasks/:channel. Nothing in this client currently needs to
 * re-fetch one task in isolation (mutations already return the full
 * updated/created ServerTask, and the store keeps everything else in
 * memory - see useStore.ts), so getTaskById is exposed here for
 * completeness but is not wired into the store.
 */

import { apiClient } from "./client";

export type ServerTaskStatus = "todo" | "not_started" | "in_progress" | "done";

export interface ServerTask {
  _id: string;
  taskDescription: string;
  userId: string;
  channel: string;
  start?: string;
  due?: string;
  status: ServerTaskStatus;
  notes?: string;
  duration?: string;
  startTime?: string;
}

export interface CreateTaskPayload {
  taskDescription: string;
  due?: string;
  status?: ServerTaskStatus;
  notes?: string;
  duration?: string;
  startTime?: string;
}

export interface UpdateTaskPayload {
  taskDescription?: string;
  due?: string;
  status?: ServerTaskStatus;
  notes?: string;
  channel?: string;
  duration?: string;
  startTime?: string;
}

export interface ServerChannel {
  _id: string;
  name: string;
  userId: string;
  channelDescription?: string;
}

export interface CreateChannelPayload {
  name: string;
  channelDescription?: string;
}

/**
 * DailyPlanner.tasks is a Mongoose ref array. It comes back populated
 * (full ServerTask objects) from GET /daily-planner/today and
 * PUT /daily-planner/:date because the controller chains .populate('tasks')
 * on both of those queries. POST /daily-planner does not populate, but this
 * client never relies on the `tasks` field of that response (see
 * useStore.ts loadInitialData / daily planner actions), so a single
 * populated type is enough here.
 */
export interface ServerDailyPlanner {
  _id: string;
  date: string;
  userId: string;
  tasks: ServerTask[];
  notes?: string;
}

export interface UpdateDailyPlannerPayload {
  /** Server Task _id list this daily plan should point to. */
  tasks?: string[];
  notes?: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────

export function createTask(channel: string, payload: CreateTaskPayload): Promise<ServerTask> {
  return apiClient.post<ServerTask>(`/planner/tasks/${encodeURIComponent(channel)}`, payload);
}

export function getAllTasks(): Promise<ServerTask[]> {
  return apiClient.get<ServerTask[]>(`/planner/tasks`);
}

export function getTasksByChannel(channel: string): Promise<ServerTask[]> {
  return apiClient.get<ServerTask[]>(`/planner/tasks/${encodeURIComponent(channel)}`);
}

export function getTaskById(taskId: string): Promise<ServerTask> {
  return apiClient.get<ServerTask>(`/planner/tasks/id/${taskId}`);
}

export function updateTaskRequest(taskId: string, payload: UpdateTaskPayload): Promise<ServerTask> {
  return apiClient.put<ServerTask>(`/planner/tasks/${taskId}`, payload);
}

export function deleteTaskRequest(taskId: string): Promise<null> {
  return apiClient.del<null>(`/planner/tasks/${taskId}`);
}

// ─── Channels (Projects) ────────────────────────────────────────────────

export function getAllChannels(): Promise<ServerChannel[]> {
  return apiClient.get<ServerChannel[]>(`/planner/channels`);
}

export function createChannelRequest(payload: CreateChannelPayload): Promise<ServerChannel> {
  return apiClient.post<ServerChannel>(`/planner/channels`, payload);
}

// ─── Daily planner ──────────────────────────────────────────────────────

export function getTodaysPlan(): Promise<ServerDailyPlanner> {
  return apiClient.get<ServerDailyPlanner>(`/planner/daily-planner/today`);
}

export function createDailyPlanner(notes?: string): Promise<ServerDailyPlanner> {
  return apiClient.post<ServerDailyPlanner>(`/planner/daily-planner`, { notes });
}

/**
 * Upserts the plan for the given date (yyyy-MM-dd). The server route
 * (PUT /daily-planner/:date) creates the document if it does not exist yet,
 * so callers never need to call createDailyPlanner() first for "today".
 */
export function updateDailyPlanner(
  date: string,
  payload: UpdateDailyPlannerPayload
): Promise<ServerDailyPlanner> {
  return apiClient.put<ServerDailyPlanner>(`/planner/daily-planner/${date}`, payload);
}
