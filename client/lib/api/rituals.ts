/**
 * Guided rituals API (Phase 8), matching server/src/modules/planner/rituals.controller.ts.
 * Task lists come back as raw ServerTask documents; map them with mapToClientTask.
 */

import { apiClient } from "./client";
import type { ServerTask } from "./planner";

export interface DailyRitualDTO {
  date: string; // "yyyy-MM-dd"
  plannedAt: string | null;
  shutdownAt: string | null;
  highlight: string;
  reflection: string;
}

export interface DailySummaryDTO extends DailyRitualDTO {
  plannedCount: number;
  plannedMinutes: number;
  doneCount: number;
  done: ServerTask[];
  open: ServerTask[];
  carriedOver: ServerTask[];
}

export interface WeekDayDTO {
  date: string;
  plannedCount: number;
  plannedMinutes: number;
  doneCount: number;
}

export interface WeeklySummaryDTO {
  weekStart: string;
  days: WeekDayDTO[];
  done: ServerTask[];
  slipped: ServerTask[];
}

export interface UpdateDailyRitualPayload {
  planned?: boolean;
  shutdown?: boolean;
  highlight?: string;
  reflection?: string;
}

export function getDailySummary(date: string): Promise<DailySummaryDTO> {
  return apiClient.get<DailySummaryDTO>(`/planner/daily/${date}/summary`);
}

export function updateDailyRitual(date: string, payload: UpdateDailyRitualPayload): Promise<DailyRitualDTO> {
  return apiClient.put<DailyRitualDTO>(`/planner/daily/${date}`, payload);
}

export function listHighlights(): Promise<DailyRitualDTO[]> {
  return apiClient.get<DailyRitualDTO[]>(`/planner/daily`);
}

export function getWeeklySummary(weekStart: string): Promise<WeeklySummaryDTO> {
  return apiClient.get<WeeklySummaryDTO>(`/planner/weekly/${weekStart}/summary`);
}
