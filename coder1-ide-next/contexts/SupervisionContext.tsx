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
    let mounted = true;

    const initializeSocket = async () => {
      try {
        const socket = await getSocket();

        if (!mounted) return; // Component unmounted before socket connected

        // Listen for supervision state changes from backend
        socket.on('supervision:activated', (data: { timestamp: string, triggeredBy: string }) => {
          if (!mounted) return;
          setIsSupervisionActive(true);
          setSupervisionStatus('active');
          setLastSupervisionCheck(new Date(data.timestamp));
        });

        socket.on('supervision:deactivated', (data: { timestamp: string }) => {
          if (!mounted) return;
          setIsSupervisionActive(false);
          setSupervisionStatus('inactive');
          setLastSupervisionCheck(new Date(data.timestamp));
        });

        socket.on('supervision:status', (data: { active: boolean, status: string }) => {
          if (!mounted) return;
          setIsSupervisionActive(data.active);
          setSupervisionStatus(data.status);
        });

        // Request current supervision status on mount
        socket.emit('supervision:get-status');

        return socket;
      } catch (error) {
        console.error('Failed to initialize supervision socket:', error);
        return null;
      }
    };

    let socketPromise = initializeSocket();

    return () => {
      mounted = false;
      socketPromise.then(socket => {
        if (socket) {
          socket.off('supervision:activated');
          socket.off('supervision:deactivated');
          socket.off('supervision:status');
        }
      });
    };
  }, []);

  const enableSupervision = async () => {
    try {
      const socket = await getSocket();
      socket.emit('supervision:enable', { 
        source: 'manual',
        timestamp: new Date().toISOString() 
      });
      setIsSupervisionActive(true);
      setSupervisionStatus('active');
      setLastSupervisionCheck(new Date());
    } catch (error) {
      console.error('Failed to enable supervision:', error);
    }
  };

  const disableSupervision = async () => {
    try {
      const socket = await getSocket();
      socket.emit('supervision:disable', { 
        timestamp: new Date().toISOString() 
      });
      setIsSupervisionActive(false);
      setSupervisionStatus('inactive');
    } catch (error) {
      console.error('Failed to disable supervision:', error);
    }
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