import type { Task } from "@/types";

// Layout and time math for the Day view. Keep the math here so components stay simple.

export const DAY_START_HOUR = 6;   // first row on the timeline
export const DAY_END_HOUR = 23;    // the last row ends at 23:00
export const SLOT_MINUTES = 15;
export const SLOT_HEIGHT_PX = 16;  // so 1 hour = 64px
export const DEFAULT_DAILY_CAPACITY_MINUTES = 8 * 60;

/** "1:30" -> 90. Falls back when missing or malformed. */
export function durationToMinutes(duration: string | undefined, fallback = 60): number {
  const match = /^(\d+):(\d{2})$/.exec(duration ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
}

/** 90 -> "1:30" */
export function minutesToDuration(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** "09:30" -> 570 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30" */
export function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Every slot start on the timeline: "06:00", "06:15", ... "22:45". */
export function slotTimes(): string[] {
  const slots: string[] = [];
  for (let m = DAY_START_HOUR * 60; m < DAY_END_HOUR * 60; m += SLOT_MINUTES) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

/** Pixel position and height for a block, clamped to the visible day. */
export function blockGeometry(startTime: string, duration: string): { top: number; height: number } {
  const dayStart = DAY_START_HOUR * 60;
  const dayEnd = DAY_END_HOUR * 60;
  const startMinutes = timeToMinutes(startTime);
  const start = Math.max(dayStart, startMinutes);
  const end = Math.min(dayEnd, startMinutes + durationToMinutes(duration));
  const pxPerMinute = SLOT_HEIGHT_PX / SLOT_MINUTES;
  return {
    top: (start - dayStart) * pxPerMinute,
    height: Math.max(SLOT_HEIGHT_PX, (end - start) * pxPerMinute),
  };
}

/** Ids of scheduled tasks whose time ranges overlap another task's. */
export function findOverlaps(tasks: Task[]): Set<string> {
  const scheduled = tasks
    .filter((task) => task.time)
    .map((task) => {
      const start = timeToMinutes(task.time ?? "00:00");
      return { id: task.id, start, end: start + durationToMinutes(task.duration) };
    })
    .sort((a, b) => a.start - b.start);

  const overlapping = new Set<string>();
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length && scheduled[j].start < scheduled[i].end; j++) {
      overlapping.add(scheduled[i].id);
      overlapping.add(scheduled[j].id);
    }
  }
  return overlapping;
}

/** Sum of durations of all tasks on the day, scheduled or not. */
export function plannedMinutes(tasks: Task[]): number {
  return tasks.reduce((sum, task) => sum + durationToMinutes(task.duration), 0);
}

/** Snap a resize delta in pixels to whole slots, minimum one slot. */
export function snapDuration(startMinutes: number, deltaPx: number): number {
  const deltaSlots = Math.round(deltaPx / SLOT_HEIGHT_PX);
  return Math.max(SLOT_MINUTES, startMinutes + deltaSlots * SLOT_MINUTES);
}
