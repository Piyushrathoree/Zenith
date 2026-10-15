/**
 * Google Calendar sync API, matching server/src/modules/calendar/calendar.routes.ts.
 * Every route is under /api/v1/calendar and needs the bearer token (apiClient adds it),
 * except the Google callback, which the server handles on its own.
 */

import { apiClient } from "./client";

export interface CalendarStatus {
  connected: boolean;
  status: "active" | "revoked" | null;
}

export function getCalendarStatus(): Promise<CalendarStatus> {
  return apiClient.get<CalendarStatus>(`/calendar/status`);
}

/** Removes the Zenith calendar and its events from the user's Google account. */
export function disconnectCalendar(): Promise<null> {
  return apiClient.del<null>(`/calendar`);
}

/**
 * Two step connect: the consent URL needs the bearer token, but a full page navigation cannot
 * send one. So fetch the URL first, then navigate the browser to it.
 */
export async function startCalendarConnect(): Promise<void> {
  const { url } = await apiClient.get<{ url: string }>(`/calendar/connect-url`);
  window.location.href = url;
}
