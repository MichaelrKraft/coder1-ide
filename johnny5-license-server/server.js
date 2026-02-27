'use strict';

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const db = require('./db');
const { sendLicenseEmail } = require('./email');

const PORT = process.env.PORT || 4000;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const app = express();

// Initialize DB on startup
db.initDb();

// ─── Middleware ───────────────────────────────────────────────────────────────

// Webhook needs raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));
// All other routes use JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3002',
    'https://johnny5.ai',
    'https://www.johnny5.ai'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      const sessionId = session.id;

      // Idempotency: skip if we already processed this session
      const existing = db.getLicenseBySession(sessionId);
      if (existing) {
        console.log(`[webhook] Session ${sessionId} already processed, skipping.`);
        return res.json({ received: true });
      }

      const key = db.createLicense(email, sessionId);
      console.log(`[webhook] License created for ${email}: ${key}`);
      await sendLicenseEmail(email, key);
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const email = charge.billing_details?.email;
      const sessionId = charge.payment_intent;

      // Try to find license by session or by email
      let license = sessionId ? db.getLicenseBySession(sessionId) : null;
      if (!license && email) {
        const byEmail = db.getLicenseByEmail(email);
        license = byEmail && byEmail[0];
      }

      if (license) {
        db.revokeLicense(license.id);
        console.log(`[webhook] License revoked for ${email}: ${license.id}`);
      } else {
        console.warn(`[webhook] Could not find license to revoke for charge ${charge.id}`);
      }
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err);
  }

  // Always return 200 so Stripe does not retry
  res.json({ received: true });
});

// ─── License Routes ───────────────────────────────────────────────────────────

app.post('/validate', (req, res) => {
  const { key } = req.body;
  if (!key) return res.json({ valid: false });

  const license = db.getLicense(key);
  if (!license) return res.json({ valid: false });
  if (license.revoked) return res.json({ valid: false, revoked: true });

  res.json({ valid: true });
});

app.post('/activate', (req, res) => {
  const { key, machine_id, hostname } = req.body;
  if (!key || !machine_id) {
    return res.status(400).json({ success: false, error: 'key and machine_id are required' });
  }

  const license = db.getLicense(key);
  if (!license) return res.json({ success: false, error: 'Invalid license key', errorCode: 'invalid_key' });
  if (license.revoked) return res.json({ success: false, error: 'License has been revoked', errorCode: 'revoked' });

  const activations = db.getActivations(license.id);
  const alreadyActivated = activations.some((a) => a.machine_id === machine_id);

  if (!alreadyActivated && activations.length >= 2) {
    return res.json({ success: false, error: 'Maximum machines reached (2)', errorCode: 'max_machines' });
  }

  db.addActivation(license.id, machine_id, hostname);
  db.markFirstActivated(license.id);

  res.json({ success: true });
});

app.post('/deactivate', (req, res) => {
  const { key, machine_id } = req.body;
  if (!key || !machine_id) {
    return res.status(400).json({ success: false, error: 'key and machine_id are required' });
  }

  const license = db.getLicense(key);
  if (!license) return res.json({ success: false, error: 'Invalid license key' });

  db.removeActivation(license.id, machine_id);
  res.json({ success: true });
});

app.post('/recover', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'email is required' });

  const licenses = db.getLicenseByEmail(email);
  if (!licenses || licenses.length === 0) {
    return res.json({ success: false, message: 'No license found for that email.' });
  }

  for (const license of licenses) {
    if (!license.revoked) {
      await sendLicenseEmail(email, license.id);
    }
  }

  res.json({ success: true, message: 'Key sent to your email.' });
});

// ─── HTML Pages ───────────────────────────────────────────────────────────────

app.get('/resend', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Recover Johnny5 License</title>
  <style>
    body { font-family: monospace; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 22px; }
    label { display: block; margin-top: 16px; font-size: 14px; color: #555; }
    input { display: block; width: 100%; box-sizing: border-box; padding: 10px; margin-top: 6px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; }
    button { margin-top: 20px; padding: 10px 24px; font-size: 15px; background: #0070f3; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #005ad1; }
  </style>
</head>
<body>
  <h1>Recover Your Johnny5 License</h1>
  <p>Enter the email address you used to purchase Johnny5 and we'll resend your license key.</p>
  <form method="POST" action="/recover">
    <label for="email">Email Address</label>
    <input type="email" id="email" name="email" required placeholder="you@example.com">
    <button type="submit">Send My Key</button>
  </form>
</body>
</html>`);
});

app.get('/manage', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Manage Johnny5 License</title>
  <style>
    body { font-family: monospace; max-width: 520px; margin: 80px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 22px; }
    label { display: block; margin-top: 16px; font-size: 14px; color: #555; }
    input { display: block; width: 100%; box-sizing: border-box; padding: 10px; margin-top: 6px; font-size: 15px; border: 1px solid #ccc; border-radius: 4px; }
    button { margin-top: 20px; padding: 10px 24px; font-size: 15px; background: #c00; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #a00; }
    p.note { font-size: 13px; color: #888; }
  </style>
</head>
<body>
  <h1>Deactivate a Machine</h1>
  <p>Remove a machine slot from your license so you can activate on a new machine.</p>
  <form method="POST" action="/deactivate">
    <label for="key">License Key</label>
    <input type="text" id="key" name="key" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
    <label for="machine_id">Machine ID</label>
    <input type="text" id="machine_id" name="machine_id" required placeholder="Run: johnny5 machine-id">
    <button type="submit">Deactivate Machine</button>
  </form>
  <p class="note">To find your machine ID, run <code>johnny5 machine-id</code> in your terminal.</p>
</body>
</html>`);
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Johnny5 license server running on port ${PORT}`);
});
