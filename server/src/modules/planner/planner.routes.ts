import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter } from '../../middleware/rateLimit.middleware.ts';
import { gateTaskLimit, gatePlannerRange } from '../../middleware/featureGate.middleware.ts';
import validate from '../../middleware/validate.middleware.ts';
import {
    createTask, getAllTasks, getBacklog, getTasksByChannel, getTaskById, updateTask, deleteTask,
    getAllChannels, createChannel, updateChannel, deleteChannel,
    createDailyPlanner, getTodaysPlan, updateDailyPlanner, runRollover,
} from './planner.controller.ts';
import { getCurrentWeek, updateWeeklyPlan } from './weekly.controller.ts';
import { UpdateWeeklyPlanSchema } from './weekly.schema.ts';
import {
    UpdateDailyRitualSchema, getDailySummary, getWeeklySummary, listDailyHighlights, updateDailyRitual,
} from './rituals.controller.ts';
import { createRecurring, listRecurring, stopRecurring, updateRecurring } from './recurring.controller.ts';
import { CreateRecurringSchema, UpdateRecurringSchema } from './recurring.schema.ts';

const router = Router();

// All planner routes require authentication + per-user rate limiting
router.use(authMiddleware);
router.use(apiLimiter);

// ─── Tasks ─────────────────────────────────────────────────────────────────────
// gateTaskLimit: free users may put at most 4 tasks on a given day
router.post('/tasks/:channel', gateTaskLimit, createTask);
router.get('/tasks', getAllTasks);
// Single-task fetch is mounted under /tasks/id/:taskId (two segments) rather than
// /tasks/:taskId, since /tasks/:taskId would be indistinguishable from the existing
// single-segment /tasks/:channel route below. This keeps both routes unambiguous
// without reordering or changing the existing channel-listing route's path.
router.get('/tasks/id/:taskId', getTaskById);
router.get('/tasks/:channel', getTasksByChannel);
router.put('/tasks/:taskId', gateTaskLimit, updateTask);
router.delete('/tasks/:taskId', deleteTask);

// ─── Backlog ───────────────────────────────────────────────────────────────────
// Tasks with no day. Moving a task in or out goes through PUT /tasks/:taskId.
router.get('/backlog', getBacklog);

// ─── Rollover ──────────────────────────────────────────────────────────────────
// Carries unfinished tasks forward. Called on dashboard load, and by the scheduled job.
router.post('/rollover', runRollover);

// ─── Channels (Projects) ───────────────────────────────────────────────────────
router.get('/channels', getAllChannels);
router.post('/channels', createChannel);
router.put('/channels/:channelId', updateChannel);
router.delete('/channels/:channelId', deleteChannel);

// ─── Daily Planner ─────────────────────────────────────────────────────────────
router.post('/daily-planner', createDailyPlanner);
router.get('/daily-planner/today', getTodaysPlan);
// gatePlannerRange: free users can only plan today + tomorrow
router.put('/daily-planner/:date', gatePlannerRange, updateDailyPlanner);

// ─── Weekly planning ───────────────────────────────────────────────────────────
// No feature gate: weekly planning is available to every user.
router.get('/weekly/current', getCurrentWeek);
router.put('/weekly/:weekStart', validate(UpdateWeeklyPlanSchema), updateWeeklyPlan);
router.get('/weekly/:weekStart/summary', getWeeklySummary);

// ─── Daily rituals (planning, shutdown, highlights) ────────────────────────────
router.get('/daily', listDailyHighlights);
router.get('/daily/:date/summary', getDailySummary);
router.put('/daily/:date', validate(UpdateDailyRitualSchema), updateDailyRitual);

// ─── Recurring tasks ───────────────────────────────────────────────────────────
router.get('/recurring', listRecurring);
router.post('/recurring', validate(CreateRecurringSchema), createRecurring);
router.put('/recurring/:id', validate(UpdateRecurringSchema), updateRecurring);
router.delete('/recurring/:id', stopRecurring);

export default router;
