# Stripe Integration Guide

## Purpose

Implement PCI-compliant payment processing with Stripe. This skill covers checkout systems, subscriptions, webhooks, customer management, and refunds for building production-ready payment functionality.

## When to Use This Skill

- Adding payment processing to an application
- Implementing subscription billing
- Setting up Stripe webhooks
- Managing customer payment methods
- Handling refunds and disputes
- Ensuring PCI compliance

---

## Quick Reference

| Approach | Best For | PCI Burden |
|----------|----------|------------|
| Checkout Sessions | Quick implementation | Minimal |
| Payment Intents | Custom UI | Low (tokenization) |
| Stripe Elements | Embedded forms | Low |

---

## Implementation Approaches

### Checkout Sessions (Hosted - Recommended)

Use Stripe-hosted payment pages for minimal PCI compliance burden.

```javascript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'Product Name' },
      unit_amount: 2000, // $20.00 in cents
    },
    quantity: 1,
  }],
  mode: 'payment', // or 'subscription'
  success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://example.com/cancel',
});
```

### Payment Intents (Custom UI)

For full control over payment UI while maintaining compliance.

```javascript
// Server: Create PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  automatic_payment_methods: { enabled: true },
});

// Client: Confirm with Stripe.js
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://example.com/complete',
  },
});
```

---

## Subscription Architecture

### Four Core Components

| Component | Purpose |
|-----------|---------|
| **Products** | What you're selling |
| **Prices** | Cost and billing frequency |
| **Subscriptions** | Customer's recurring payment |
| **Invoices** | Billing cycle records |

### Creating a Subscription

```javascript
const customer = await stripe.customers.create({
  email: 'customer@example.com',
  payment_method: 'pm_card_visa',
  invoice_settings: { default_payment_method: 'pm_card_visa' },
});

const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: 'price_xxx' }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent'],
});
```

### Subscription Statuses

| Status | Meaning |
|--------|---------|
| `active` | Payment successful, access granted |
| `past_due` | Payment failed, retrying |
| `canceled` | Subscription ended |
| `incomplete` | Initial payment pending |
| `trialing` | In trial period |

---

## Webhook Handling

### Critical Events to Handle

| Event | When to Handle |
|-------|----------------|
| `payment_intent.succeeded` | Payment completed |
| `payment_intent.payment_failed` | Payment failed |
| `customer.subscription.updated` | Subscription changed |
| `customer.subscription.deleted` | Subscription canceled |
| `invoice.payment_succeeded` | Invoice paid |
| `invoice.payment_failed` | Invoice payment failed |

### Webhook Implementation

```javascript
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
    }

    res.json({ received: true });
  }
);
```

### Webhook Security

1. **Always verify signatures**: Use `stripe.webhooks.constructEvent()`
2. **Process idempotently**: Handle duplicate events gracefully
3. **Return 200 quickly**: Process async if needed

---

## Error Handling

### Common Error Types

| Error Type | Cause | Action |
|------------|-------|--------|
| `card_error` | Card declined | Show user-friendly message |
| `validation_error` | Invalid parameters | Fix request data |
| `authentication_error` | Invalid API key | Check credentials |
| `rate_limit_error` | Too many requests | Implement backoff |

### Error Handling Pattern

```javascript
try {
  const paymentIntent = await stripe.paymentIntents.create({...});
} catch (error) {
  switch (error.type) {
    case 'StripeCardError':
      return { error: error.message };
    case 'StripeRateLimitError':
      await sleep(1000);
      return retry();
    default:
      console.error('Unexpected error:', error);
  }
}
```

---

## Security Best Practices

### PCI Compliance

| Do | Don't |
|----|-------|
| Use Stripe.js for card collection | Process raw card data server-side |
| Use Checkout Sessions when possible | Store card numbers in your database |
| Implement 3D Secure/SCA | Skip authentication for EU customers |
| Use test keys for development | Use live keys in development |

---

## Testing

### Test Card Numbers

| Card | Number | Behavior |
|------|--------|----------|
| Success | 4242424242424242 | Always succeeds |
| Decline | 4000000000000002 | Generic decline |
| 3D Secure | 4000002500003155 | Requires authentication |
| Insufficient | 4000000000009995 | Insufficient funds |

### Test Webhook Events

```bash
stripe listen --forward-to localhost:3000/webhook
stripe trigger payment_intent.succeeded
```

---

## Environment Setup

### Required Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Initialize Stripe

```javascript
// Server-side
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Client-side (React)
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

---

## Best Practices Summary

1. **Use Checkout Sessions** for fastest, most secure implementation
2. **Always verify webhook signatures** before processing
3. **Handle events idempotently** to prevent duplicate processing
4. **Use test keys extensively** before going live
5. **Never process raw card data** on your servers
6. **Implement 3D Secure** for European compliance
7. **Store only necessary data** (customer ID, not card details)
8. **Log transaction IDs** for debugging and support
9. **Implement proper error handling** with user-friendly messages
10. **Test all failure scenarios** before production deployment
