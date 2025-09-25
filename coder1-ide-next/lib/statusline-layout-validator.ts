/**
 * Statusline Layout Validator
 * 
 * Comprehensive layout measurement and validation system
 * Prevents UI conflicts and ensures safe statusline integration
 */

'use client';

import { logger } from './logger';

// Measurement interfaces
export interface LayoutMeasurement {
  element: string;
  dimensions: DOMRect;
  computedStyle: Partial<CSSStyleDeclaration>;
  timestamp: number;
}

export interface TerminalMeasurements {
  container: LayoutMeasurement;
  xterm: LayoutMeasurement | null;
  statusline: LayoutMeasurement | null;
  settingsButton: LayoutMeasurement | null;
  scrollableArea: {
    height: number;
    scrollHeight: number;
    canScroll: boolean;
  };
  viewport: {
    width: number;
    height: number;
  };
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  warnings: string[];
  measurements: TerminalMeasurements;
  timestamp: number;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  component: string;
  issue: string;
  expected?: any;
  actual?: any;
  suggestion?: string;
}

export interface ValidationConfig {
  terminalMinHeight: number;
  statuslineHeight: number;
  scrollTolerancePx: number;
  positionTolerancePx: number;
  performanceThresholdMs: number;
}

const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  terminalMinHeight: 300,
  statuslineHeight: 40,
  scrollTolerancePx: 50,
  positionTolerancePx: 10,
  performanceThresholdMs: 100
};

export class StatuslineLayoutValidator {
  private config: ValidationConfig;
  private baseline: TerminalMeasurements | null = null;
  private validationHistory: ValidationResult[] = [];
  private maxHistorySize = 10;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    logger.debug('[LayoutValidator] Initialized with config:', this.config);
  }

  /**
   * Capture baseline measurements before statusline integration
   */
  public captureBaseline(
    terminalRef: React.RefObject<HTMLDivElement>,
    settingsButtonRef: React.RefObject<HTMLButtonElement>,
    xtermRef: React.RefObject<any>
  ): TerminalMeasurements | null {
    const startTime = performance.now();
    
    try {
      const measurements = this.measureElements(terminalRef, settingsButtonRef, xtermRef);
      this.baseline = measurements;
      
      const endTime = performance.now();
      logger.debug(`[LayoutValidator] Baseline captured in ${(endTime - startTime).toFixed(2)}ms`);
      
      return measurements;
    } catch (error) {
      logger.error('[LayoutValidator] Failed to capture baseline:', error);
      return null;
    }
  }

  /**
   * Validate current layout against baseline
   */
  public validateLayout(
    terminalRef: React.RefObject<HTMLDivElement>,
    settingsButtonRef: React.RefObject<HTMLButtonElement>,
    xtermRef: React.RefObject<any>
  ): ValidationResult {
    const startTime = performance.now();
    
    try {
      const measurements = this.measureElements(terminalRef, settingsButtonRef, xtermRef);
      const issues: ValidationIssue[] = [];
      const warnings: string[] = [];

      // Validate against baseline if available
      if (this.baseline) {
        this.validateAgainstBaseline(measurements, issues, warnings);
      }

      // Validate current measurements
      this.validateCurrentMeasurements(measurements, issues, warnings);

      // Validate performance
      const endTime = performance.now();
      const validationTime = endTime - startTime;
      
      if (validationTime > this.config.performanceThresholdMs) {
        warnings.push(`Validation took ${validationTime.toFixed(2)}ms (threshold: ${this.config.performanceThresholdMs}ms)`);
      }

      const result: ValidationResult = {
        passed: issues.filter(i => i.severity === 'error').length === 0,
        issues,
        warnings,
        measurements,
        timestamp: Date.now()
      };

      // Store in history
      this.validationHistory.push(result);
      if (this.validationHistory.length > this.maxHistorySize) {
        this.validationHistory.shift();
      }

      logger.debug(`[LayoutValidator] Validation completed in ${validationTime.toFixed(2)}ms:`, {
        passed: result.passed,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length + warnings.length
      });

      return result;
    } catch (error) {
      logger.error('[LayoutValidator] Validation failed:', error);
      
      return {
        passed: false,
        issues: [{
          severity: 'error',
          component: 'validator',
          issue: 'Validation system error',
          actual: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: [],
        measurements: this.createEmptyMeasurements(),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get validation history
   */
  public getValidationHistory(): ValidationResult[] {
    return [...this.validationHistory];
  }

  /**
   * Get latest validation result
   */
  public getLatestValidation(): ValidationResult | null {
    return this.validationHistory[this.validationHistory.length - 1] || null;
  }

  /**
   * Check if layout has critical issues
   */
  public hasCriticalIssues(): boolean {
    const latest = this.getLatestValidation();
    return latest ? latest.issues.some(i => i.severity === 'error') : false;
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    averageValidationTime: number;
    validationCount: number;
    successRate: number;
  } {
    if (this.validationHistory.length === 0) {
      return { averageValidationTime: 0, validationCount: 0, successRate: 0 };
    }

    const successful = this.validationHistory.filter(r => r.passed).length;
    const successRate = successful / this.validationHistory.length;

    return {
      averageValidationTime: 0, // Would need to track validation times
      validationCount: this.validationHistory.length,
      successRate
    };
  }

  /**
   * Export validation report
   */
  public exportReport(): string {
    const latest = this.getLatestValidation();
    if (!latest) return 'No validation data available';

    let report = '# Statusline Layout Validation Report\n\n';
    report += `Generated: ${new Date(latest.timestamp).toISOString()}\n`;
    report += `Status: ${latest.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    if (latest.issues.length > 0) {
      report += '## Issues\n\n';
      latest.issues.forEach((issue, index) => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        report += `${index + 1}. ${icon} **${issue.component}**: ${issue.issue}\n`;
        if (issue.expected) report += `   - Expected: ${issue.expected}\n`;
        if (issue.actual) report += `   - Actual: ${issue.actual}\n`;
        if (issue.suggestion) report += `   - Suggestion: ${issue.suggestion}\n`;
        report += '\n';
      });
    }

    if (latest.warnings.length > 0) {
      report += '## Warnings\n\n';
      latest.warnings.forEach((warning, index) => {
        report += `${index + 1}. ⚠️ ${warning}\n`;
      });
      report += '\n';
    }

    report += '## Measurements\n\n';
    report += `- Terminal: ${Math.round(latest.measurements.container.dimensions.width)}×${Math.round(latest.measurements.container.dimensions.height)}\n`;
    if (latest.measurements.statusline) {
      report += `- Statusline: ${Math.round(latest.measurements.statusline.dimensions.width)}×${Math.round(latest.measurements.statusline.dimensions.height)}\n`;
    }
    report += `- Scrollable Area: ${latest.measurements.scrollableArea.height}px (scroll: ${latest.measurements.scrollableArea.canScroll})\n`;
    report += `- Viewport: ${latest.measurements.viewport.width}×${latest.measurements.viewport.height}\n`;

    return report;
  }

  // Private methods

  private measureElements(
    terminalRef: React.RefObject<HTMLDivElement>,
    settingsButtonRef: React.RefObject<HTMLButtonElement>,
    xtermRef: React.RefObject<any>
  ): TerminalMeasurements {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Measure terminal container
    const container = this.measureElement(terminalRef.current, 'terminal-container');
    
    // Measure xterm element
    const xterm = xtermRef.current?.element 
      ? this.measureElement(xtermRef.current.element, 'xterm-element')
      : null;

    // Measure statusline (if exists)
    const statuslineElement = terminalRef.current?.querySelector('[data-testid="enhanced-statusline"]') as HTMLElement;
    const statusline = statuslineElement 
      ? this.measureElement(statuslineElement, 'statusline')
      : null;

    // Measure settings button
    const settingsButton = settingsButtonRef.current
      ? this.measureElement(settingsButtonRef.current, 'settings-button')
      : null;

    // Measure scrollable area
    const scrollableArea = this.measureScrollableArea(xtermRef.current?.element);

    return {
      container,
      xterm,
      statusline,
      settingsButton,
      scrollableArea,
      viewport
    };
  }

  private measureElement(element: Element | null, name: string): LayoutMeasurement {
    if (!element) {
      return {
        element: name,
        dimensions: new DOMRect(0, 0, 0, 0),
        computedStyle: {},
        timestamp: Date.now()
      };
    }

    const dimensions = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    return {
      element: name,
      dimensions,
      computedStyle: {
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        overflow: computedStyle.overflow,
        height: computedStyle.height,
        minHeight: computedStyle.minHeight,
        maxHeight: computedStyle.maxHeight
      },
      timestamp: Date.now()
    };
  }

  private measureScrollableArea(xtermElement: HTMLElement | null): TerminalMeasurements['scrollableArea'] {
    if (!xtermElement) {
      return {
        height: 0,
        scrollHeight: 0,
        canScroll: false
      };
    }

    const viewport = xtermElement.querySelector('.xterm-viewport') as HTMLElement;
    const screen = xtermElement.querySelector('.xterm-screen') as HTMLElement;

    const height = viewport?.clientHeight || xtermElement.clientHeight;
    const scrollHeight = screen?.scrollHeight || xtermElement.scrollHeight;

    return {
      height,
      scrollHeight,
      canScroll: scrollHeight > height + this.config.scrollTolerancePx
    };
  }

  private validateAgainstBaseline(
    measurements: TerminalMeasurements,
    issues: ValidationIssue[],
    warnings: string[]
  ): void {
    if (!this.baseline) return;

    // Check terminal height
    const heightDiff = Math.abs(
      measurements.container.dimensions.height - this.baseline.container.dimensions.height
    );
    
    if (heightDiff > this.config.positionTolerancePx) {
      issues.push({
        severity: 'warning',
        component: 'terminal-container',
        issue: 'Terminal height changed significantly',
        expected: `${Math.round(this.baseline.container.dimensions.height)}px`,
        actual: `${Math.round(measurements.container.dimensions.height)}px`,
        suggestion: 'Verify statusline integration did not affect terminal layout'
      });
    }

    // Check scrollable area
    const scrollDiff = Math.abs(
      measurements.scrollableArea.height - this.baseline.scrollableArea.height
    );
    
    if (scrollDiff > this.config.scrollTolerancePx) {
      issues.push({
        severity: 'error',
        component: 'scrollable-area',
        issue: 'Scrollable area significantly reduced',
        expected: `${this.baseline.scrollableArea.height}px`,
        actual: `${measurements.scrollableArea.height}px`,
        suggestion: 'Check if statusline is overlapping terminal content'
      });
    }

    // Check settings button position
    if (this.baseline.settingsButton && measurements.settingsButton) {
      const positionDiff = Math.abs(
        measurements.settingsButton.dimensions.top - this.baseline.settingsButton.dimensions.top
      );
      
      if (positionDiff > this.config.positionTolerancePx) {
        issues.push({
          severity: 'warning',
          component: 'settings-button',
          issue: 'Settings button position changed',
          expected: `top: ${Math.round(this.baseline.settingsButton.dimensions.top)}px`,
          actual: `top: ${Math.round(measurements.settingsButton.dimensions.top)}px`,
          suggestion: 'Verify dropdown positioning is not affected'
        });
      }
    }
  }

  private validateCurrentMeasurements(
    measurements: TerminalMeasurements,
    issues: ValidationIssue[],
    warnings: string[]
  ): void {
    // Check terminal minimum height
    if (measurements.container.dimensions.height < this.config.terminalMinHeight) {
      issues.push({
        severity: 'error',
        component: 'terminal-container',
        issue: 'Terminal height below minimum',
        expected: `>= ${this.config.terminalMinHeight}px`,
        actual: `${Math.round(measurements.container.dimensions.height)}px`,
        suggestion: 'Increase terminal height or reduce statusline height'
      });
    }

    // Check statusline height if present
    if (measurements.statusline) {
      const statuslineHeight = measurements.statusline.dimensions.height;
      
      if (Math.abs(statuslineHeight - this.config.statuslineHeight) > 5) {
        warnings.push(
          `Statusline height (${Math.round(statuslineHeight)}px) differs from expected (${this.config.statuslineHeight}px)`
        );
      }
    }

    // Check for scroll capability
    if (!measurements.scrollableArea.canScroll && measurements.scrollableArea.height > 0) {
      warnings.push('Terminal may not be scrollable - check content accessibility');
    }

    // Check z-index conflicts
    if (measurements.statusline && measurements.settingsButton) {
      const statuslineZ = parseInt(measurements.statusline.computedStyle.zIndex || '0');
      
      if (statuslineZ >= 9999) {
        issues.push({
          severity: 'error',
          component: 'statusline',
          issue: 'Statusline z-index too high',
          actual: statuslineZ,
          expected: '< 9999',
          suggestion: 'Reduce statusline z-index to avoid dropdown conflicts'
        });
      }
    }
  }

  private createEmptyMeasurements(): TerminalMeasurements {
    const emptyRect = new DOMRect(0, 0, 0, 0);
    const emptyMeasurement: LayoutMeasurement = {
      element: 'empty',
      dimensions: emptyRect,
      computedStyle: {},
      timestamp: Date.now()
    };

    return {
      container: emptyMeasurement,
      xterm: null,
      statusline: null,
      settingsButton: null,
      scrollableArea: { height: 0, scrollHeight: 0, canScroll: false },
      viewport: { width: 0, height: 0 }
    };
  }
}

// Export singleton instance
export const statuslineLayoutValidator = new StatuslineLayoutValidator();