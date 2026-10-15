import { Router } from 'express';
import validate from '../../middleware/validate.middleware.ts';
import { HideItemSchema, hideItem, unhideItem } from './hidden.controller.ts';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter, oauthCallbackLimiter } from '../../middleware/rateLimit.middleware.ts';
import {
    connectProvider,
    callbackProvider,
    getConnectUrl,
    listProviders,
    listIntegrations,
    disconnectProvider,
    getItems,
    getItemDetail,
    updateSettings,
    getOptions,
} from './integration.controller.ts';

const router = Router();

// The OAuth callback is hit by the provider redirecting the user's browser, so it cannot carry
// a bearer token. Identity comes from the encrypted state parameter instead, which is why this
// route is registered ahead of the auth middleware, and consequently also ahead of apiLimiter,
// so it gets its own IP keyed oauthCallbackLimiter instead of going unrated.
router.get('/auth/:provider/callback', oauthCallbackLimiter, callbackProvider);

// All remaining integration routes require:
//   1. Authentication (valid JWT)
//   2. Per-user rate limiting
// Integrations are available on every plan (roadmap decision D1), so there is no Pro gate here.
router.use(authMiddleware);
router.use(apiLimiter);

// /providers and /items are registered before the /:provider style patterns below so they
// are matched first and never swallowed by them.
router.get('/providers', listProviders);
router.get('/items', getItems);
router.get('/items/:provider/:externalId', getItemDetail);
router.get('/auth/:provider/url', getConnectUrl);
router.get('/auth/:provider', connectProvider);
router.get('/', listIntegrations);
router.put('/:provider/settings', updateSettings);
router.get('/:provider/options', getOptions);
// Hide or snooze items; registered above the /:provider patterns.
router.post('/hidden', validate(HideItemSchema), hideItem);
router.delete('/hidden/:provider/:externalId', unhideItem);
router.delete('/:provider', disconnectProvider);

export default router;
