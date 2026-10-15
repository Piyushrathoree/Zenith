import { Task } from '../planner/task.model.ts';
import User from '../auth/auth.model.ts';
import { env } from '../../config/env.ts';
import { CalendarConnection } from './calendar.model.ts';
import { getCalendarAccessToken } from './calendar.token.ts';
import { GoogleApiError, createZenithCalendar, deleteEvent, insertEvent, patchEvent } from './calendar.google.ts';
import { buildEventBody, shouldHaveEvent } from './calendar.event.ts';
import { dateKeyToUtcMidnight, localDateKey } from '../../utils/time.ts';

/**
 * Makes Google match the task's current state: create or update its event when it has a time,
 * delete the event when it no longer should exist. Reads the task fresh, so it is safe to run
 * repeatedly and in any order.
 */
export async function syncTaskToCalendar(userId: string, taskId: string): Promise<void> {
    const connection = await CalendarConnection.findOne({ userId, status: 'active' });
    if (!connection) return;

    const task = await Task.findOne({ _id: taskId, userId });

    if (!shouldHaveEvent(task)) {
        if (task?.calendarEventId) {
            const token = await getCalendarAccessToken(connection);
            await deleteEvent(token, connection.calendarId, task.calendarEventId);
            await Task.updateOne({ _id: task._id }, { $unset: { calendarEventId: '', calendarSyncedAt: '' } });
        }
        return;
    }

    const user = await User.findById(userId).select('timezone calendarReminderMinutes').lean();
    const timeZone = user?.timezone || 'UTC';
    const body = buildEventBody(task, {
        timeZone,
        reminderMinutes: user?.calendarReminderMinutes ?? 10,
        frontendUrl: env.FRONTEND_URL,
    });
    const token = await getCalendarAccessToken(connection);

    let eventId = task.calendarEventId;
    if (eventId) {
        try {
            await patchEvent(token, connection.calendarId, eventId, body);
        } catch (error) {
            // The user deleted the event in Google Calendar: create it again below.
            if (error instanceof GoogleApiError && (error.status === 404 || error.status === 410)) {
                eventId = undefined;
            } else {
                throw error;
            }
        }
    }

    if (!eventId) {
        try {
            eventId = (await insertEvent(token, connection.calendarId, body))!.id;
        } catch (error) {
            // The user deleted the whole Zenith calendar: make a new one and retry once.
            if (!(error instanceof GoogleApiError && error.status === 404)) throw error;
            connection.calendarId = (await createZenithCalendar(token, timeZone))!.id;
            await connection.save();
            eventId = (await insertEvent(token, connection.calendarId, body))!.id;
        }
    }

    await Task.updateOne(
        { _id: task._id, userId },
        { $set: { calendarEventId: eventId, calendarSyncedAt: new Date() } }
    );
}

/** Deletes an event that belongs to a task that was already removed from Zenith. */
export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
    const connection = await CalendarConnection.findOne({ userId, status: 'active' });
    if (!connection) return;
    const token = await getCalendarAccessToken(connection);
    await deleteEvent(token, connection.calendarId, eventId);
}

/** Syncs every task from today on that has a time. Used after connect and after timezone or reminder changes. */
export async function resyncAllForUser(userId: string): Promise<void> {
    const user = await User.findById(userId).select('timezone').lean();
    const today = localDateKey(new Date(), user?.timezone || 'UTC');
    const tasks = await Task.find({
        userId,
        due: { $gte: dateKeyToUtcMidnight(today) },
        startTime: { $nin: ['', null] },
        inBacklog: { $ne: true },
    }).select('_id').lean();

    for (const task of tasks) {
        await syncTaskToCalendar(userId, String(task._id));
    }
}
