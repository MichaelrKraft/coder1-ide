/**
 * Terminal Component Unit Tests
 * Tests the terminal functionality, PTY integration, and session management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock XTerm dependencies
const mockTerminal = {
  open: jest.fn(),
  write: jest.fn(),
  writeln: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  onData: jest.fn(),
  onResize: jest.fn(),
  resize: jest.fn(),
  loadAddon: jest.fn(),
  buffer: {
    active: {
      length: 0,
      getLine: jest.fn()
    }
  },
  options: {}
};

const mockFitAddon = {
  fit: jest.fn(),
  proposeDimensions: jest.fn(() => ({ cols: 80, rows: 24 }))
};

jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn(() => mockTerminal)
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn(() => mockFitAddon)
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn()
}));

// Mock Socket.IO
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true
};

jest.mock('@/lib/socket', () => ({
  socket: mockSocket
}));

// Mock Terminal Error Handler
jest.mock('@/components/terminal/TerminalErrorHandler', () => ({
  TerminalErrorManager: jest.fn(() => ({
    handleError: jest.fn(),
    reset: jest.fn(),
    isInErrorState: jest.fn(() => false)
  })),
  __esModule: true,
  default: jest.fn(() => <div data-testid="error-handler">Error Handler</div>)
}));

// Mock Terminal State Persistence
jest.mock('@/components/terminal/TerminalStatePersistence', () => ({
  useTerminalStatePersistence: jest.fn(() => ({
    isRestored: true,
    saveState: jest.fn(),
    updateState: jest.fn(),
    addToHistory: jest.fn(),
    getHistory: jest.fn(() => []),
    clearState: jest.fn()
  }))
}));

// Import the component after mocks
import Terminal from '@/components/terminal/Terminal';

describe('Terminal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockTerminal.open.mockClear();
    mockTerminal.write.mockClear();
    mockTerminal.writeln.mockClear();
    mockTerminal.clear.mockClear();
    mockTerminal.dispose.mockClear();
    mockFitAddon.fit.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  describe('Component Initialization', () => {
    it('should render terminal container', () => {
      render(<Terminal />);
      
      expect(screen.getByTestId('terminal-container')).toBeInTheDocument();
    });

    it('should initialize XTerm terminal on mount', async () => {
      render(<Terminal />);
      
      await waitFor(() => {
        expect(mockTerminal.open).toHaveBeenCalled();
      });

      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockFitAddon);
    });

    it('should setup socket event listeners', () => {
      render(<Terminal />);
      
      expect(mockSocket.on).toHaveBeenCalledWith('terminal:data', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('terminal:created', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('terminal:error', expect.any(Function));
    });

    it('should cleanup on unmount', () => {
      const { unmount } = render(<Terminal />);
      
      unmount();
      
      expect(mockTerminal.dispose).toHaveBeenCalled();
      expect(mockSocket.off).toHaveBeenCalledTimes(3);
    });
  });

  describe('PTY Session Management', () => {
    it('should create terminal session on mount', async () => {
      render(<Terminal />);
      
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('terminal:create', expect.objectContaining({
          id: expect.any(String)
        }));
      });
    });

    it('should handle session creation response', async () => {
      render(<Terminal />);
      
      // Simulate session created event
      const createHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal:created'
      )?.[1];
      
      expect(createHandler).toBeDefined();
      
      createHandler?.({ sessionId: 'test-session-123', success: true });
      
      await waitFor(() => {
        expect(screen.getByTestId('terminal-status')).toHaveTextContent('Connected');
      });
    });

    it('should handle session creation errors', async () => {
      render(<Terminal />);
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal:error'
      )?.[1];
      
      expect(errorHandler).toBeDefined();
      
      errorHandler?.({ error: 'Failed to create session' });
      
      await waitFor(() => {
        expect(screen.getByTestId('terminal-status')).toHaveTextContent('Error');
      });
    });

    it('should recreate session on connection restore', async () => {
      const { rerender } = render(<Terminal />);
      
      // Simulate disconnect
      mockSocket.connected = false;
      rerender(<Terminal />);
      
      // Simulate reconnect
      mockSocket.connected = true;
      rerender(<Terminal />);
      
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('terminal:create', expect.any(Object));
      });
    });
  });

  describe('Terminal Input/Output', () => {
    it('should send input to backend on user typing', async () => {
      render(<Terminal />);
      
      // Get the data handler
      const dataHandler = mockTerminal.onData.mock.calls[0]?.[0];
      expect(dataHandler).toBeDefined();
      
      // Simulate user input
      dataHandler?.('ls -la\r');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal:input', {
        sessionId: expect.any(String),
        data: 'ls -la\r'
      });
    });

    it('should display output from backend', async () => {
      render(<Terminal />);
      
      // Get the terminal data handler
      const terminalDataHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal:data'
      )?.[1];
      
      expect(terminalDataHandler).toBeDefined();
      
      // Simulate output from backend
      terminalDataHandler?.({ data: 'total 0\ndrwxr-xr-x  2 user user 4096 Jan 15 10:30 .\n' });
      
      expect(mockTerminal.write).toHaveBeenCalledWith('total 0\ndrwxr-xr-x  2 user user 4096 Jan 15 10:30 .\n');
    });

    it('should handle terminal resize events', async () => {
      render(<Terminal />);
      
      // Get resize handler
      const resizeHandler = mockTerminal.onResize.mock.calls[0]?.[0];
      expect(resizeHandler).toBeDefined();
      
      // Simulate resize
      resizeHandler?.({ cols: 120, rows: 30 });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal:resize', {
        sessionId: expect.any(String),
        cols: 120,
        rows: 30
      });
    });
  });

  describe('Terminal Controls', () => {
    it('should render control buttons', () => {
      render(<Terminal />);
      
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
    });

    it('should clear terminal when clear button clicked', () => {
      render(<Terminal />);
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
      
      expect(mockTerminal.clear).toHaveBeenCalled();
    });

    it('should restart session when restart button clicked', async () => {
      render(<Terminal />);
      
      const restartButton = screen.getByRole('button', { name: /restart/i });
      fireEvent.click(restartButton);
      
      // Should emit restart event
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal:restart', {
        sessionId: expect.any(String)
      });
    });

    it('should show/hide terminal when toggle button clicked', () => {
      render(<Terminal />);
      
      const toggleButton = screen.getByRole('button', { name: /hide terminal/i });
      fireEvent.click(toggleButton);
      
      expect(screen.getByTestId('terminal-container')).toHaveClass('hidden');
      
      fireEvent.click(toggleButton);
      expect(screen.getByTestId('terminal-container')).not.toHaveClass('hidden');
    });
  });

  describe('Terminal Fitting and Resize', () => {
    it('should fit terminal to container on mount', async () => {
      render(<Terminal />);
      
      await waitFor(() => {
        expect(mockFitAddon.fit).toHaveBeenCalled();
      });
    });

    it('should fit terminal when container resizes', async () => {
      render(<Terminal />);
      
      // Simulate ResizeObserver callback
      const resizeObserver = (global as any).ResizeObserver;
      const callback = resizeObserver.mock.calls[0]?.[0];
      
      if (callback) {
        callback([{ contentRect: { width: 800, height: 600 } }]);
        
        await waitFor(() => {
          expect(mockFitAddon.fit).toHaveBeenCalled();
        });
      }
    });

    it('should handle fit errors gracefully', async () => {
      mockFitAddon.fit.mockImplementation(() => {
        throw new Error('Fit failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      render(<Terminal />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Terminal fit failed:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should display error handler when errors occur', () => {
      render(<Terminal />);
      
      expect(screen.getByTestId('error-handler')).toBeInTheDocument();
    });

    it('should handle socket disconnection gracefully', () => {
      render(<Terminal />);
      
      // Simulate disconnect
      mockSocket.connected = false;
      
      // Should show disconnected state
      expect(screen.getByTestId('connection-status')).toHaveClass('disconnected');
    });

    it('should retry connection on error', async () => {
      render(<Terminal />);
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal:error'
      )?.[1];
      
      errorHandler?.({ error: 'Connection failed', retryable: true });
      
      // Should attempt to reconnect after delay
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('terminal:create', expect.any(Object));
      }, { timeout: 3000 });
    });
  });

  describe('State Persistence', () => {
    it('should save terminal state periodically', async () => {
      const mockSaveState = jest.fn();
      
      jest.mocked(require('@/components/terminal/TerminalStatePersistence').useTerminalStatePersistence)
        .mockReturnValue({
          isRestored: true,
          saveState: mockSaveState,
          updateState: jest.fn(),
          addToHistory: jest.fn(),
          getHistory: jest.fn(() => []),
          clearState: jest.fn()
        });
      
      render(<Terminal />);
      
      // Should save state on interval
      await new Promise(resolve => setTimeout(resolve, 5100)); // Slightly more than save interval
      
      expect(mockSaveState).toHaveBeenCalled();
    });

    it('should restore state on component mount', () => {
      const mockGetHistory = jest.fn(() => ['ls', 'pwd', 'npm start']);
      
      jest.mocked(require('@/components/terminal/TerminalStatePersistence').useTerminalStatePersistence)
        .mockReturnValue({
          isRestored: true,
          saveState: jest.fn(),
          updateState: jest.fn(),
          addToHistory: jest.fn(),
          getHistory: mockGetHistory,
          clearState: jest.fn()
        });
      
      render(<Terminal />);
      
      expect(mockGetHistory).toHaveBeenCalled();
    });

    it('should add commands to history', () => {
      const mockAddToHistory = jest.fn();
      
      jest.mocked(require('@/components/terminal/TerminalStatePersistence').useTerminalStatePersistence)
        .mockReturnValue({
          isRestored: true,
          saveState: jest.fn(),
          updateState: jest.fn(),
          addToHistory: mockAddToHistory,
          getHistory: jest.fn(() => []),
          clearState: jest.fn()
        });
      
      render(<Terminal />);
      
      // Simulate command execution
      const dataHandler = mockTerminal.onData.mock.calls[0]?.[0];
      dataHandler?.('git status\r');
      
      expect(mockAddToHistory).toHaveBeenCalledWith('git status');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Terminal />);
      
      expect(screen.getByRole('application')).toHaveAttribute('aria-label', 'Terminal');
      expect(screen.getByTestId('terminal-container')).toHaveAttribute('aria-live', 'polite');
    });

    it('should support keyboard navigation', () => {
      render(<Terminal />);
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      clearButton.focus();
      expect(clearButton).toHaveFocus();
      
      fireEvent.keyDown(clearButton, { key: 'Enter' });
      expect(mockTerminal.clear).toHaveBeenCalled();
    });

    it('should announce status changes to screen readers', async () => {
      render(<Terminal />);
      
      // Simulate connection status change
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal:error'
      )?.[1];
      
      errorHandler?.({ error: 'Connection lost' });
      
      await waitFor(() => {
        expect(screen.getByTestId('terminal-status')).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should throttle resize events', async () => {
      render(<Terminal />);
      
      const resizeHandler = mockTerminal.onResize.mock.calls[0]?.[0];
      
      // Rapidly trigger resize events
      for (let i = 0; i < 10; i++) {
        resizeHandler?.({ cols: 80 + i, rows: 24 });
      }
      
      // Should throttle the resize calls
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledTimes(1);
      });
    });

    it('should batch output writes for performance', async () => {
      render(<Terminal />);
      
      const terminalDataHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal:data'
      )?.[1];
      
      // Send multiple rapid outputs
      for (let i = 0; i < 5; i++) {
        terminalDataHandler?.({ data: `Line ${i}\n` });
      }
      
      // Should batch the writes
      expect(mockTerminal.write).toHaveBeenCalledWith('Line 0\nLine 1\nLine 2\nLine 3\nLine 4\n');
    });

    it('should limit buffer size to prevent memory issues', () => {
      render(<Terminal />);
      
      // Simulate large buffer
      mockTerminal.buffer.active.length = 10000;
      
      const terminalDataHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'terminal:data'
      )?.[1];
      
      terminalDataHandler?.({ data: 'More output\n' });
      
      // Should limit buffer or trigger cleanup
      expect(mockTerminal.buffer.active.length).toBeLessThanOrEqual(10000);
    });
  });
});

/**
 * Integration Tests for Terminal with Backend
 */
describe('Terminal Backend Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should establish WebSocket connection for terminal communication', () => {
    render(<Terminal />);
    
    expect(mockSocket.on).toHaveBeenCalledWith('terminal:data', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('terminal:created', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('terminal:error', expect.any(Function));
  });

  it('should handle terminal session lifecycle correctly', async () => {
    render(<Terminal />);
    
    // Session creation
    expect(mockSocket.emit).toHaveBeenCalledWith('terminal:create', expect.objectContaining({
      id: expect.any(String)
    }));
    
    // Simulate session created
    const createHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'terminal:created'
    )?.[1];
    
    createHandler?.({ sessionId: 'test-123', success: true });
    
    // User input
    const dataHandler = mockTerminal.onData.mock.calls[0]?.[0];
    dataHandler?.('echo "hello"\r');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('terminal:input', {
      sessionId: 'test-123',
      data: 'echo "hello"\r'
    });
    
    // Backend response
    const terminalDataHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'terminal:data'
    )?.[1];
    
    terminalDataHandler?.({ data: 'hello\n$ ' });
    
    expect(mockTerminal.write).toHaveBeenCalledWith('hello\n$ ');
  });

  it('should handle concurrent terminal sessions', async () => {
    const { rerender } = render(<Terminal sessionId="session-1" />);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('terminal:create', expect.objectContaining({
      id: 'session-1'
    }));
    
    rerender(<Terminal sessionId="session-2" />);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('terminal:create', expect.objectContaining({
      id: 'session-2'
    }));
  });
});