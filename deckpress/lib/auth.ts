/**
 * Dashboard auth: single-founder, single password check against env var.
 * This is intentionally simple — Deckpress is a one-founder tool in its
 * Coder1 flagship form. Multi-tenant auth is deferred to productization.
 */

export function checkDashboardAuth(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  return password === expected;
}
