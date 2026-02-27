'use strict';

const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@johnny5.ai';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function getResend() {
  if (!RESEND_API_KEY) return null;
  const { Resend } = require('resend');
  return new Resend(RESEND_API_KEY);
}

async function sendEmail({ to, subject, html }) {
  const resend = getResend();

  if (!resend) {
    console.log('[email:dev] Would send email:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body (truncated): ${html.slice(0, 200)}...`);
    return;
  }

  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

async function sendLicenseEmail(email, key) {
  const subject = 'Your Johnny5 License Key — Number 5 is alive!';
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: monospace; max-width: 600px; margin: 40px auto; color: #1a1a1a; line-height: 1.6;">
  <h1 style="font-size: 24px; margin-bottom: 4px;">Number 5 is alive! 🤖</h1>
  <p style="color: #555; margin-top: 0;">Thanks for purchasing Johnny5 — your AI agent is ready to roll.</p>

  <hr style="border: 1px solid #e0e0e0; margin: 24px 0;">

  <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #555;">Your License Key</h2>
  <div style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px; padding: 16px 20px; font-size: 18px; letter-spacing: 2px; word-break: break-all;">
    <strong>${key}</strong>
  </div>
  <p style="font-size: 13px; color: #888; margin-top: 8px;">
    Works on up to <strong>2 machines</strong>. Store this email somewhere safe — it's your only recovery method.
  </p>

  <hr style="border: 1px solid #e0e0e0; margin: 24px 0;">

  <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #555;">Get Started</h2>
  <p>Install Johnny5 globally, then start it with your license key:</p>
  <pre style="background: #1a1a1a; color: #f0f0f0; padding: 16px; border-radius: 6px; overflow-x: auto;">npm install -g johnny5-agent
johnny5 start --key ${key}</pre>
  <p>On subsequent runs, your key is remembered — just run <code>johnny5 start</code>.</p>

  <hr style="border: 1px solid #e0e0e0; margin: 24px 0;">

  <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #555;">Need Help?</h2>
  <p>
    Join the community on Discord: <a href="https://discord.gg/johnny5" style="color: #0070f3;">discord.gg/johnny5</a><br>
    Lost your key? Visit <a href="https://johnny5.ai/resend" style="color: #0070f3;">johnny5.ai/resend</a> and enter this email address.
  </p>

  <p style="color: #aaa; font-size: 12px; margin-top: 40px;">
    You received this because you purchased Johnny5. One-time purchase, lifetime license.
  </p>
</body>
</html>
  `.trim();

  await sendEmail({ to: email, subject, html });
}

async function sendUnactivatedEmail(email, key) {
  const subject = 'Did you get started with Johnny5?';
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: monospace; max-width: 600px; margin: 40px auto; color: #1a1a1a; line-height: 1.6;">
  <h1 style="font-size: 22px;">Hey — you haven't activated Johnny5 yet</h1>
  <p>Your license key is still unused. Here it is again:</p>
  <div style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px; padding: 16px 20px; font-size: 18px; letter-spacing: 2px; word-break: break-all;">
    <strong>${key}</strong>
  </div>
  <p>To get started:</p>
  <pre style="background: #1a1a1a; color: #f0f0f0; padding: 16px; border-radius: 6px;">npm install -g johnny5-agent
johnny5 start --key ${key}</pre>
  <p>Questions? Reply to this email or hop on <a href="https://discord.gg/johnny5" style="color: #0070f3;">Discord</a>.</p>
</body>
</html>
  `.trim();

  await sendEmail({ to: email, subject, html });
}

async function sendFeedbackEmail(email) {
  const subject = 'How is Johnny5 treating you?';
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: monospace; max-width: 600px; margin: 40px auto; color: #1a1a1a; line-height: 1.6;">
  <h1 style="font-size: 22px;">You've been running Johnny5 for a week 🎉</h1>
  <p>How's it going? We'd love to hear what's working and what isn't.</p>
  <p>
    Reply to this email — we read every response.<br>
    Or drop a note in <a href="https://discord.gg/johnny5" style="color: #0070f3;">Discord</a>.
  </p>
  <p style="color: #aaa; font-size: 12px; margin-top: 40px;">
    You're receiving this because you're a Johnny5 customer. Thanks for being here.
  </p>
</body>
</html>
  `.trim();

  await sendEmail({ to: email, subject, html });
}

module.exports = {
  sendLicenseEmail,
  sendUnactivatedEmail,
  sendFeedbackEmail,
};
