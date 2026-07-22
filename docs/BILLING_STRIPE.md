# Adding Stripe Billing to Zenith

> Billing is not yet implemented in this repo. This guide shows how to add it.

## Table of contents

1. [What we are building](#1-what-we-are-building)
2. [Prerequisites and env vars](#2-prerequisites-and-env-vars)
3. [Backend, minimal](#3-backend-minimal)
4. [Frontend, minimal](#4-frontend-minimal)
5. [Test it](#5-test-it)
6. [Troubleshooting](#6-troubleshooting)

## 1. What we are building

A "Upgrade to Pro" button that creates a Stripe Checkout session (a hosted payment page Stripe hosts for you) and redirects the user there. When the payment succeeds, Stripe calls a webhook on our server, and we flip that user's `plan` field to `'pro'` in Mongo. If the subscription is later cancelled, another webhook flips it back to `'free'`.

Zenith already has all the plan gating logic in `server/src/middleware/featureGate.middleware.ts` and `server/src/config/planLimits.ts`. That code just reads `User.plan` (and `User.trialEndsAt`) from the database. Billing does not need to touch any of that. Its only job is to keep `User.plan` in sync with what Stripe says the user paid for.

## 2. Prerequisites and env vars

1. Create a free [Stripe account](https://dashboard.stripe.com/register).
2. In the Stripe Dashboard, create a Product called "Zenith Pro" with a recurring monthly (or yearly) Price. Copy the Price ID, it looks like `price_1AbCdEfGhIjKlMnOp`.
3. Grab your test secret key from Dashboard > Developers > API keys. It looks like `sk_test_...`.
4. Install the Stripe Node SDK in `server`:

```bash
cd server
npm install stripe
```

5. Add three optional env vars to `server/src/config/env.ts`. Keep them `.optional()` so the server keeps booting for developers who have not set up Stripe yet:

```ts
// Stripe (billing), optional so the server still boots without them
STRIPE_SECRET_KEY: z.string().min(1).optional(),
STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
STRIPE_PRICE_ID: z.string().min(1).optional(),
```

6. Add the same names (commented out or with placeholder values) to `server/.env.example`, and real values to your local `server/.env`:

```
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-signing-secret
STRIPE_PRICE_ID=price_your-pro-plan-recurring-price-id
```

You will get `STRIPE_WEBHOOK_SECRET` in step 5 of the "Test it" section below, once you run the Stripe CLI.

## 3. Backend, minimal

Create a new module: `server/src/modules/billing/`.

### 3.1 The raw body note (read this first)

Stripe signs the exact raw bytes of the webhook request. `app.ts` already runs `express.json()` globally, which parses the body into a JS object and throws away the original bytes, so signature verification would fail if the webhook route went through that parser. The fix is to mount a small router with `express.raw()` for just the webhook path, and mount it in `app.ts` *before* `express.json()`:

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
import Stripe from 'stripe';
import type { Request, Response } from 'express';
import User from '../auth/auth.model.ts';
import { env } from '../../config/env.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';

let stripeClient: Stripe | null = null;
const getStripeClient = (): Stripe => {
    if (!env.STRIPE_SECRET_KEY) throw new ApiError(503, 'Billing is not configured');
    if (!stripeClient) stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
    return stripeClient;
};

// POST /api/v1/billing/checkout (protected)
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
        throw new ApiError(503, 'Billing is not configured');
    }
    const stripe = getStripeClient();
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
        success_url: `${env.FRONTEND_URL}/billing?status=success`,
        cancel_url: `${env.FRONTEND_URL}/billing?status=cancel`,
        metadata: { userId: user.id },
    });

    if (!session.url) throw new ApiError(502, 'Stripe did not return a checkout URL');
    res.status(200).json(new ApiResponse(200, { url: session.url }, 'Checkout session created'));
};

// POST /api/v1/billing/webhook (public, signature verified)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
        res.status(503).json(new ApiError(503, 'Billing is not configured'));
        return;
    }
    const stripe = getStripeClient();
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
        res.status(400).json(new ApiError(400, 'Missing Stripe signature header'));
        return;
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('[billing webhook] signature verification failed:', err);
        res.status(400).json(new ApiError(400, 'Invalid webhook signature'));
        return;
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                if (userId) await User.findByIdAndUpdate(userId, { plan: 'pro' });
                break;
            }
            case 'customer.subscription.deleted': {
                // Subscription cancelled or expired: match the customer back to
                // a user. Simplest approach for a minimal setup is storing
                // stripeCustomerId on the User the first time they check out
                // (see the note below) and looking it up here.
                break;
            }
            default:
                break;
        }
    } catch (err) {
        console.error('[billing webhook] failed to process event', event.type, err);
    }

    res.status(200).json({ received: true });
};
```

A note on cancellations: the snippet above keeps things simple by matching `checkout.session.completed` via `metadata.userId`. To handle `customer.subscription.deleted` (cancellation) and `customer.subscription.updated` (e.g. payment failed) you need a way to map a Stripe customer back to a Zenith user. The common pattern is to add an optional `stripeCustomerId` field to `User`, save it the first time you create a Stripe Customer in the checkout handler, then look up `User.findOneAndUpdate({ stripeCustomerId }, { plan: 'free' })` inside those two webhook cases. See the [Stripe subscriptions docs](https://docs.stripe.com/billing/subscriptions/webhooks) for the full event list.

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

### 3.4 Register the routes, then configure the webhook in Stripe

Register the routes in `server/src/app.ts` using the snippet from section 3.1: import both exports from `billing.routes.ts`, mount `billingWebhookRouter` before `express.json()`, and mount `billingRoutes` alongside your other `/api/v1/...` routers.

In the Stripe Dashboard, go to Developers > Webhooks > Add endpoint, point it at `https://your-domain.com/api/v1/billing/webhook`, and subscribe to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. For local development, use the Stripe CLI instead (see section 5).

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
          <p className="text-sm text-muted-foreground">Unlimited tasks, full planner range, and integrations. You will be redirected to Stripe to complete payment.</p>
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

1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run `stripe login`.
2. Start your server (`npm run dev` in `server/`), then in another terminal run:

   ```bash
   stripe listen --forward-to localhost:8000/api/v1/billing/webhook
   ```

3. The CLI prints a webhook signing secret like `whsec_...`. Copy it into `STRIPE_WEBHOOK_SECRET` in `server/.env` and restart the server.
4. Log into the Zenith app, go to `/billing`, click "Upgrade to Pro". You will land on a Stripe-hosted Checkout page.
5. Pay with a [Stripe test card](https://docs.stripe.com/testing), for example `4242 4242 4242 4242`, any future expiry date, any CVC.
6. Watch the `stripe listen` terminal: it should show `checkout.session.completed` forwarded with a `200` response from your server.
7. Confirm the plan flipped in Mongo:

   ```bash
   mongosh "mongodb://localhost:27017/zenith" --eval "db.users.findOne({ email: 'you@example.com' }, { plan: 1 })"
   ```

   `plan` should now read `"pro"`.
8. To test cancellation, trigger it manually with `stripe trigger customer.subscription.deleted` and confirm `plan` flips back to `"free"`.

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Webhook returns 400 "Invalid webhook signature" | The route is going through `express.json()` before reaching the handler | Confirm `webhookRouter` is mounted with `express.raw()` and mounted before `app.use(express.json())` in `app.ts` |
| No events show up in the `stripe listen` terminal | Wrong port/path, or server not running | Check the `--forward-to` URL matches your local server port and the `/api/v1/billing/webhook` path exactly |
| Checkout works but `plan` never changes in Mongo | Webhook handler is not matching the user (bad `metadata.userId` or missing `stripeCustomerId` lookup) | Log `event.type` and the raw event payload, confirm the id you are querying by actually exists on the `User` document |
| Works locally but not in production | Using the test webhook secret from the CLI instead of the one from your Dashboard endpoint | Create a webhook endpoint in Stripe Dashboard for your production URL and use its own signing secret in production `STRIPE_WEBHOOK_SECRET` |
| "Billing is not configured" 503 error | Missing one of `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | Double check `server/.env` has all three set and the server was restarted after adding them |

For anything beyond this minimal flow (proration, the customer billing portal, multiple price tiers, invoices), see the [Stripe Billing docs](https://docs.stripe.com/billing) and [Stripe Checkout docs](https://docs.stripe.com/payments/checkout).
