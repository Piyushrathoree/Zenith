import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter } from '../../middleware/rateLimit.middleware.ts';
import { gateTaskLimit, gatePlannerRange } from '../../middleware/featureGate.middleware.ts';
import {
    createTask, getAllTasks, getTasksByChannel, updateTask, deleteTask,
    getAllChannels, createChannel,
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
router.get('/tasks/:channel', getTasksByChannel);
router.put('/tasks/:taskId', updateTask);
router.delete('/tasks/:taskId', deleteTask);

// ─── Channels (Projects) ───────────────────────────────────────────────────────
router.get('/channels', getAllChannels);
router.post('/channels', createChannel);

// ─── Daily Planner ─────────────────────────────────────────────────────────────
router.post('/daily-planner', createDailyPlanner);
router.get('/daily-planner/today', getTodaysPlan);
// gatePlannerRange: free users can only plan today + tomorrow
router.put('/daily-planner/:date', gatePlannerRange, updateDailyPlanner);

export default router;
