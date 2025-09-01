'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSocket } from '../lib/socket';

interface SupervisionContextType {
  isSupervisionActive: boolean;
  supervisionStatus: string;
  lastSupervisionCheck: Date | null;
  enableSupervision: () => void;
  disableSupervision: () => void;
  toggleSupervision: () => void;
  updateSupervisionStatus: (status: string) => void;
}

const SupervisionContext = createContext<SupervisionContextType | undefined>(undefined);

export function SupervisionProvider({ children }: { children: ReactNode }) {
  const [isSupervisionActive, setIsSupervisionActive] = useState(false);
  const [supervisionStatus, setSupervisionStatus] = useState('inactive');
  const [lastSupervisionCheck, setLastSupervisionCheck] = useState<Date | null>(null);

  useEffect(() => {
    const socket = getSocket();

    // Listen for supervision state changes from backend
    socket.on('supervision:activated', (data: { timestamp: string, triggeredBy: string }) => {
      console.log('👁️ Supervision activated by:', data.triggeredBy);
      setIsSupervisionActive(true);
      setSupervisionStatus('active');
      setLastSupervisionCheck(new Date(data.timestamp));
    });

    socket.on('supervision:deactivated', (data: { timestamp: string }) => {
      console.log('👁️ Supervision deactivated');
      setIsSupervisionActive(false);
      setSupervisionStatus('inactive');
      setLastSupervisionCheck(new Date(data.timestamp));
    });

    socket.on('supervision:status', (data: { active: boolean, status: string }) => {
      setIsSupervisionActive(data.active);
      setSupervisionStatus(data.status);
    });

    // Request current supervision status on mount
    socket.emit('supervision:get-status');

    return () => {
      socket.off('supervision:activated');
      socket.off('supervision:deactivated');
      socket.off('supervision:status');
    };
  }, []);

  const enableSupervision = () => {
    const socket = getSocket();
    socket.emit('supervision:enable', { 
      source: 'manual',
      timestamp: new Date().toISOString() 
    });
    setIsSupervisionActive(true);
    setSupervisionStatus('active');
    setLastSupervisionCheck(new Date());
  };

  const disableSupervision = () => {
    const socket = getSocket();
    socket.emit('supervision:disable', { 
      timestamp: new Date().toISOString() 
    });
    setIsSupervisionActive(false);
    setSupervisionStatus('inactive');
  };

  const toggleSupervision = () => {
    if (isSupervisionActive) {
      disableSupervision();
    } else {
      enableSupervision();
    }
  };

  const updateSupervisionStatus = (status: string) => {
    setSupervisionStatus(status);
    setLastSupervisionCheck(new Date());
  };

  return (
    <SupervisionContext.Provider 
      value={{
        isSupervisionActive,
        supervisionStatus,
        lastSupervisionCheck,
        enableSupervision,
        disableSupervision,
        toggleSupervision,
        updateSupervisionStatus
      }}
    >
      {children}
    </SupervisionContext.Provider>
  );
}

export function useSupervision() {
  const context = useContext(SupervisionContext);
  if (context === undefined) {
    throw new Error('useSupervision must be used within a SupervisionProvider');
  }
  return context;
}