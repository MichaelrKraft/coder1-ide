/**
 * Test Utilities and Helpers
 * Common functions for testing components and APIs
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SessionProvider } from '@/contexts/SessionContext';
import { SupervisionProvider } from '@/contexts/SupervisionContext';

// Mock data generators
export const mockSession = (overrides: Partial<any> = {}) => ({
  id: 'test-session-' + Math.random().toString(36).substr(2, 9),
  name: 'Test Session',
  status: 'active',
  createdAt: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  filesCount: 0,
  commandsCount: 0,
  ...overrides
});

export const mockTerminalHistory = (count: number = 5) => {
  const commands = [
    'npm start',
    'git status',
    'ls -la',
    'npm test',
    'git commit -m "test commit"',
    'npm run build',
    'git push origin main',
    'docker build -t app .',
    'kubectl apply -f deployment.yml',
    'curl -X GET http://localhost:3001/api/health'
  ];
  
  return Array.from({ length: count }, (_, i) => 
    commands[i % commands.length] + (i > commands.length ? ` # ${i}` : '')
  );
};

export const mockFileTree = () => ({
  name: 'project',
  type: 'directory',
  children: [
    {
      name: 'src',
      type: 'directory',
      children: [
        { name: 'App.tsx', type: 'file', size: 1024 },
        { name: 'index.tsx', type: 'file', size: 512 },
        {
          name: 'components',
          type: 'directory', 
          children: [
            { name: 'Button.tsx', type: 'file', size: 256 },
            { name: 'Input.tsx', type: 'file', size: 384 }
          ]
        }
      ]
    },
    { name: 'package.json', type: 'file', size: 2048 },
    { name: 'README.md', type: 'file', size: 1536 }
  ]
});

// Provider wrapper for testing
interface AllProvidersProps {
  children: React.ReactNode;
  sessionValue?: any;
  supervisionValue?: any;
}

const AllProviders: React.FC<AllProvidersProps> = ({ 
  children, 
  sessionValue,
  supervisionValue 
}) => {
  const defaultSessionValue = {
    sessions: [mockSession()],
    currentSession: mockSession(),
    createSession: jest.fn(),
    switchSession: jest.fn(),
    renameSession: jest.fn(),
    deleteSession: jest.fn()
  };

  const defaultSupervisionValue = {
    isSupervising: false,
    startSupervision: jest.fn(),
    stopSupervision: jest.fn()
  };

  return (
    <SessionProvider value={sessionValue || defaultSessionValue}>
      <SupervisionProvider value={supervisionValue || defaultSupervisionValue}>
        {children}
      </SupervisionProvider>
    </SessionProvider>
  );
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  sessionValue?: any;
  supervisionValue?: any;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { sessionValue, supervisionValue, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllProviders sessionValue={sessionValue} supervisionValue={supervisionValue}>
      {children}
    </AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// API mocking utilities
export const mockFetchResponse = (data: any, ok: boolean = true, status: number = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  });
};

export const mockSocketIO = () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true,
  disconnect: jest.fn(),
  connect: jest.fn()
});

// Performance measurement utilities
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  await new Promise(resolve => {
    renderFn();
    requestAnimationFrame(resolve);
  });
  return performance.now() - start;
};

export const measureAsyncOperation = async (operation: () => Promise<any>): Promise<{
  result: any;
  duration: number;
}> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  
  return { result, duration };
};

// Memory monitoring utilities
export const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      limit: (performance as any).memory.jsHeapSizeLimit
    };
  }
  return null;
};

export const detectMemoryLeak = async (operation: () => Promise<void>, iterations: number = 10) => {
  const measurements: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    await operation();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const memory = getMemoryUsage();
    if (memory) {
      measurements.push(memory.used);
    }
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Calculate memory growth trend
  const initialMemory = measurements[0];
  const finalMemory = measurements[measurements.length - 1];
  const growthPercentage = ((finalMemory - initialMemory) / initialMemory) * 100;
  
  return {
    measurements,
    initialMemory,
    finalMemory,
    growthPercentage,
    isLeak: growthPercentage > 50 // Consider >50% growth as potential leak
  };
};

// Test data validation utilities
export const validateSessionData = (session: any) => {
  const required = ['id', 'name', 'status', 'createdAt'];
  const missing = required.filter(field => !session[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (!['active', 'inactive', 'archived'].includes(session.status)) {
    throw new Error(`Invalid status: ${session.status}`);
  }
  
  if (isNaN(Date.parse(session.createdAt))) {
    throw new Error(`Invalid createdAt date: ${session.createdAt}`);
  }
  
  return true;
};

export const validateApiResponse = (response: any, expectedSchema: any) => {
  const validateField = (obj: any, schema: any, path: string = '') => {
    for (const [key, type] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj)) {
        throw new Error(`Missing field: ${fieldPath}`);
      }
      
      if (typeof type === 'string') {
        if (typeof obj[key] !== type) {
          throw new Error(`Invalid type for ${fieldPath}: expected ${type}, got ${typeof obj[key]}`);
        }
      } else if (typeof type === 'object') {
        validateField(obj[key], type, fieldPath);
      }
    }
  };
  
  validateField(response, expectedSchema);
  return true;
};

// Test environment utilities
export const setupTestEnvironment = () => {
  // Mock ResizeObserver
  if (!global.ResizeObserver) {
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }
  
  // Mock IntersectionObserver
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }
  
  // Mock matchMedia
  if (!window.matchMedia) {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  }
  
  // Mock scrollTo
  if (!window.scrollTo) {
    window.scrollTo = jest.fn();
  }
};

// Cleanup utilities
export const cleanupAfterTest = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear timers
  jest.clearAllTimers();
  
  // Clear localStorage
  if (global.localStorage) {
    localStorage.clear();
  }
  
  // Clear sessionStorage
  if (global.sessionStorage) {
    sessionStorage.clear();
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
};

// Export everything
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';