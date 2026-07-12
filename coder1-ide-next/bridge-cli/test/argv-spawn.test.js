/**
 * Phase 4 regression test: the argv execution path must spawn `claude` with
 * shell:false and pass every argument VERBATIM — no shell interpretation — even
 * when a prompt contains $(), ;, backticks, quotes, or newlines.
 *
 * We stub child_process.spawn before requiring the executor, run the argv path,
 * and assert on the captured (executable, args, opts).
 *
 * Plain Node (no jest):  node bridge-cli/test/argv-spawn.test.js
 */
const assert = require('assert');
const path = require('path');
const Module = require('module');

// ---- stub child_process.spawn ------------------------------------------------
const captured = [];
const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'child_process') {
    return {
      spawn(cmd, args, opts) {
        captured.push({ cmd, args, opts });
        // Minimal fake child process the executor can attach listeners to.
        const { EventEmitter } = require('events');
        const cp = new EventEmitter();
        cp.stdout = new EventEmitter();
        cp.stderr = new EventEmitter();
        cp.stdin = { write() {}, end() {} };
        cp.kill = () => {};
        cp.pid = 4242;
        // Exit cleanly on next tick so the executor's promise resolves.
        setImmediate(() => {
          cp.stdout.emit('data', Buffer.from('ok'));
          cp.emit('close', 0, null);
        });
        return cp;
      }
    };
  }
  // node-pty may be absent in this environment — let the executor handle that.
  return realLoad.apply(this, arguments);
};

const ClaudeExecutor = require(path.join(__dirname, '..', 'src', 'claude-executor.js'));
Module._load = realLoad; // restore

(async () => {
  const exec = new ClaudeExecutor();
  // Pin a fake resolved path so we assert on it deterministically.
  exec.claudePath = '/opt/claude/bin/claude';

  const nastyPrompt = 'Summarize: $(rm -rf ~); `whoami`; a "quoted" and \'single\' line\nsecond line';
  const argv = ['--print', '--output-format', 'json', nastyPrompt];

  await exec.executeNonInteractive(null, { argv, commandId: 'c1' });

  assert.strictEqual(captured.length, 1, 'expected exactly one spawn');
  const { cmd, args, opts } = captured[0];

  // 1. Spawns the claude binary directly, NOT /bin/sh.
  assert.strictEqual(cmd, '/opt/claude/bin/claude', 'must spawn claude binary directly');
  // 2. shell:false — no shell interpretation.
  assert.strictEqual(opts.shell, false, 'must spawn with shell:false');
  // 3. The dangerous prompt is passed as a single, byte-identical argv element.
  assert.ok(args.includes(nastyPrompt), 'prompt must be passed verbatim as one arg');
  const promptArg = args[args.length - 1];
  assert.strictEqual(promptArg, nastyPrompt, 'last arg must equal the exact prompt');
  // 4. No element was split on the shell metacharacters.
  assert.ok(!args.includes('rm'), 'command substitution must NOT have been split into args');
  assert.ok(!args.includes('whoami'), 'backtick content must NOT have been split into args');

  // 5. --model injection happens as array elements, still verbatim prompt.
  captured.length = 0;
  await exec.executeNonInteractive(null, {
    argv: ['--print', nastyPrompt],
    context: { selectedClaudeModel: 'claude-sonnet-4-6-20250514' },
    commandId: 'c2'
  });
  const second = captured[0];
  const mi = second.args.indexOf('--model');
  assert.ok(mi !== -1, '--model should be injected');
  assert.strictEqual(second.args[mi + 1], 'claude-sonnet-4-6-20250514', 'model value correct');
  assert.ok(second.args.includes(nastyPrompt), 'prompt still verbatim after model injection');

  console.log('argv spawn path: all cases passed');
  // The executor keeps handles open (logger); exit explicitly so this is CI-safe.
  process.exit(0);
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
