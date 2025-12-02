/**
 * Polling Health Store (Zustand)
 * Centralized state for tracking polling service health across the application
 *
 * Purpose: Allows any component to report polling issues and for the StatusBar
 * to display a unified service health indicator.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ================================================================================
// Types
// ================================================================================

export interface PollingServiceStatus {
  /** Unique identifier for the polling service */
  id: string;
  /** Human-readable name */
  name: string;
  /** Whether the circuit breaker is open (polling stopped) */
  isCircuitOpen: boolean;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Last error message */
  lastError: string | null;
  /** Timestamp of last update */
  lastUpdated: number;
}

interface PollingHealthStore {
  /** Map of service ID to status */
  services: Record<string, PollingServiceStatus>;

  /** Whether any service has issues */
  hasIssues: boolean;

  /** Human-readable summary of issues */
  issuesSummary: string;

  // Actions
  /** Report a polling service status update */
  reportStatus: (status: PollingServiceStatus) => void;

  /** Mark a service as healthy (circuit closed, no errors) */
  reportHealthy: (id: string) => void;

  /** Remove a service from tracking */
  removeService: (id: string) => void;

  /** Clear all service statuses */
  clearAll: () => void;
}

// ================================================================================
// Store Implementation
// ================================================================================

export const usePollingHealthStore = create<PollingHealthStore>()(
  devtools(
    (set, get) => ({
      services: {},
      hasIssues: false,
      issuesSummary: '',

      reportStatus: (status: PollingServiceStatus) => {
        set(
          (state) => {
            const newServices = {
              ...state.services,
              [status.id]: {
                ...status,
                lastUpdated: Date.now(),
              },
            };

            // Calculate if there are any issues
            const issueServices = Object.values(newServices).filter(
              (s) => s.isCircuitOpen || s.consecutiveFailures > 0
            );
            const hasIssues = issueServices.length > 0;

            // Build summary
            let issuesSummary = '';
            if (hasIssues) {
              const circuitOpenServices = issueServices.filter((s) => s.isCircuitOpen);
              const degradedServices = issueServices.filter(
                (s) => !s.isCircuitOpen && s.consecutiveFailures > 0
              );

              const parts: string[] = [];
              if (circuitOpenServices.length > 0) {
                parts.push(
                  `${circuitOpenServices.length} service(s) offline: ${circuitOpenServices
                    .map((s) => s.name)
                    .join(', ')}`
                );
              }
              if (degradedServices.length > 0) {
                parts.push(
                  `${degradedServices.length} service(s) degraded: ${degradedServices
                    .map((s) => s.name)
                    .join(', ')}`
                );
              }
              issuesSummary = parts.join('. ');
            }

            return {
              services: newServices,
              hasIssues,
              issuesSummary,
            };
          },
          false,
          'reportStatus'
        );
      },

      reportHealthy: (id: string) => {
        set(
          (state) => {
            const existing = state.services[id];
            if (!existing) return state;

            const newServices = {
              ...state.services,
              [id]: {
                ...existing,
                isCircuitOpen: false,
                consecutiveFailures: 0,
                lastError: null,
                lastUpdated: Date.now(),
              },
            };

            // Recalculate issues
            const issueServices = Object.values(newServices).filter(
              (s) => s.isCircuitOpen || s.consecutiveFailures > 0
            );
            const hasIssues = issueServices.length > 0;

            let issuesSummary = '';
            if (hasIssues) {
              issuesSummary = issueServices.map((s) => s.name).join(', ') + ' experiencing issues';
            }

            return {
              services: newServices,
              hasIssues,
              issuesSummary,
            };
          },
          false,
          'reportHealthy'
        );
      },

      removeService: (id: string) => {
        set(
          (state) => {
            const { [id]: removed, ...remaining } = state.services;

            // Recalculate issues
            const issueServices = Object.values(remaining).filter(
              (s) => s.isCircuitOpen || s.consecutiveFailures > 0
            );
            const hasIssues = issueServices.length > 0;

            let issuesSummary = '';
            if (hasIssues) {
              issuesSummary = issueServices.map((s) => s.name).join(', ') + ' experiencing issues';
            }

            return {
              services: remaining,
              hasIssues,
              issuesSummary,
            };
          },
          false,
          'removeService'
        );
      },

      clearAll: () => {
        set(
          {
            services: {},
            hasIssues: false,
            issuesSummary: '',
          },
          false,
          'clearAll'
        );
      },
    }),
    { name: 'polling-health-store' }
  )
);

export default usePollingHealthStore;
