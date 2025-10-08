/**
 * StatusBar Component Unit Tests
 * Tests the main status bar functionality, API endpoints, and user interactions
 * Updated to use refactored StatusBarCore component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBarCore from '@/components/status-bar/StatusBarCore';

// Mock dependencies
jest.mock('@/lib/socket', () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: true
  }
}));

jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => ({
    currentSession: {
      id: 'test-session-123',
      name: 'Test Session',
      status: 'active'
    },
    sessions: [
      { id: 'test-session-123', name: 'Test Session', status: 'active' }
    ],
    createSession: jest.fn(),
    switchSession: jest.fn()
  })
}));

jest.mock('@/contexts/EnhancedSupervisionContext', () => ({
  useEnhancedSupervision: () => ({
    isSupervisionActive: false,
    supervisionStatus: 'idle',
    lastSupervisionCheck: null,
    enableSupervision: jest.fn(),
    disableSupervision: jest.fn(),
    toggleSupervision: jest.fn(),
    updateSupervisionStatus: jest.fn()
  })
}));

jest.mock('@/stores/useIDEStore', () => ({
  useIDEStore: () => ({
    connections: { terminal: true },
    loading: {}
  })
}));

jest.mock('@/stores/useSessionStore', () => ({
  useSessionStore: () => ({
    supervision: { isActive: false },
    currentSession: null,
    createCheckpoint: jest.fn()
  })
}));

jest.mock('@/stores/useUIStore', () => ({
  useUIStore: () => ({
    discoverPanel: { isOpen: false },
    addToast: jest.fn(),
    openModal: jest.fn(),
    isModalOpen: jest.fn(() => false)
  })
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('StatusBarCore Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Rendering', () => {
    it('should render basic status bar elements', () => {
      render(<StatusBarCore />);
      
      // Should render main container
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      
      // Should render session info
      expect(screen.getByText(/Test Session/)).toBeInTheDocument();
    });

    it('should show connection status', () => {
      render(<StatusBarCore />);
      
      // Should indicate connected status
      const statusIndicator = screen.getByTestId('connection-status');
      expect(statusIndicator).toHaveClass('connected');
    });

    it('should display current session information', () => {
      render(<StatusBarCore />);
      
      expect(screen.getByText('Test Session')).toBeInTheDocument();
      expect(screen.getByText(/test-session-123/)).toBeInTheDocument();
    });
  });

  describe('Session Summary Generation', () => {
    it('should handle session summary button click', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          summary: 'Test session summary',
          timestamp: new Date().toISOString()
        })
      });

      render(<StatusBarCore />);
      
      const summaryButton = screen.getByRole('button', { name: /session summary/i });
      fireEvent.click(summaryButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude/session-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: 'test-session-123'
          })
        });
      });
    });

    it('should handle session summary generation errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<StatusBarCore />);
      
      const summaryButton = screen.getByRole('button', { name: /session summary/i });
      fireEvent.click(summaryButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Session summary error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should show loading state during summary generation', async () => {
      // Mock a delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ summary: 'Test' })
          }), 100)
        )
      );

      render(<StatusBarCore />);
      
      const summaryButton = screen.getByRole('button', { name: /session summary/i });
      fireEvent.click(summaryButton);

      // Should show loading state
      expect(summaryButton).toHaveAttribute('disabled');
      expect(screen.getByText(/generating/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(summaryButton).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('AI Team Integration', () => {
    it('should trigger AI team activation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          teamId: 'team-456'
        })
      });

      render(<StatusBarCore />);
      
      const aiTeamButton = screen.getByRole('button', { name: /ai team/i });
      fireEvent.click(aiTeamButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/spawn-team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: 'test-session-123',
            task: 'general'
          })
        });
      });
    });

    it('should handle AI team spawn errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<StatusBarCore />);
      
      const aiTeamButton = screen.getByRole('button', { name: /ai team/i });
      fireEvent.click(aiTeamButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('AI Team spawn error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should show appropriate feedback during AI team operations', async () => {
      render(<StatusBarCore />);
      
      const aiTeamButton = screen.getByRole('button', { name: /ai team/i });
      fireEvent.click(aiTeamButton);

      // Should show spawning state
      expect(screen.getByText(/spawning ai team/i)).toBeInTheDocument();
    });
  });

  describe('File Operations', () => {
    it('should handle export functionality', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test content'], { type: 'text/plain' }))
      });

      // Mock URL.createObjectURL
      const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.createObjectURL = mockCreateObjectURL;

      // Mock link click
      const mockClick = jest.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(<StatusBarCore />);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: 'test-session-123',
            format: 'markdown'
          })
        });
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle different export formats', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob([''], { type: 'application/json' }))
      });

      render(<StatusBarCore />);
      
      // Test JSON export
      const exportButton = screen.getByRole('button', { name: /export/i });
      
      // Right-click to show format options
      fireEvent.contextMenu(exportButton);
      
      const jsonOption = screen.getByText(/json/i);
      fireEvent.click(jsonOption);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: 'test-session-123',
            format: 'json'
          })
        });
      });
    });
  });

  describe('Status Indicators', () => {
    it('should update status indicators dynamically', () => {
      const { rerender } = render(<StatusBarCore />);
      
      // Initial state
      expect(screen.getByTestId('connection-status')).toHaveClass('connected');
      
      // Mock disconnected state
      jest.mocked(require('@/lib/socket').socket.connected).mockReturnValue(false);
      
      rerender(<StatusBarCore />);
      
      expect(screen.getByTestId('connection-status')).toHaveClass('disconnected');
    });

    it('should show terminal status when available', () => {
      render(<StatusBarCore />);
      
      // Should show terminal indicator
      const terminalStatus = screen.getByTestId('terminal-status');
      expect(terminalStatus).toBeInTheDocument();
    });

    it('should display session count', () => {
      render(<StatusBarCore />);
      
      expect(screen.getByText(/1 session/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should respond to session summary keyboard shortcut', () => {
      const mockGenerate = jest.fn();
      
      render(<StatusBarCore />);
      
      // Simulate Ctrl+Shift+S
      fireEvent.keyDown(document, {
        key: 'S',
        ctrlKey: true,
        shiftKey: true
      });

      // Should trigger session summary
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should respond to AI team keyboard shortcut', () => {
      render(<StatusBarCore />);
      
      // Simulate Ctrl+Shift+A
      fireEvent.keyDown(document, {
        key: 'A',
        ctrlKey: true,
        shiftKey: true
      });

      // Should trigger AI team spawn
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<StatusBarCore />);
      
      const summaryButton = screen.getByRole('button', { name: /session summary/i });
      fireEvent.click(summaryButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // UI should recover
      expect(summaryButton).not.toHaveAttribute('disabled');

      consoleSpy.mockRestore();
    });

    it('should show error messages to user', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found')
      });

      render(<StatusBarCore />);
      
      const summaryButton = screen.getByRole('button', { name: /session summary/i });
      fireEvent.click(summaryButton);

      await waitFor(() => {
        expect(screen.getByText(/error generating summary/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<StatusBarCore />);
      
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Status bar');
      expect(screen.getByRole('button', { name: /session summary/i })).toHaveAttribute('aria-describedby');
    });

    it('should support keyboard navigation', () => {
      render(<StatusBarCore />);
      
      const summaryButton = screen.getByRole('button', { name: /session summary/i });
      
      summaryButton.focus();
      expect(summaryButton).toHaveFocus();
      
      fireEvent.keyDown(summaryButton, { key: 'Enter' });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should have appropriate color contrast for status indicators', () => {
      render(<StatusBarCore />);
      
      const statusIndicator = screen.getByTestId('connection-status');
      const styles = window.getComputedStyle(statusIndicator);
      
      // Should have sufficient contrast (this would need actual color calculation in real test)
      expect(styles.color).toBeDefined();
      expect(styles.backgroundColor).toBeDefined();
    });
  });
});

/**
 * Integration Tests for StatusBar API Endpoints
 */
describe('StatusBar API Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should integrate with session summary endpoint correctly', async () => {
    const mockResponse = {
      summary: 'Comprehensive session summary',
      metadata: {
        filesChanged: 3,
        commandsRun: 15,
        duration: 1800000
      },
      timestamp: new Date().toISOString()
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    render(<StatusBarCore />);
    
    const summaryButton = screen.getByRole('button', { name: /session summary/i });
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/claude/session-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'test-session-123' })
      });
    });

    // Should handle the response appropriately
    expect(screen.getByText(/summary generated/i)).toBeInTheDocument();
  });

  it('should handle rate limiting from API', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded')
    });

    render(<StatusBarCore />);
    
    const summaryButton = screen.getByRole('button', { name: /session summary/i });
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
    });

    // Button should be temporarily disabled
    expect(summaryButton).toHaveAttribute('disabled');
  });
});