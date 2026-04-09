import '@testing-library/jest-dom';

// Set dummy env vars so lib/kv.ts's KV_CONFIGURED guard takes the
// real @vercel/kv path (which is mocked in tests) instead of the
// in-memory fallback used in local dev.
process.env.KV_REST_API_URL = 'http://test.kv.local';
process.env.KV_REST_API_TOKEN = 'test-token';

// Telegram helpers also gate on env presence — set for route tests.
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.TELEGRAM_CHAT_ID = 'test-chat-id';

// Dashboard auth
process.env.DASHBOARD_PASSWORD = 'test-password';
