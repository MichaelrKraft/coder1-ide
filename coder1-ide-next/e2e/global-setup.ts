/**
 * global-setup.ts
 *
 * Runs once before all tests. Mints a JWT directly using the app's JWT_SECRET
 * and injects it as the auth-token cookie — bypassing OAuth entirely.
 *
 * Requires JWT_SECRET in .env.local (already set for this project).
 * Reads user info from the local auth.db to find a real userId.
 *
 * The saved state is written to e2e/.auth/user.json.
 * Add e2e/.auth/ to .gitignore.
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Load JWT_SECRET from .env.local
function loadJwtSecret(): string {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const contents = fs.readFileSync(envPath, 'utf-8');
    const match = contents.match(/^JWT_SECRET=(.+)$/m);
    if (match) return match[1].trim();
  }
  throw new Error('JWT_SECRET not found in .env.local — cannot mint test token');
}

async function globalSetup(_config: FullConfig): Promise<void> {
  const jwtSecret = loadJwtSecret();

  // Use mike@coder1.dev — the primary dev account in auth.db
  const testUser = {
    userId: '1bb57b6fc9c133504a02674b3c7d43d6',
    email: 'mike@coder1.dev',
    username: 'mike',
    subscriptionTier: 'free',
  };

  // Mint a 7-day token (long enough to not expire mid-test-run)
  const token = jwt.sign(testUser, jwtSecret, { expiresIn: '7d' });

  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Inject auth-token cookie directly — no OAuth flow needed
  await context.addCookies([
    {
      name: 'auth-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Verify the cookie works by hitting the Agent Hub
  const page = await context.newPage();
  await page.goto('http://localhost:3001/ide/agent-hub');

  // Should NOT be redirected to /login — if it is, auth injection failed
  if (page.url().includes('/login')) {
    throw new Error(
      'Auth cookie injection failed — server redirected to /login.\n' +
      'Check that JWT_SECRET in .env.local matches the running server.'
    );
  }

  // Save storage state with the injected cookie for all tests
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  await context.storageState({ path: path.join(authDir, 'user.json') });

  await browser.close();

  console.log('✓ Auth setup complete — logged in as mike@coder1.dev');
}

export default globalSetup;
