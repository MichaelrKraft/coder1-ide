/**
 * Global Modal Stack Manager
 * Provides proper modal lifecycle management with z-index stacking and cleanup
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '../logger';

interface Modal {
  id: string;
  zIndex: number;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

interface ModalStackStore {
  modals: Modal[];
  baseZIndex: number;
  
  // Actions
  pushModal: (modal: Omit<Modal, 'zIndex'>) => number;
  popModal: (id: string) => void;
  clearAllModals: () => void;
  getTopModal: () => Modal | null;
  isModalOpen: (id: string) => boolean;
  getModalZIndex: (id: string) => number | null;
}

const MODAL_Z_INDEX_BASE = 1000;
const MODAL_Z_INDEX_INCREMENT = 10;

export const useModalStack = create<ModalStackStore>()(
  devtools(
    (set, get) => ({
      modals: [],
      baseZIndex: MODAL_Z_INDEX_BASE,

      pushModal: (modal) => {
        const { modals } = get();
        const zIndex = MODAL_Z_INDEX_BASE + (modals.length * MODAL_Z_INDEX_INCREMENT);
        const newModal = { ...modal, zIndex };
        
        set((state) => ({
          modals: [...state.modals, newModal]
        }), false, `pushModal:${modal.id}`);
        
        return zIndex;
      },

      popModal: (id) => {
        set((state) => ({
          modals: state.modals.filter(modal => modal.id !== id)
        }), false, `popModal:${id}`);
      },

      clearAllModals: () => {
        const { modals } = get();
        // Call onClose for all modals
        modals.forEach(modal => modal.onClose?.());
        set({ modals: [] }, false, 'clearAllModals');
      },

      getTopModal: () => {
        const { modals } = get();
        return modals.length > 0 ? modals[modals.length - 1] : null;
      },

      isModalOpen: (id) => {
        const { modals } = get();
        return modals.some(modal => modal.id === id);
      },

      getModalZIndex: (id) => {
        const { modals } = get();
        const modal = modals.find(modal => modal.id === id);
        return modal ? modal.zIndex : null;
      },
    }),
    {
      name: 'Modal Stack Store'
    }
  )
);

// Global keyboard event handler
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const { getTopModal, popModal } = useModalStack.getState();
      const topModal = getTopModal();
      
      if (topModal && topModal.closeOnEscape !== false) {
        topModal.onClose?.();
        popModal(topModal.id);
      }
    }
    
    // Emergency modal reset: Ctrl+Shift+Esc
    if (e.key === 'Escape' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      const { clearAllModals } = useModalStack.getState();
      clearAllModals();
      logger.debug('🚨 Emergency modal reset triggered');
    }
  });
}