import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter } from '../../middleware/rateLimit.middleware.ts';
import { gateIntegrations } from '../../middleware/featureGate.middleware.ts';
import { connectProvider, callbackProvider } from './integration.controller.ts';

const router = Router();

// All integration routes require:
//   1. Authentication (valid JWT)
//   2. Pro plan or active trial (gateIntegrations)
//   3. Per-user rate limiting
router.use(authMiddleware);
router.use(gateIntegrations);
router.use(apiLimiter);

// ─── OAuth flow ────────────────────────────────────────────────────────────────
// Step 1: redirect user to provider's OAuth page
router.get('/auth/:provider', connectProvider);

// Step 2: provider redirects back here with code + state
router.get('/auth/:provider/callback', callbackProvider);

export default router;
