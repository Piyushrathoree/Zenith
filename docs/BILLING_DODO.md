# Adding Dodo Payments Billing to Zenith

> Billing is not yet implemented in this repo. This guide shows how to add it.

Dodo Payments is a merchant-of-record payments platform (an alternative to Stripe), meaning they handle global tax and compliance for you. This guide is based on their official docs, linked inline. Where a detail could not be confirmed from the docs, that is called out explicitly rather than guessed.

## Table of contents

1. [What we are building](#1-what-we-are-building)
2. [Prerequisites and env vars](#2-prerequisites-and-env-vars)
3. [Backend, minimal](#3-backend-minimal)
4. [Frontend, minimal](#4-frontend-minimal)
5. [Test it](#5-test-it)
6. [Troubleshooting](#6-troubleshooting)

## 1. What we are building

An "Upgrade to Pro" button that creates a Dodo Payments Checkout Session (a hosted payment page) and redirects the user there. When the subscription becomes active, Dodo Payments calls a webhook on our server, and we flip that user's `plan` field to `'pro'` in Mongo. When the subscription is cancelled or expires, another webhook flips it back to `'free'`.

Zenith already has all the plan gating logic in `server/src/middleware/featureGate.middleware.ts` and `server/src/config/planLimits.ts`. That code just reads `User.plan` (and `User.trialEndsAt`) from the database. Billing does not need to touch any of that, its only job is to keep `User.plan` in sync with what Dodo Payments says the user paid for.

## 2. Prerequisites and env vars

1. Create a [Dodo Payments account](https://dodopayments.com/) and finish onboarding.
2. In the Dodo Payments Dashboard, create a subscription Product (e.g. "Zenith Pro", monthly recurring). Copy its `product_id`. Product setup is described in the [Checkout Sessions doc](https://docs.dodopayments.com/developer-resources/checkout-session), which notes each product must have a valid `product_id` from your dashboard.
3. Generate a Test Mode API key from the dashboard (per the [Integration Guide](https://docs.dodopayments.com/api-reference/integration-guide)).
4. Get your webhook secret key from Developer > Webhooks in the dashboard, per the [Webhooks doc](https://docs.dodopayments.com/developer-resources/webhooks).
5. Install the official Node SDK in `server`:

   ```bash
   cd server
   npm install dodopayments
   ```

   Package confirmed via [npm](https://www.npmjs.com/package/dodopayments): it is the official TypeScript library for the Dodo Payments API, requiring Node 20 LTS or later.

6. Add three optional env vars to `server/src/config/env.ts`. Keep them `.optional()` so the server keeps booting for developers who have not set up Dodo Payments yet:

   ```ts
   // Dodo Payments (billing), optional so the server still boots without them
   DODO_PAYMENTS_API_KEY: z.string().min(1).optional(),
   DODO_PAYMENTS_WEBHOOK_KEY: z.string().min(1).optional(),
   DODO_PAYMENTS_PRODUCT_ID: z.string().min(1).optional(),
   ```

7. Add the same names to `server/.env.example` (placeholders) and `server/.env` (real values):

   ```
   DODO_PAYMENTS_API_KEY=your-dodo-test-mode-api-key
   DODO_PAYMENTS_WEBHOOK_KEY=your-dodo-webhook-secret
   DODO_PAYMENTS_PRODUCT_ID=your-pro-plan-product-id
   ```

   `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_WEBHOOK_KEY` are the exact env var names shown in the SDK usage examples in the [Checkout Sessions doc](https://docs.dodopayments.com/developer-resources/checkout-session) and the [Webhooks doc](https://docs.dodopayments.com/developer-resources/webhooks). `DODO_PAYMENTS_PRODUCT_ID` is not an official env var name, it is one we made up for this guide to hold your Pro plan's `product_id`, the same way `STRIPE_PRICE_ID` works in the Stripe guide.

## 3. Backend, minimal

Create a new module: `server/src/modules/billing/`.

### 3.1 The raw body note (read this first)

Dodo Payments signs webhooks following the Standard Webhooks specification (HMAC SHA256 over the raw payload), confirmed in the [Webhooks doc](https://docs.dodopayments.com/developer-resources/webhooks), which explicitly says to use `express.raw()` middleware so the exact bytes reach the verifier. Just like Stripe, this means the webhook route must not go through the global `express.json()` parser. Mount a small raw-body router before it in `app.ts`:

```ts
// server/src/app.ts (add near the top, before app.use(express.json()))
import billingRoutes, { webhookRouter as billingWebhookRouter } from './modules/billing/billing.routes.ts';

app.use('/api/v1/billing', billingWebhookRouter); // raw body, must come first
app.use(express.json());
// ...later, with the other routers:
app.use('/api/v1/billing', billingRoutes);
```

### 3.2 `server/src/modules/billing/billing.controller.ts`

```ts
import DodoPayments from 'dodopayments';
import type { Request, Response } from 'express';
import User from '../auth/auth.model.ts';
import { env } from '../../config/env.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';

let dodoClient: DodoPayments | null = null;
const getDodoClient = (): DodoPayments => {
    if (!env.DODO_PAYMENTS_API_KEY) throw new ApiError(503, 'Billing is not configured');
    if (!dodoClient) {
        dodoClient = new DodoPayments({
            bearerToken: env.DODO_PAYMENTS_API_KEY,
            environment: 'test_mode', // switch to 'live_mode' in production
        });
    }
    return dodoClient;
};

// POST /api/v1/billing/checkout (protected)
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    if (!env.DODO_PAYMENTS_API_KEY || !env.DODO_PAYMENTS_PRODUCT_ID) {
        throw new ApiError(503, 'Billing is not configured');
    }
    const dodo = getDodoClient();
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const session = await dodo.checkoutSessions.create({
        product_cart: [{ product_id: env.DODO_PAYMENTS_PRODUCT_ID, quantity: 1 }],
        customer: { email: user.email, name: user.name },
        return_url: `${env.FRONTEND_URL}/billing?status=success`,
        metadata: { userId: user.id },
    });

    if (!session.checkout_url) throw new ApiError(502, 'Dodo Payments did not return a checkout URL');
    res.status(200).json(new ApiResponse(200, { url: session.checkout_url }, 'Checkout session created'));
};

// POST /api/v1/billing/webhook (public, signature verified)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    if (!env.DODO_PAYMENTS_API_KEY || !env.DODO_PAYMENTS_WEBHOOK_KEY) {
        res.status(503).json(new ApiError(503, 'Billing is not configured'));
        return;
    }
    const dodo = getDodoClient();

    let event;
    try {
        event = dodo.webhooks.unwrap(req.body.toString(), {
            headers: {
                'webhook-id': req.headers['webhook-id'],
                'webhook-signature': req.headers['webhook-signature'],
                'webhook-timestamp': req.headers['webhook-timestamp'],
            },
        });
    } catch (err) {
        console.error('[billing webhook] signature verification failed:', err);
        res.status(400).json(new ApiError(400, 'Invalid webhook signature'));
        return;
    }

    try {
        const userId = event.data?.metadata?.userId;
        switch (event.type) {
            case 'subscription.active':
                if (userId) await User.findByIdAndUpdate(userId, { plan: 'pro' });
                break;
            case 'subscription.cancelled':
            case 'subscription.expired':
                if (userId) await User.findByIdAndUpdate(userId, { plan: 'free' });
                break;
            default:
                break;
        }
    } catch (err) {
        console.error('[billing webhook] failed to process event', event.type, err);
    }

    res.status(200).json({ received: true });
};
```

Event names (`subscription.active`, `subscription.created`, `subscription.cancelled`, `subscription.expired`) and the `client.webhooks.unwrap()` verification method come from the [Webhooks doc](https://docs.dodopayments.com/developer-resources/webhooks). One detail we could not confirm from the docs: the exact shape of `event.data` (specifically whether `metadata.userId` set at checkout is echoed back on the subscription webhook payload, or whether you instead need to look the subscription up by a `customer_id`/`subscription_id` stored on the `User` at checkout time). Before shipping this, print `JSON.stringify(event, null, 2)` in a test webhook (see section 5) and confirm where your `userId` metadata actually shows up, then adjust the lookup accordingly. If it is not on the event, add an optional `dodoCustomerId` field to `User` (same pattern as `stripeCustomerId` in the Stripe guide) and look up by that instead. See the full event payload reference at [docs.dodopayments.com](https://docs.dodopayments.com/developer-resources/webhooks).

### 3.3 `server/src/modules/billing/billing.routes.ts`

```ts
import express, { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { createCheckoutSession, handleWebhook } from './billing.controller.ts';

const router = Router();
router.use(authMiddleware);
router.post('/checkout', createCheckoutSession);
export default router;

// Separate router, mounted with express.raw() before express.json() in app.ts
export const webhookRouter = Router();
webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);
```

### 3.4 Register the routes, then configure the webhook in Dodo Payments

Register the routes in `server/src/app.ts` using the snippet from section 3.1: import both exports from `billing.routes.ts`, mount `billingWebhookRouter` before `express.json()`, and mount `billingRoutes` alongside your other `/api/v1/...` routers.

In the dashboard, go to Developer > Webhooks, add an endpoint pointing at `https://your-domain.com/api/v1/billing/webhook`, and subscribe to the subscription events (`subscription.active`, `subscription.cancelled`, `subscription.expired`). Details at the [Webhooks doc](https://docs.dodopayments.com/developer-resources/webhooks).

## 4. Frontend, minimal

### 4.1 `client/lib/api/billing.ts`

```ts
import { apiClient } from "./client";

export interface CheckoutSessionResponse {
  url: string;
}

export async function startCheckout(): Promise<void> {
  const { url } = await apiClient.post<CheckoutSessionResponse>("/billing/checkout");
  window.location.href = url;
}
```

### 4.2 `client/app/billing/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError } from "@/lib/api/client";
import { startCheckout } from "@/lib/api/billing";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await startCheckout(); // redirects the browser on success
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "Unable to start checkout";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle>Upgrade to Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unlimited tasks, full planner range, and integrations. You will be redirected to Dodo Payments to complete payment.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading ? "Redirecting..." : "Upgrade to Pro"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

## 5. Test it

1. Install the official [Dodo Payments CLI](https://docs.dodopayments.com/developer-resources/sdks/cli):

   ```bash
   npm install -g dodopayments-cli
   ```

2. Start your server (`npm run dev` in `server/`), then forward live test-mode webhooks to it:

   ```bash
   dodo wh listen
   ```

   Per the [CLI doc](https://docs.dodopayments.com/developer-resources/sdks/cli), this requires a Test Mode API key, and it will prompt you for the local URL to forward to (use `http://localhost:8000/api/v1/billing/webhook`). It preserves the `webhook-id`, `webhook-signature`, and `webhook-timestamp` headers so your signature check in section 3.2 actually gets exercised.

3. Log into the Zenith app, go to `/billing`, click "Upgrade to Pro". You will land on a Dodo Payments hosted Checkout page.
4. Pay with a [test card](https://docs.dodopayments.com/miscellaneous/testing-process), for example `4242 4242 4242 4242` for a successful payment, or `4000 0000 0000 0002` to simulate a decline.
5. Watch the `dodo wh listen` terminal for the incoming event and your server's response.
6. Confirm the plan flipped in Mongo:

   ```bash
   mongosh "mongodb://localhost:27017/zenith" --eval "db.users.findOne({ email: 'you@example.com' }, { plan: 1 })"
   ```

   `plan` should now read `"pro"`.
7. To test cancellation without a real subscription, use the CLI's mock trigger:

   ```bash
   dodo wh trigger
   ```

   This walks you through picking an event type (e.g. a `subscription.cancelled` event) and sends it to your endpoint. Note: per the [CLI doc](https://docs.dodopayments.com/developer-resources/sdks/cli), triggered mock events "are not signed", so you will need to temporarily bypass signature verification to test this path, or rely on `dodo wh listen` with a real test subscription cancelled from the dashboard instead.

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Webhook returns 400 "Invalid webhook signature" | The route is going through `express.json()` before reaching the handler | Confirm `webhookRouter` is mounted with `express.raw()` and mounted before `app.use(express.json())` in `app.ts` |
| No events show up while running `dodo wh listen` | Wrong local URL, or server not running | Check the forwarding URL matches your local server port and the `/api/v1/billing/webhook` path exactly |
| Checkout works but `plan` never changes in Mongo | Webhook handler cannot find `metadata.userId` on the event, or the field lives somewhere else in the payload | Log the full event with `JSON.stringify(event, null, 2)` in your handler and confirm the exact path to your `userId`, per the note in section 3.2 |
| `dodo wh trigger` events get rejected as invalid signatures | Mock events from `trigger` are unsigned by design | Use `dodo wh listen` with a real test-mode checkout/subscription instead, or temporarily skip verification only in local dev |
| Works in test mode but not in production | Using a Test Mode API key/webhook secret instead of Live Mode ones | Switch `environment: 'test_mode'` to `'live_mode'` in the SDK client and use your live API key and live webhook secret in production env vars |

For anything beyond this minimal flow (proration, multiple products in one cart, tax handling, licensing), see the official [Dodo Payments docs](https://docs.dodopayments.com/) and the [Integration Guide](https://docs.dodopayments.com/api-reference/integration-guide).
