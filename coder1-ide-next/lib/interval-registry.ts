/**
 * Server-side IntervalRegistry singleton.
 * Tracks named setInterval handles so they can be cleared on shutdown.
 */
const registry = new Map<string, ReturnType<typeof setInterval>>();

export const IntervalRegistry = {
  register(name: string, interval: ReturnType<typeof setInterval>): void {
    if (registry.has(name)) {
      clearInterval(registry.get(name)!);
    }
    registry.set(name, interval);
  },

  clear(name: string): void {
    const id = registry.get(name);
    if (id) {
      clearInterval(id);
      registry.delete(name);
    }
  },

  clearAll(): void {
    registry.forEach(id => clearInterval(id));
    registry.clear();
    console.log('[IntervalRegistry] All intervals cleared');
  },

  size(): number {
    return registry.size;
  },
};

// Auto-clear on process exit
process.once('exit', () => IntervalRegistry.clearAll());
process.once('SIGINT', () => { IntervalRegistry.clearAll(); process.exit(0); });
process.once('SIGTERM', () => { IntervalRegistry.clearAll(); process.exit(0); });
