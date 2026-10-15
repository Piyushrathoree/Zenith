/**
 * Repeating (recurring) task API, matching server/src/modules/planner/recurring.controller.ts.
 * Every route is under /api/v1/planner and needs the bearer token (apiClient adds it).
 */

import { apiClient } from "./client";

export interface RecurringRuleDTO {
  id: string;
  title: string;
  channel: "work" | "personal" | "health";
  duration: string;
  startTime: string;
  notes?: string;
  rrule: string;
  startsOn: string; // "yyyy-MM-dd"
  endsOn: string | null;
}

export interface RecurringInput {
  title: string;
  channel: "work" | "personal" | "health";
  duration: string;
  startTime: string;
  notes?: string;
  rrule: string;
  startsOn: string;
  endsOn?: string;
}

/** Null clears the end date. Every field is optional on update. */
export type RecurringUpdate = Partial<Omit<RecurringInput, "endsOn">> & { endsOn?: string | null };

export function listRecurring(): Promise<RecurringRuleDTO[]> {
  return apiClient.get<RecurringRuleDTO[]>(`/planner/recurring`);
}

export function createRecurring(
  input: RecurringInput
): Promise<{ rule: RecurringRuleDTO; createdCount: number }> {
  return apiClient.post<{ rule: RecurringRuleDTO; createdCount: number }>(`/planner/recurring`, input);
}

export function updateRecurring(id: string, input: RecurringUpdate): Promise<RecurringRuleDTO> {
  return apiClient.put<RecurringRuleDTO>(`/planner/recurring/${id}`, input);
}

/** Ends the series. Past and completed days stay. */
export function stopRecurring(id: string): Promise<null> {
  return apiClient.del<null>(`/planner/recurring/${id}`);
}
