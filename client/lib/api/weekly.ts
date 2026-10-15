/**
 * Weekly planning API, matching server/src/modules/planner/weekly.controller.ts.
 * Every route is under /api/v1/planner and needs the bearer token (apiClient adds it).
 */

import { apiClient } from "./client";

export interface WeeklyGoalDTO {
  id: string;
  title: string;
  progress: number;
  target: number;
}

export interface WeeklyPlanDTO {
  weekStart: string; // "yyyy-MM-dd"
  goals: WeeklyGoalDTO[];
  priorities: string[];
  reviewNotes: string;
  reflection: WeeklyReflection;
  planningCompletedAt: string | null;
  reviewCompletedAt: string | null;
}

/** Answers to the three weekly review prompts. */
export interface WeeklyReflection {
  wentWell: string;
  didnt: string;
  change: string;
}

export interface WeeklyStatsDTO {
  weekStart: string;
  plannedCount: number;
  doneCount: number;
  plannedMinutes: number;
  doneMinutes: number;
}

export interface WeeklyCurrentResponse {
  /** Computed on the server from the user's timezone and week start setting. */
  weekStart: string;
  /** Always present: an empty plan when nothing has been saved for this week. */
  plan: WeeklyPlanDTO;
  stats: WeeklyStatsDTO;
  previousStats: WeeklyStatsDTO;
  /** Tasks in the backlog right now. Not tied to a week. */
  backlogCount: number;
}

export interface UpdateWeeklyPlanPayload {
  goals?: WeeklyGoalDTO[];
  priorities?: string[];
  reviewNotes?: string;
  reflection?: WeeklyReflection;
  planningCompleted?: boolean;
  reviewCompleted?: boolean;
}

export function getCurrentWeek(): Promise<WeeklyCurrentResponse> {
  return apiClient.get<WeeklyCurrentResponse>(`/planner/weekly/current`);
}

export function updateWeeklyPlan(
  weekStart: string,
  payload: UpdateWeeklyPlanPayload
): Promise<WeeklyPlanDTO> {
  return apiClient.put<WeeklyPlanDTO>(`/planner/weekly/${weekStart}`, payload);
}
