/**
 * Jest Test Setup Configuration
 * Global setup for all test files
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Global polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock ResizeObserver (used by terminal and monaco editor)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver (used by various components)
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo (used by terminal and other scrolling components)
global.scrollTo = jest.fn();
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

// Mock getComputedStyle (used by styling calculations)
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Mock performance.now (used by performance measurements)
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(),
    getEntriesByType: jest.fn(),
  },
});

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage,
  writable: true,
});

// Mock URL.createObjectURL (used by file downloads)
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-blob-url'),
  writable: true,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock crypto.randomUUID (used for ID generation)
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Override console.error to suppress expected errors in tests
console.error = (...args: any[]) => {
  const message = args[0];
  
  // Suppress known testing-related errors
  if (
    typeof message === 'string' &&
    (
      message.includes('Warning: ReactDOM.render is deprecated') ||
      message.includes('Warning: validateDOMNesting') ||
      message.includes('Warning: React.createFactory') ||
      message.includes('act() warning')
    )
  ) {
    return;
  }
  
  originalConsoleError(...args);
};

// Override console.warn to suppress expected warnings in tests
console.warn = (...args: any[]) => {
  const message = args[0];
  
  // Suppress known testing-related warnings
  if (
    typeof message === 'string' &&
    (
      message.includes('componentWillMount') ||
      message.includes('componentWillReceiveProps') ||
      message.includes('componentWillUpdate')
    )
  ) {
    return;
  }
  
  originalConsoleWarn(...args);
};

// Mock WebSocket for socket.io testing
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock process.env for consistent testing environment
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3001';

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithObjectContaining(received: jest.Mock, expected: object) {
    const calls = received.mock.calls;
    const pass = calls.some(call => 
      call.some(arg => 
        typeof arg === 'object' && 
        Object.keys(expected).every(key => 
          arg[key] === expected[key as keyof typeof expected]
        )
      )
    );
    
    if (pass) {
      return {
        message: () => `expected function not to have been called with object containing ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected function to have been called with object containing ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  }
});

// Increase timeout for async operations in tests
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset localStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Clean up any timers
  jest.clearAllTimers();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress specific warnings that are expected in test environment
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An invalid form control')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});