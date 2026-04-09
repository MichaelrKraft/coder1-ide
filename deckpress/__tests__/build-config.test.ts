import { describe, it, expect } from 'vitest';
import { serializeConfigToJs } from '@/lib/build-config';
import type { DeckConfig } from '@/content/deck.config';

const minimalConfig: DeckConfig = {
  company: 'Test Co',
  tagline: 'Test tagline',
  hero: {
    heading: ['Hello', 'World'],
    founderCutout: {
      enabled: false,
      videoPath: '/x.webm',
      fallbackImage: '/x.jpg',
      playByDefault: false,
    },
  },
  sections: [],
  marquee: { text: 'TEST', fontSize: '10vw', speed: -20 },
  features: { roiCalculator: false, feedbackBox: true, chatWidget: true, analytics: true },
  roiCalculator: {
    insertAfter: 'market',
    defaults: { developers: 1, hoursSavedPerWeek: 1, costPerHour: 1 },
    formulaSource: '(d, h, c) => d * h * c * 52',
  },
  founder: { name: 'Test Founder', title: 'CEO' },
  productDemoFrames: 0,
};

describe('serializeConfigToJs', () => {
  it('produces a window.DECK_CONFIG assignment', () => {
    const output = serializeConfigToJs(minimalConfig);
    expect(output).toContain('window.DECK_CONFIG');
    expect(output.trim().endsWith(';')).toBe(true);
  });

  it('serializes the company field as JSON-escaped string', () => {
    const output = serializeConfigToJs(minimalConfig);
    expect(output).toContain('"company": "Test Co"');
  });

  it('serializes nested hero heading array', () => {
    const output = serializeConfigToJs(minimalConfig);
    expect(output).toContain('"Hello"');
    expect(output).toContain('"World"');
  });

  it('output is valid JavaScript when evaluated', () => {
    const output = serializeConfigToJs(minimalConfig);
    // Simulate a browser-like context so window.DECK_CONFIG sticks
    const fakeWindow: Record<string, unknown> = {};
    // eslint-disable-next-line no-new-func
    new Function('window', output)(fakeWindow);
    expect(fakeWindow.DECK_CONFIG).toBeDefined();
    expect((fakeWindow.DECK_CONFIG as DeckConfig).company).toBe('Test Co');
  });

  it('escapes quotes in content strings to keep JS valid', () => {
    const configWithQuotes: DeckConfig = {
      ...minimalConfig,
      tagline: 'She said "hi"',
    };
    const output = serializeConfigToJs(configWithQuotes);
    const fakeWindow: Record<string, unknown> = {};
    // eslint-disable-next-line no-new-func
    new Function('window', output)(fakeWindow);
    expect((fakeWindow.DECK_CONFIG as DeckConfig).tagline).toBe('She said "hi"');
  });
});
