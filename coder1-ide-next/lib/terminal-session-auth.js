/**
 * Terminal session authorization helpers (server-side).
 *
 * SECURITY (Sep 12, 2026): extracted from server.js so the rules that decide
 * who may open or touch a server-side PTY are unit-testable.
 */

const HOSTED_TERMINALS_DISABLED_MESSAGE =
  'Hosted terminals are disabled on this server. Connect the Coder1 Bridge to run Claude Code on your own machine.';

/**
 * Server-side PTYs are opt-in. The Bridge is the security boundary; a shell on
 * this host must never be reachable by default. Only the literal string 'true'
 * enables it.
 */
function isHostedTerminalsEnabled(env = process.env) {
  return env.HOSTED_TERMINALS_ENABLED === 'true';
}

/**
 * A terminal session belongs to the authenticated user who created it. Any
 * socket that is unauthenticated, or authenticated as a different user, is
 * denied. Session ids are client-supplied, so this is the only thing that
 * prevents attach-by-guess.
 */
function socketOwnsSession(socket, session) {
  if (!socket || !session) return false;
  if (socket.authenticated !== true || !socket.userId) return false;
  return session.userId === socket.userId;
}

module.exports = {
  HOSTED_TERMINALS_DISABLED_MESSAGE,
  isHostedTerminalsEnabled,
  socketOwnsSession
};
