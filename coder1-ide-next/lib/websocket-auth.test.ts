/**
 * Regression tests for the 2026-09-12 guest-fallback exposure: a socket that
 * presented no ticket used to be admitted as 'guest' with terminal permission.
 * server.js loads the .js module; the .ts module is the typed twin. Both must
 * fail closed.
 */
const jsModule = require('./websocket-auth.js');
const tsModule = require('./websocket-auth.ts');

type NextFn = (err?: Error) => void;

function makeSocket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sock_1',
    handshake: { auth: {} },
    nsp: { name: '/' },
    ...overrides
  } as Record<string, unknown> & { authenticated?: boolean; userId?: string; permissions?: string[] };
}

function run(middleware: (socket: unknown, next: NextFn) => void, socket: unknown): Error | undefined {
  let result: Error | undefined;
  middleware(socket, (err?: Error) => { result = err; });
  return result;
}

describe.each([
  ['websocket-auth.js', jsModule],
  ['websocket-auth.ts', tsModule]
])('%s createSocketAuthMiddleware (sec-2026-09-12)', (_name, mod) => {
  const middleware = mod.createSocketAuthMiddleware();
  const manager = mod.wsAuthManager;

  it('rejects a socket with no ticket instead of admitting it as guest', () => {
    const socket = makeSocket();
    const err = run(middleware, socket);
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toMatch(/Authentication required/);
    expect(socket.authenticated).not.toBe(true);
    expect(socket.userId).toBeUndefined();
    expect(socket.permissions).toBeUndefined();
  });

  it('rejects an unknown ticket', () => {
    const socket = makeSocket({ handshake: { auth: { ticketId: 'not-a-real-ticket' } } });
    const err = run(middleware, socket);
    expect(err).toBeInstanceOf(Error);
    expect(socket.authenticated).not.toBe(true);
  });

  it('admits a socket presenting a valid single-use ticket and binds the ticket userId', () => {
    const ticket = manager.generateTicket('user_a', 'session_1', false, ['terminal', 'files']);
    const socket = makeSocket({ handshake: { auth: { ticketId: ticket.ticketId } } });
    const err = run(middleware, socket);
    expect(err).toBeUndefined();
    expect(socket.authenticated).toBe(true);
    expect(socket.userId).toBe('user_a');
    expect(socket.permissions).toEqual(['terminal', 'files']);
  });

  it('does not accept the same ticket twice', () => {
    const ticket = manager.generateTicket('user_a', 'session_2', false, ['terminal']);
    const first = makeSocket({ handshake: { auth: { ticketId: ticket.ticketId } } });
    expect(run(middleware, first)).toBeUndefined();
    const second = makeSocket({ handshake: { auth: { ticketId: ticket.ticketId } } });
    expect(run(middleware, second)).toBeInstanceOf(Error);
  });

  it('exempts the /bridge namespace, which has its own JWT middleware', () => {
    const socket = makeSocket({ nsp: { name: '/bridge' } });
    expect(run(middleware, socket)).toBeUndefined();
  });
});
