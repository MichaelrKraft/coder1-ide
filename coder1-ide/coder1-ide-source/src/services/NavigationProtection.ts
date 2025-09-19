/**
 * NavigationProtection Service
 * 
 * Prevents accidental navigation away from the IDE that would cause session loss.
 * Implements multiple protection layers for Mac trackpad gestures and browser navigation.
 */

export class NavigationProtection {
  private isActive: boolean = false;
  private hasUnsavedWork: boolean = false;
  private originalHistoryLength: number = 0;
  private isDragging: boolean = false;

  constructor() {
    this.originalHistoryLength = window.history.length;
  }

  /**
   * Activate navigation protection
   */
  activate(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🛡️ Navigation protection activated');
    
    // Add beforeunload protection
    this.addBeforeUnloadProtection();
    
    // Create safe history entries to prevent back navigation
    this.createSafeHistory();
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', this.handlePopState);
    
    // Add panel resize protection
    this.addPanelResizeProtection();
  }

  /**
   * Deactivate navigation protection
   */
  deactivate(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('🛡️ Navigation protection deactivated');
    
    // Remove beforeunload protection
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('popstate', this.handlePopState);
    
    // Remove panel resize protection
    this.removePanelResizeProtection();
  }

  /**
   * Set whether user has unsaved work (affects warning messages)
   */
  setHasUnsavedWork(hasWork: boolean): void {
    this.hasUnsavedWork = hasWork;
  }

  /**
   * Add beforeunload protection to warn user before leaving
   */
  private addBeforeUnloadProtection(): void {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Handle beforeunload event
   */
  private handleBeforeUnload = (event: BeforeUnloadEvent): string | undefined => {
    if (!this.isActive) return undefined;
    
    const message = this.hasUnsavedWork 
      ? 'You have unsaved work in the terminal and active AI sessions. Are you sure you want to leave?'
      : 'Your terminal session and AI modes will be lost. Are you sure you want to leave?';
    
    event.preventDefault();
    event.returnValue = message;
    return message;
  };

  /**
   * Create safe history entries to prevent accidental back navigation
   */
  private createSafeHistory(): void {
    // Push a couple of safe states to prevent immediate back navigation
    const currentState = { 
      ide: true, 
      timestamp: Date.now(),
      protection: 'active'
    };
    
    // Replace current state
    window.history.replaceState(currentState, '', window.location.href);
    
    // Add a buffer state
    window.history.pushState(currentState, '', window.location.href);
  }

  /**
   * Handle browser back/forward navigation
   */
  private handlePopState = (event: PopStateEvent): void => {
    if (!this.isActive) return;
    
    console.log('🛡️ Back navigation detected, preventing...');
    
    // Check if this is our safe state
    if (event.state?.protection === 'active') {
      // Stay on the current page by pushing forward again
      const currentState = { 
        ide: true, 
        timestamp: Date.now(),
        protection: 'active'
      };
      window.history.pushState(currentState, '', window.location.href);
      return;
    }
    
    // If user really wants to leave, show confirmation
    const shouldLeave = window.confirm(
      'Are you sure you want to leave? Your terminal session and AI modes will be lost.\n\n' +
      'Click Cancel to stay, or OK to leave and lose your session.'
    );
    
    if (!shouldLeave) {
      // Prevent navigation by pushing forward again
      const currentState = { 
        ide: true, 
        timestamp: Date.now(),
        protection: 'active'
      };
      window.history.pushState(currentState, '', window.location.href);
    } else {
      // User confirmed, allow navigation
      this.deactivate();
      window.history.back();
    }
  };

  /**
   * Safe page unload - call this when user intentionally navigates
   */
  safeUnload(): void {
    this.deactivate();
  }

  /**
   * Check if protection is currently active
   */
  isProtectionActive(): boolean {
    return this.isActive;
  }

  /**
   * Add panel resize protection to prevent navigation during drag operations
   */
  private addPanelResizeProtection(): void {
    console.log('🛡️ Panel resize protection activated');
    
    // NOTE: Cannot override location methods as they are read-only in modern browsers
    // Instead, we'll rely on beforeunload handler and panel drag detection

    // Set up drag monitoring on panel resize handles
    document.addEventListener('mousedown', this.handleMouseDown, { capture: true });
    document.addEventListener('mouseup', this.handleMouseUp, { capture: true });
  }

  /**
   * Remove panel resize protection
   */
  private removePanelResizeProtection(): void {
    console.log('🛡️ Panel resize protection deactivated');
    
    // Remove drag monitoring event listeners
    document.removeEventListener('mousedown', this.handleMouseDown, { capture: true });
    document.removeEventListener('mouseup', this.handleMouseUp, { capture: true });
  }

  /**
   * Handle mouse down events on resize handles
   */
  private handleMouseDown = (event: MouseEvent): void => {
    const target = event.target as Element;
    
    // Check if this is a panel resize handle
    if (target && (
        target.matches('[data-panel-resize-handle-enabled]') ||
        target.closest('[data-panel-resize-handle-enabled]') ||
        target.matches('.resize-handle') ||
        target.closest('.resize-handle')
    )) {
      this.isDragging = true;
      console.log('🖱️ Panel resize drag started - navigation protection active');
    }
  };

  /**
   * Handle mouse up events to end drag protection
   */
  private handleMouseUp = (event: MouseEvent): void => {
    if (this.isDragging) {
      // Small delay to catch any delayed navigation attempts
      setTimeout(() => {
        this.isDragging = false;
        console.log('✋ Panel resize drag ended - navigation protection disabled');
      }, 100);
    }
  };
}

// Singleton instance
export const navigationProtection = new NavigationProtection();