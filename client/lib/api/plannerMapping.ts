/**
 * Mapping layer between the server Task shape
 * (server/src/modules/planner/task.model.ts) and the client Task / DailyTask
 * shapes (client/types/index.ts). The two models do not line up one to one,
 * so this file documents every decision made to bridge them.
 *
 * ─── Mapping decisions ─────────────────────────────────────────────────
 *
 * 1. tag <-> channel
 *    The client only ever offers three tags - 'work' | 'personal' | 'health'
 *    (see CreateTaskModal.tsx) - there is no channel/project picker in the
 *    UI. Rather than inventing a hidden "default" channel that throws that
 *    information away, this mapping uses the tag itself as the server
 *    `channel` string, so POST /planner/tasks/work, /personal, /health are
 *    the three channels a task ever lands in. loadInitialData() makes sure
 *    those three channels exist server side (creating any that are
 *    missing) so GET /planner/channels has something meaningful to show if
 *    a channel/project UI is added later.
 *    If a task ever comes back with a channel outside that set (legacy
 *    data, or created directly through the API), it falls back to the
 *    'work' tag client side - there is nowhere else to put it since the
 *    client Task type is a closed union.
 *
 * 2. completed <-> status
 *    The server has four statuses (todo/not_started/in_progress/done) but
 *    the client only tracks a boolean `completed`. done -> completed=true;
 *    todo/not_started/in_progress all collapse to completed=false. Marking
 *    a task complete sends status 'done'; un-completing it sends status
 *    'todo' - the client has no memory of a previous in_progress/
 *    not_started state, so it cannot round trip that nuance. This is an
 *    accepted rough edge.
 *
 * 3. date <-> due
 *    The client `date` (yyyy-MM-dd) decides which Kanban day-column a task
 *    renders in. It maps directly to the server `due` field. When reading a
 *    task back, `due` is preferred, falling back to `start`, falling back
 *    to today, so a task always lands in a valid, visible column even if
 *    the server record has neither date set.
 *
 * 4. title <-> taskDescription, notes <-> notes
 *    Direct 1:1 mapping.
 *
 * 5. time <-> startTime, duration <-> duration
 *    The server Task model now persists `duration` (a "H:mm" string, e.g.
 *    "1:00") and `startTime` ("HH:mm", optional) directly, so both round
 *    trip: they are sent on create and update, and read back on hydration
 *    instead of being defaulted. If a server task has no `duration` yet
 *    (older records created before this field existed), hydration falls
 *    back to the same sensible defaults as before (1:00 for board tasks,
 *    0:30 for daily-planner tasks) so existing rows still render sanely.
 *    `time` maps directly to `startTime` and stays undefined if the server
 *    has none. `source` / `sourceData` (the github/gmail/notion origin
 *    recorded when a card is dragged onto the board) are still client-memory
 *    only and are dropped on refresh - this is fine for now since the
 *    integration panels stay mock-backed.
 *
 * 6. Channel is now editable after creation
 *    PUT /planner/tasks/:taskId now also accepts `channel`, so a tag change
 *    is sent to the server and survives a reload instead of reverting.
 *    mapToUpdateServerTaskPayload maps `updates.tag` to `payload.channel`.
 *
 * ─── Daily planner / DailyTask ─────────────────────────────────────────
 * The server has no separate "daily task" entity: a DailyPlanner document
 * just links a date to an array of full Task documents (populated on read
 * by planner.controller.ts's getTodaysPlan / updateDailyPlanner). The
 * client's `dailyTasks` list is therefore just the populated `tasks` array
 * of today's DailyPlanner, mapped with the same tag/completed rules as
 * board tasks, using the 0:30 default duration described above.
 */

import { Task, DailyTask } from "@/types";
import { format } from "date-fns";
import type { CreateTaskPayload, ServerTask, ServerTaskStatus, UpdateTaskPayload } from "./planner";

const DEFAULT_TAG: Task["tag"] = "work";
const KNOWN_TAGS: ReadonlyArray<Task["tag"]> = ["work", "personal", "health"];

function isKnownTag(value: string): value is Task["tag"] {
  return (KNOWN_TAGS as readonly string[]).includes(value);
}

function statusToCompleted(status: ServerTaskStatus): boolean {
  return status === "done";
}

function completedToStatus(completed: boolean): ServerTaskStatus {
  return completed ? "done" : "todo";
}

/** Formats a server date (or nothing) into the yyyy-MM-dd string the board uses. */
function toDateString(value?: string): string {
  if (!value) return format(new Date(), "yyyy-MM-dd");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return format(new Date(), "yyyy-MM-dd");
  return format(parsed, "yyyy-MM-dd");
}

/** Converts a yyyy-MM-dd (or any parseable date string) into an ISO string for the API. */
function toIsoString(value: string): string | undefined {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function mapToClientTask(serverTask: ServerTask): Task {
  const tag = isKnownTag(serverTask.channel) ? serverTask.channel : DEFAULT_TAG;

  return {
    id: serverTask._id,
    title: serverTask.taskDescription,
    time: serverTask.startTime,
    duration: serverTask.duration || "1:00",
    tag,
    date: toDateString(serverTask.due || serverTask.start),
    completed: statusToCompleted(serverTask.status),
    notes: serverTask.notes,
  };
}

export function mapToClientDailyTask(serverTask: ServerTask): DailyTask {
  const tag = isKnownTag(serverTask.channel) ? serverTask.channel : DEFAULT_TAG;

  return {
    id: serverTask._id,
    title: serverTask.taskDescription,
    time: serverTask.startTime,
    duration: serverTask.duration || "0:30",
    completed: statusToCompleted(serverTask.status),
    tag,
  };
}

/** Builds the { channel, payload } pair needed for POST /planner/tasks/:channel. */
export function mapToCreateServerTaskPayload(task: Omit<Task, "id">): {
  channel: string;
  payload: CreateTaskPayload;
} {
  return {
    channel: task.tag,
    payload: {
      taskDescription: task.title,
      due: toIsoString(task.date),
      status: completedToStatus(task.completed),
      notes: task.notes,
      duration: task.duration,
      startTime: task.time,
    },
  };
}

/** Builds the payload for PUT /planner/tasks/:taskId from a partial client Task update. */
export function mapToUpdateServerTaskPayload(updates: Partial<Task>): UpdateTaskPayload {
  const payload: UpdateTaskPayload = {};

  if (updates.title !== undefined) payload.taskDescription = updates.title;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.date !== undefined) {
    const iso = toIsoString(updates.date);
    if (iso) payload.due = iso;
  }
  if (updates.completed !== undefined) payload.status = completedToStatus(updates.completed);
  if (updates.tag !== undefined) payload.channel = updates.tag;
  if (updates.duration !== undefined) payload.duration = updates.duration;
  if (updates.time !== undefined) payload.startTime = updates.time;

  return payload;
}

/**
 * Merges a server task update response back into a locally held client Task.
 * Server-authoritative fields (title/notes/date/completed/tag/duration/time)
 * are taken from the response; `source` / `sourceData` are kept from the
 * local copy since the server never tracks them (decision #5 above).
 */
export function mergeServerTaskUpdate(local: Task, serverTask: ServerTask): Task {
  const mapped = mapToClientTask(serverTask);
  return {
    ...local,
    title: mapped.title,
    notes: mapped.notes,
    date: mapped.date,
    completed: mapped.completed,
    tag: mapped.tag,
    duration: mapped.duration,
    time: mapped.time,
  };
}

/** Builds an UpdateTaskPayload that only flips the status based on a completed flag. */
export function mapCompletedToStatusPayload(completed: boolean): UpdateTaskPayload {
  return { status: completedToStatus(completed) };
}

/** Builds the payload for a new daily task, reusing the board task creation mapping. */
export function mapToCreateDailyServerTaskPayload(task: Omit<DailyTask, "id">): {
  channel: string;
  payload: CreateTaskPayload;
} {
  return {
    channel: task.tag,
    payload: {
      taskDescription: task.title,
      due: toIsoString(format(new Date(), "yyyy-MM-dd")),
      status: completedToStatus(task.completed),
      duration: task.duration,
      startTime: task.time,
    },
  };
}
