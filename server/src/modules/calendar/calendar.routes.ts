import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter, oauthCallbackLimiter } from '../../middleware/rateLimit.middleware.ts';
import {
    calendarCallback,
    disconnectCalendar,
    getCalendarConnectUrl,
    getCalendarStatus,
} from './calendar.controller.ts';

const router = Router();

// Google redirects the browser here, so there is no bearer token. Identity comes from `state`.
// Registered before authMiddleware, with its own IP rate limiter.
router.get('/callback', oauthCallbackLimiter, calendarCallback);

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/status', getCalendarStatus);
router.get('/connect-url', getCalendarConnectUrl);
router.delete('/', disconnectCalendar);

export default router;
