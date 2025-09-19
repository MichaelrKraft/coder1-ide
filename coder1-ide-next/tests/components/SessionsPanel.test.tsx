/**
 * SessionsPanel Component Unit Tests
 * Tests session management, UI interactions, and data persistence
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SessionsPanel from '@/components/SessionsPanel';

// Mock session context
const mockSessionContext = {
  sessions: [
    {
      id: 'session-1',
      name: 'Main Project',
      status: 'active',
      createdAt: new Date('2025-01-15T10:00:00Z'),
      lastActivity: new Date('2025-01-15T11:30:00Z'),
      filesCount: 5,
      commandsCount: 12
    },
    {
      id: 'session-2', 
      name: 'Feature Branch',
      status: 'inactive',
      createdAt: new Date('2025-01-14T14:00:00Z'),
      lastActivity: new Date('2025-01-14T16:45:00Z'),
      filesCount: 3,
      commandsCount: 8
    },
    {
      id: 'session-3',
      name: 'Experiment',
      status: 'archived',
      createdAt: new Date('2025-01-13T09:00:00Z'),
      lastActivity: new Date('2025-01-13T10:15:00Z'),
      filesCount: 1,
      commandsCount: 3
    }
  ],
  currentSession: {
    id: 'session-1',
    name: 'Main Project',
    status: 'active'
  },
  createSession: jest.fn(),
  switchSession: jest.fn(),
  renameSession: jest.fn(),
  deleteSession: jest.fn(),
  archiveSession: jest.fn(),
  restoreSession: jest.fn(),
  duplicateSession: jest.fn()
};

jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockSessionContext
}));

// Mock hooks
jest.mock('@/hooks/useSessionSummary', () => ({
  useSessionSummary: () => ({
    generateSummary: jest.fn(),
    isGenerating: false,
    lastSummary: null
  })
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SessionsPanel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Reset mock function implementations
    mockSessionContext.createSession.mockClear();
    mockSessionContext.switchSession.mockClear();
    mockSessionContext.renameSession.mockClear();
    mockSessionContext.deleteSession.mockClear();
    mockSessionContext.archiveSession.mockClear();
    mockSessionContext.restoreSession.mockClear();
    mockSessionContext.duplicateSession.mockClear();
  });

  describe('Rendering and Layout', () => {
    it('should render sessions panel with all sessions', () => {
      render(<SessionsPanel />);
      
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByText('Main Project')).toBeInTheDocument();
      expect(screen.getByText('Feature Branch')).toBeInTheDocument();
      expect(screen.getByText('Experiment')).toBeInTheDocument();
    });

    it('should highlight current active session', () => {
      render(<SessionsPanel />);
      
      const activeSession = screen.getByTestId('session-session-1');
      expect(activeSession).toHaveClass('active');
    });

    it('should show session metadata', () => {
      render(<SessionsPanel />);
      
      // Should show file counts
      expect(screen.getByText('5 files')).toBeInTheDocument();
      expect(screen.getByText('3 files')).toBeInTheDocument();
      
      // Should show command counts  
      expect(screen.getByText('12 commands')).toBeInTheDocument();
      expect(screen.getByText('8 commands')).toBeInTheDocument();
    });

    it('should display relative timestamps', () => {
      render(<SessionsPanel />);
      
      // Should show "Last activity" timestamps
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('should show different states for different session statuses', () => {
      render(<SessionsPanel />);
      
      const activeSession = screen.getByTestId('session-session-1');
      const inactiveSession = screen.getByTestId('session-session-2');
      const archivedSession = screen.getByTestId('session-session-3');
      
      expect(activeSession).toHaveClass('status-active');
      expect(inactiveSession).toHaveClass('status-inactive');
      expect(archivedSession).toHaveClass('status-archived');
    });
  });

  describe('Session Creation', () => {
    it('should render create session button', () => {
      render(<SessionsPanel />);
      
      expect(screen.getByRole('button', { name: /new session/i })).toBeInTheDocument();
    });

    it('should handle create session button click', async () => {
      mockSessionContext.createSession.mockResolvedValue({
        id: 'new-session-id',
        name: 'New Session'
      });

      render(<SessionsPanel />);
      
      const createButton = screen.getByRole('button', { name: /new session/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockSessionContext.createSession).toHaveBeenCalledWith({
          name: expect.any(String)
        });
      });
    });

    it('should show create session dialog with name input', async () => {
      render(<SessionsPanel />);
      
      const createButton = screen.getByRole('button', { name: /new session/i });
      fireEvent.click(createButton);

      // Should show dialog
      expect(screen.getByText(/create new session/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/session name/i)).toBeInTheDocument();
    });

    it('should validate session name input', async () => {
      render(<SessionsPanel />);
      
      const createButton = screen.getByRole('button', { name: /new session/i });
      fireEvent.click(createButton);

      const nameInput = screen.getByPlaceholderText(/session name/i);
      const confirmButton = screen.getByRole('button', { name: /create/i });

      // Test empty name
      fireEvent.click(confirmButton);
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();

      // Test duplicate name
      fireEvent.change(nameInput, { target: { value: 'Main Project' } });
      fireEvent.click(confirmButton);
      expect(screen.getByText(/name already exists/i)).toBeInTheDocument();

      // Test valid name
      fireEvent.change(nameInput, { target: { value: 'Valid New Session' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockSessionContext.createSession).toHaveBeenCalledWith({
          name: 'Valid New Session'
        });
      });
    });
  });

  describe('Session Actions', () => {
    it('should switch to session when clicked', async () => {
      render(<SessionsPanel />);
      
      const inactiveSession = screen.getByTestId('session-session-2');
      fireEvent.click(inactiveSession);

      await waitFor(() => {
        expect(mockSessionContext.switchSession).toHaveBeenCalledWith('session-2');
      });
    });

    it('should show context menu on right click', () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      fireEvent.contextMenu(session);

      expect(screen.getByText(/rename/i)).toBeInTheDocument();
      expect(screen.getByText(/duplicate/i)).toBeInTheDocument();
      expect(screen.getByText(/archive/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    it('should handle session rename', async () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      fireEvent.contextMenu(session);

      const renameOption = screen.getByText(/rename/i);
      fireEvent.click(renameOption);

      // Should show rename dialog
      const nameInput = screen.getByDisplayValue('Feature Branch');
      fireEvent.change(nameInput, { target: { value: 'Updated Feature Branch' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSessionContext.renameSession).toHaveBeenCalledWith(
          'session-2',
          'Updated Feature Branch'
        );
      });
    });

    it('should handle session duplication', async () => {
      mockSessionContext.duplicateSession.mockResolvedValue({
        id: 'session-4',
        name: 'Feature Branch (Copy)'
      });

      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      fireEvent.contextMenu(session);

      const duplicateOption = screen.getByText(/duplicate/i);
      fireEvent.click(duplicateOption);

      await waitFor(() => {
        expect(mockSessionContext.duplicateSession).toHaveBeenCalledWith('session-2');
      });
    });

    it('should handle session archiving', async () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      fireEvent.contextMenu(session);

      const archiveOption = screen.getByText(/archive/i);
      fireEvent.click(archiveOption);

      await waitFor(() => {
        expect(mockSessionContext.archiveSession).toHaveBeenCalledWith('session-2');
      });
    });

    it('should handle session deletion with confirmation', async () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      fireEvent.contextMenu(session);

      const deleteOption = screen.getByText(/delete/i);
      fireEvent.click(deleteOption);

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockSessionContext.deleteSession).toHaveBeenCalledWith('session-2');
      });
    });

    it('should restore archived sessions', async () => {
      render(<SessionsPanel />);
      
      const archivedSession = screen.getByTestId('session-session-3');
      fireEvent.contextMenu(archivedSession);

      const restoreOption = screen.getByText(/restore/i);
      fireEvent.click(restoreOption);

      await waitFor(() => {
        expect(mockSessionContext.restoreSession).toHaveBeenCalledWith('session-3');
      });
    });
  });

  describe('Session Search and Filtering', () => {
    it('should render search input', () => {
      render(<SessionsPanel />);
      
      expect(screen.getByPlaceholderText(/search sessions/i)).toBeInTheDocument();
    });

    it('should filter sessions by name', () => {
      render(<SessionsPanel />);
      
      const searchInput = screen.getByPlaceholderText(/search sessions/i);
      fireEvent.change(searchInput, { target: { value: 'Feature' } });

      expect(screen.getByText('Feature Branch')).toBeInTheDocument();
      expect(screen.queryByText('Main Project')).not.toBeInTheDocument();
      expect(screen.queryByText('Experiment')).not.toBeInTheDocument();
    });

    it('should show filter options', () => {
      render(<SessionsPanel />);
      
      const filterButton = screen.getByRole('button', { name: /filter/i });
      fireEvent.click(filterButton);

      expect(screen.getByText(/all sessions/i)).toBeInTheDocument();
      expect(screen.getByText(/active only/i)).toBeInTheDocument();
      expect(screen.getByText(/archived only/i)).toBeInTheDocument();
    });

    it('should filter by session status', () => {
      render(<SessionsPanel />);
      
      const filterButton = screen.getByRole('button', { name: /filter/i });
      fireEvent.click(filterButton);

      const activeOnlyOption = screen.getByText(/active only/i);
      fireEvent.click(activeOnlyOption);

      expect(screen.getByText('Main Project')).toBeInTheDocument();
      expect(screen.queryByText('Feature Branch')).not.toBeInTheDocument();
      expect(screen.queryByText('Experiment')).not.toBeInTheDocument();
    });

    it('should clear search and filters', () => {
      render(<SessionsPanel />);
      
      const searchInput = screen.getByPlaceholderText(/search sessions/i);
      fireEvent.change(searchInput, { target: { value: 'Feature' } });

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Main Project')).toBeInTheDocument();
      expect(screen.getByText('Feature Branch')).toBeInTheDocument();
      expect(screen.getByText('Experiment')).toBeInTheDocument();
    });
  });

  describe('Session Summary Integration', () => {
    it('should show session summary button for each session', () => {
      render(<SessionsPanel />);
      
      const summaryButtons = screen.getAllByRole('button', { name: /summary/i });
      expect(summaryButtons).toHaveLength(3);
    });

    it('should generate session summary when button clicked', async () => {
      const mockGenerateSummary = jest.fn();
      
      jest.mocked(require('@/hooks/useSessionSummary').useSessionSummary).mockReturnValue({
        generateSummary: mockGenerateSummary,
        isGenerating: false,
        lastSummary: null
      });

      render(<SessionsPanel />);
      
      const summaryButton = screen.getAllByRole('button', { name: /summary/i })[0];
      fireEvent.click(summaryButton);

      await waitFor(() => {
        expect(mockGenerateSummary).toHaveBeenCalledWith('session-1');
      });
    });

    it('should show loading state during summary generation', () => {
      jest.mocked(require('@/hooks/useSessionSummary').useSessionSummary).mockReturnValue({
        generateSummary: jest.fn(),
        isGenerating: true,
        lastSummary: null
      });

      render(<SessionsPanel />);
      
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it('should display generated summary', () => {
      const mockSummary = {
        sessionId: 'session-1',
        summary: 'Working on authentication feature implementation',
        metadata: {
          filesChanged: 5,
          commandsRun: 12,
          duration: 5400000
        }
      };

      jest.mocked(require('@/hooks/useSessionSummary').useSessionSummary).mockReturnValue({
        generateSummary: jest.fn(),
        isGenerating: false,
        lastSummary: mockSummary
      });

      render(<SessionsPanel />);
      
      expect(screen.getByText(/Working on authentication/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation', () => {
      render(<SessionsPanel />);
      
      const firstSession = screen.getByTestId('session-session-1');
      firstSession.focus();

      fireEvent.keyDown(firstSession, { key: 'ArrowDown' });
      
      const secondSession = screen.getByTestId('session-session-2');
      expect(secondSession).toHaveFocus();
    });

    it('should handle Enter key to switch sessions', () => {
      render(<SessionsPanel />);
      
      const inactiveSession = screen.getByTestId('session-session-2');
      inactiveSession.focus();

      fireEvent.keyDown(inactiveSession, { key: 'Enter' });

      expect(mockSessionContext.switchSession).toHaveBeenCalledWith('session-2');
    });

    it('should handle Delete key to delete sessions', async () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      session.focus();

      fireEvent.keyDown(session, { key: 'Delete' });

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it('should handle F2 key to rename sessions', () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      session.focus();

      fireEvent.keyDown(session, { key: 'F2' });

      // Should show rename input
      expect(screen.getByDisplayValue('Feature Branch')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should support drag and drop reordering', () => {
      render(<SessionsPanel />);
      
      const firstSession = screen.getByTestId('session-session-1');
      const secondSession = screen.getByTestId('session-session-2');

      fireEvent.dragStart(firstSession);
      fireEvent.dragOver(secondSession);
      fireEvent.drop(secondSession);

      // Should reorder sessions
      expect(mockSessionContext.reorderSessions).toHaveBeenCalledWith(['session-2', 'session-1', 'session-3']);
    });

    it('should show drop indicators during drag', () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-1');
      fireEvent.dragStart(session);

      expect(screen.getByTestId('drop-indicator')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle session creation errors', async () => {
      mockSessionContext.createSession.mockRejectedValue(new Error('Creation failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<SessionsPanel />);
      
      const createButton = screen.getByRole('button', { name: /new session/i });
      fireEvent.click(createButton);

      const nameInput = screen.getByPlaceholderText(/session name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Session' } });

      const confirmButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create session/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle session switch errors', async () => {
      mockSessionContext.switchSession.mockRejectedValue(new Error('Switch failed'));

      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      fireEvent.click(session);

      await waitFor(() => {
        expect(screen.getByText(/failed to switch session/i)).toBeInTheDocument();
      });
    });

    it('should recover from network errors gracefully', async () => {
      render(<SessionsPanel />);
      
      // Should still show cached sessions even if API fails
      expect(screen.getByText('Main Project')).toBeInTheDocument();
      expect(screen.getByText('Feature Branch')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<SessionsPanel />);
      
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Sessions panel');
      expect(screen.getByRole('list')).toBeInTheDocument();
      
      const sessionItems = screen.getAllByRole('listitem');
      expect(sessionItems).toHaveLength(3);
    });

    it('should announce session status changes', async () => {
      render(<SessionsPanel />);
      
      const session = screen.getByTestId('session-session-2');
      fireEvent.click(session);

      await waitFor(() => {
        expect(screen.getByTestId('status-announcement')).toHaveTextContent(
          /switched to feature branch session/i
        );
      });
    });

    it('should support screen reader navigation', () => {
      render(<SessionsPanel />);
      
      const sessions = screen.getAllByRole('listitem');
      
      sessions.forEach(session => {
        expect(session).toHaveAttribute('aria-describedby');
        expect(session).toHaveAttribute('tabindex');
      });
    });
  });
});