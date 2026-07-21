import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter, oauthCallbackLimiter } from '../../middleware/rateLimit.middleware.ts';
import { gateIntegrations } from '../../middleware/featureGate.middleware.ts';
import {
    connectProvider,
    callbackProvider,
    getConnectUrl,
    listProviders,
    listIntegrations,
    disconnectProvider,
    getItems,
} from './integration.controller.ts';

const router = Router();

// The OAuth callback is hit by the provider redirecting the user's browser, so it cannot carry
// a bearer token. Identity comes from the encrypted state parameter instead, which is why this
// route is registered ahead of the auth middleware, and consequently also ahead of apiLimiter,
// so it gets its own IP keyed oauthCallbackLimiter instead of going unrated.
router.get('/auth/:provider/callback', oauthCallbackLimiter, callbackProvider);

// All remaining integration routes require:
//   1. Authentication (valid JWT)
//   2. Pro plan or active trial (gateIntegrations)
//   3. Per-user rate limiting
router.use(authMiddleware);
router.use(gateIntegrations);
router.use(apiLimiter);

// /providers and /items are registered before the /:provider style patterns below so they
// are matched first and never swallowed by them.
router.get('/providers', listProviders);
router.get('/items', getItems);
router.get('/auth/:provider/url', getConnectUrl);
router.get('/auth/:provider', connectProvider);
router.get('/', listIntegrations);
router.delete('/:provider', disconnectProvider);

export default router;
