import { useState, useEffect, useCallback } from 'react';
import { AutonomousDecisionEngine } from '../services/SupervisionEngine';
import { FileMonitoringService } from '../services/FileMonitoringService';
import { SleepModeManager } from '../services/SleepModeManager';

export interface SupervisionState {
  isEnabled: boolean;
  sleepModeActive: boolean;
  currentPersona: string;
  approvalRate: number;
  recentDecisions: any[];
  qualityMetrics: {
    codeQuality: number;
    securityScore: number;
    performanceScore: number;
    testCoverage: number;
  };
}

export const useSupervision = () => {
  const [state, setState] = useState<SupervisionState>({
    isEnabled: false,
    sleepModeActive: false,
    currentPersona: 'analyzer',
    approvalRate: 87,
    recentDecisions: [],
    qualityMetrics: {
      codeQuality: 89,
      securityScore: 94,
      performanceScore: 82,
      testCoverage: 76
    }
  });

  const [decisionEngine] = useState(() => new AutonomousDecisionEngine());
  const [monitoringService] = useState(() => new FileMonitoringService());
  const [sleepModeManager] = useState(() => new SleepModeManager());

  const enableSupervision = useCallback(async () => {
    setState(prev => ({ ...prev, isEnabled: true }));
    
    await monitoringService.startMonitoring({
      workspaceId: 'default',
      supervisor: {
        id: 'supervisor-1',
        workspaceId: 'default',
        status: 'monitoring',
        persona: 'analyzer',
        autonomyLevel: 'balanced',
        approvalThresholds: {
          codeQuality: 80,
          securityRisk: 30,
          performanceImpact: 25,
          testCoverage: 70
        },
        monitoringRules: [],
        interventionHistory: []
      },
      enableRealTimeMonitoring: true,
      monitoringInterval: 30000,
      autoApprovalEnabled: true
    });
  }, [monitoringService]);

  const disableSupervision = useCallback(async () => {
    setState(prev => ({ ...prev, isEnabled: false }));
    await monitoringService.stopMonitoring('default');
  }, [monitoringService]);

  const enableSleepMode = useCallback(async () => {
    setState(prev => ({ ...prev, sleepModeActive: true }));
    
    await sleepModeManager.enableSleepMode('default', {
      autonomyLevel: 'balanced',
      thresholds: {
        codeQuality: 80,
        securityRisk: 30,
        performanceImpact: 25,
        testCoverage: 70
      },
      escalationRules: [],
      maxChangesPerHour: 10,
      autoCommit: true,
      requiresHumanReview: false,
      notificationChannels: ['push']
    });
  }, [sleepModeManager]);

  const disableSleepMode = useCallback(async () => {
    setState(prev => ({ ...prev, sleepModeActive: false }));
    await sleepModeManager.disableSleepMode('default');
  }, [sleepModeManager]);

  useEffect(() => {
    const handleSupervisionNotification = (event: CustomEvent) => {
      const notification = event.detail;
      
      setState(prev => ({
        ...prev,
        recentDecisions: [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            action: notification.type.includes('approved') ? 'approve' : 
                   notification.type.includes('rejected') ? 'reject' : 'escalate',
            filePath: 'src/components/Example.tsx',
            reason: notification.message,
            confidence: 85
          },
          ...prev.recentDecisions.slice(0, 4)
        ]
      }));
    };

    window.addEventListener('supervision-notification', handleSupervisionNotification as EventListener);
    
    return () => {
      window.removeEventListener('supervision-notification', handleSupervisionNotification as EventListener);
    };
  }, []);

  return {
    state,
    enableSupervision,
    disableSupervision,
    enableSleepMode,
    disableSleepMode,
    decisionEngine,
    monitoringService,
    sleepModeManager
  };
};
