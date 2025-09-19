// Stub module for browser-only libraries during SSR
// This prevents "self is not defined" errors

module.exports = {};
module.exports.default = {};
module.exports.Terminal = class Terminal {
  constructor() {}
  open() {}
  write() {}
  writeln() {}
  clear() {}
  dispose() {}
  loadAddon() {}
  onData() {}
  onResize() {}
  onKey() {}
};
module.exports.FitAddon = class FitAddon {
  constructor() {}
  fit() {}
  dispose() {}
};