/**
 * Emergency Recovery System
 * Provides fallback mechanisms for UI issues and debugging utilities
 */

import { useModalStack } from './hooks/useModalStack';
import { useUIStore } from '@/stores/useUIStore';
import { logger } from './logger';

export class EmergencyRecovery {
  private static instance: EmergencyRecovery;
  private debugMode = process.env.NODE_ENV === 'development';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalHandlers();
      this.setupDebugCommands();
    }
  }

  public static getInstance(): EmergencyRecovery {
    if (!EmergencyRecovery.instance) {
      EmergencyRecovery.instance = new EmergencyRecovery();
    }
    return EmergencyRecovery.instance;
  }

  private setupGlobalHandlers() {
    // Emergency modal timeout (30 seconds)
    setInterval(() => {
      const { modals, clearAllModals } = useModalStack.getState();
      if (modals.length > 0) {
        const oldestModal = modals[0];
        const modalAge = Date.now() - parseInt(oldestModal.id.split('_')[1] || '0');
        
        if (modalAge > 30000) { // 30 seconds
          logger.warn('🚨 Emergency: Modal timeout reached, clearing all modals');
          clearAllModals();
        }
      }
    }, 5000); // Check every 5 seconds

    // Global error boundary for UI issues
    window.addEventListener('error', (event) => {
      if (event.message.includes('modal') || event.message.includes('z-index')) {
        logger.error('🚨 UI Error detected, attempting recovery:', event.error);
        this.performEmergencyReset();
      }
    });
  }

  private setupDebugCommands() {
    if (!this.debugMode) return;

    // Debug commands accessible via console
    (window as any).debugUI = {
      clearAllModals: () => {
        const { clearAllModals } = useModalStack.getState();
        clearAllModals();
        logger.debug('✅ All modals cleared');
      },
      
      showModalStack: () => {
        const { modals } = useModalStack.getState();
        console.table(modals);
      },
      
      showZIndexLayers: () => {
        const elements = document.querySelectorAll('[style*="z-index"], [class*="z-"]');
        const zIndexMap: Record<string, Element[]> = {};
        
        elements.forEach(el => {
          const zIndex = getComputedStyle(el).zIndex;
          if (zIndex !== 'auto') {
            if (!zIndexMap[zIndex]) zIndexMap[zIndex] = [];
            zIndexMap[zIndex].push(el);
          }
        });
        
        logger.debug('🔍 Z-Index layers:', zIndexMap);
      },
      
      testButtonClicks: () => {
        const buttons = document.querySelectorAll('button');
        buttons.forEach((btn, idx) => {
          const rect = btn.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const isBlocked = this.isElementBlocked(btn);
          
          logger.debug(`Button ${idx}: ${btn.textContent?.trim()} - Visible: ${isVisible}, Blocked: ${isBlocked}`);
        });
      },
      
      emergencyReset: () => this.performEmergencyReset()
    };

    logger.debug('🛠️ Debug commands available: debugUI.*');
  }

  private isElementBlocked(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    return elementAtPoint !== element && !element.contains(elementAtPoint);
  }

  public performEmergencyReset() {
    logger.debug('🚨 Performing emergency UI reset...');
    
    // Clear all modals
    const { clearAllModals } = useModalStack.getState();
    clearAllModals();
    
    // Clear UI store modals
    const { closeAllModals } = useUIStore.getState();
    closeAllModals();
    
    // Remove any rogue overlays
    const overlays = document.querySelectorAll('[class*="fixed"][class*="inset-0"]');
    overlays.forEach(overlay => {
      const style = getComputedStyle(overlay);
      if (style.backgroundColor.includes('black') || style.backdropFilter) {
        logger.debug('🗑️ Removing rogue overlay:', overlay);
        overlay.remove();
      }
    });
    
    // Force repaint
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    logger.debug('✅ Emergency reset complete');
  }

  public reportUIIssue(issue: string, element?: Element) {
    console.group('🐛 UI Issue Report');
    logger.debug('Issue:', issue);
    if (element) {
      logger.debug('Element:', element);
      logger.debug('Computed styles:', getComputedStyle(element));
    }
    
    const { modals } = useModalStack.getState();
    logger.debug('Active modals:', modals);
    
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    logger.debug('Viewport:', viewport);
    
    console.groupEnd();
  }
}

// Initialize emergency recovery
if (typeof window !== 'undefined') {
  EmergencyRecovery.getInstance();
}