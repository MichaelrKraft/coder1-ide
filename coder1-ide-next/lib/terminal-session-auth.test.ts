/**
 * Regression tests for the 2026-09-12 hosted-terminal exposure:
 * anonymous sockets could open a PTY on the production host, and any socket
 * could attach to any session by id.
 */
const {
  isHostedTerminalsEnabled,
  socketOwnsSession,
  HOSTED_TERMINALS_DISABLED_MESSAGE
} = require('./terminal-session-auth');

describe('isHostedTerminalsEnabled (sec-2026-09-12 hosted PTY kill switch)', () => {
  it('is off when the variable is absent', () => {
    expect(isHostedTerminalsEnabled({})).toBe(false);
  });

  it('is off for anything other than the literal string "true"', () => {
    expect(isHostedTerminalsEnabled({ HOSTED_TERMINALS_ENABLED: '1' })).toBe(false);
    expect(isHostedTerminalsEnabled({ HOSTED_TERMINALS_ENABLED: 'TRUE' })).toBe(false);
    expect(isHostedTerminalsEnabled({ HOSTED_TERMINALS_ENABLED: 'yes' })).toBe(false);
  });

  it('is on only for "true"', () => {
    expect(isHostedTerminalsEnabled({ HOSTED_TERMINALS_ENABLED: 'true' })).toBe(true);
  });

  it('exposes a user-facing message that points to the Bridge', () => {
    expect(HOSTED_TERMINALS_DISABLED_MESSAGE).toMatch(/Bridge/);
  });
});

describe('socketOwnsSession (sec-2026-09-12 attach-by-guess)', () => {
  const session = { id: 'session_1', userId: 'user_a' };

  it('denies an unauthenticated socket even if it claims the right userId', () => {
    expect(socketOwnsSession({ authenticated: false, userId: 'user_a' }, session)).toBe(false);
    expect(socketOwnsSession({ userId: 'user_a' }, session)).toBe(false);
  });

  it('denies the legacy guest and alpha-user identities', () => {
    expect(socketOwnsSession({ authenticated: true, userId: 'guest' }, session)).toBe(false);
    expect(socketOwnsSession({ authenticated: true, userId: 'alpha-user' }, session)).toBe(false);
  });

  it('denies a different authenticated user', () => {
    expect(socketOwnsSession({ authenticated: true, userId: 'user_b' }, session)).toBe(false);
  });

  it('denies sessions created under the legacy "default" owner', () => {
    expect(socketOwnsSession({ authenticated: true, userId: 'default' }, { userId: 'default' })).toBe(true);
    expect(socketOwnsSession({ authenticated: true, userId: 'user_a' }, { userId: 'default' })).toBe(false);
  });

  it('allows the authenticated owner', () => {
    expect(socketOwnsSession({ authenticated: true, userId: 'user_a' }, session)).toBe(true);
  });

  it('handles missing arguments without throwing', () => {
    expect(socketOwnsSession(null, session)).toBe(false);
    expect(socketOwnsSession({ authenticated: true, userId: 'user_a' }, undefined)).toBe(false);
  });
});
