import type { DeckConfig } from '@/content/deck.config';

/**
 * Serializes a DeckConfig into a browser-loadable JS file that sets
 * `window.DECK_CONFIG`. Used at build time by scripts/build-deck-config.ts
 * to produce `public/deck/js/config.js`.
 *
 * We use JSON.stringify (not JSON5, not a custom serializer) because:
 * - JSON.stringify handles escaping of quotes, backslashes, newlines
 *   correctly for any string content.
 * - The output is safe to wrap in a JS assignment (no code injection
 *   because all values are data, never expressions).
 *
 * Functions cannot be serialized; the roi formula is stored as source
 * string in `formulaSource` and deserialized at runtime in roi.js.
 */
export function serializeConfigToJs(config: DeckConfig): string {
  const json = JSON.stringify(config, null, 2);
  return `window.DECK_CONFIG = ${json};\n`;
}
