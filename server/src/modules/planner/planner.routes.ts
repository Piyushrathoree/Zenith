import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter } from '../../middleware/rateLimit.middleware.ts';
import { gateTaskLimit, gatePlannerRange } from '../../middleware/featureGate.middleware.ts';
import {
    createTask, getAllTasks, getTasksByChannel, getTaskById, updateTask, deleteTask,
    getAllChannels, createChannel, updateChannel, deleteChannel,
    createDailyPlanner, getTodaysPlan, updateDailyPlanner,
} from './planner.controller.ts';

const router = Router();

// All planner routes require authentication + per-user rate limiting
router.use(authMiddleware);
router.use(apiLimiter);

// ─── Tasks ─────────────────────────────────────────────────────────────────────
// gateTaskLimit is applied ONLY on create — reads are always free
router.post('/tasks/:channel', gateTaskLimit, createTask);
router.get('/tasks', getAllTasks);
// Single-task fetch is mounted under /tasks/id/:taskId (two segments) rather than
// /tasks/:taskId, since /tasks/:taskId would be indistinguishable from the existing
// single-segment /tasks/:channel route below. This keeps both routes unambiguous
// without reordering or changing the existing channel-listing route's path.
router.get('/tasks/id/:taskId', getTaskById);
router.get('/tasks/:channel', getTasksByChannel);
router.put('/tasks/:taskId', updateTask);
router.delete('/tasks/:taskId', deleteTask);

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

export default router;
