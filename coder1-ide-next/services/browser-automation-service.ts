/**
 * Browser Automation Service for Coder1 IDE Mission Control
 *
 * Handles natural language test commands, Playwright code generation,
 * test execution via Playwright MCP, and recording/playback functionality.
 */

import { BrowserSession, BrowserCommand, CommandResult } from '@/types/mission-control';

interface PlaywrightAction {
  type: 'navigate' | 'click' | 'fill' | 'screenshot' | 'hover' | 'select' | 'wait' | 'evaluate';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  code?: string;
}

interface TestResult {
  testId: string;
  status: 'success' | 'failed' | 'running';
  duration: number;
  actions: PlaywrightAction[];
  screenshots: string[];
  error?: string;
  playwrightCode?: string;
}

interface RecordingSession {
  sessionId: string;
  startTime: Date;
  actions: PlaywrightAction[];
  isRecording: boolean;
}

/**
 * Browser Automation Service
 * Manages test execution, recording, and natural language parsing
 */
export class BrowserAutomationService {
  private testHistory: Map<string, TestResult> = new Map();
  private recordingSessions: Map<string, RecordingSession> = new Map();
  private testCounter: number = 0;

  /**
   * Parse natural language command to Playwright actions
   *
   * Examples:
   * - "Go to google.com" → navigate action
   * - "Click the login button" → click action
   * - "Fill email with test@example.com" → fill action
   */
  public parseNaturalLanguage(command: string): PlaywrightAction[] {
    const actions: PlaywrightAction[] = [];
    const lowerCommand = command.toLowerCase().trim();

    // Navigate patterns
    if (lowerCommand.match(/go to|navigate to|visit|open/)) {
      const urlMatch = lowerCommand.match(/(?:go to|navigate to|visit|open)\s+([^\s]+)/);
      if (urlMatch) {
        let url = urlMatch[1];
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        actions.push({ type: 'navigate', url });
      }
    }

    // Click patterns
    if (lowerCommand.match(/click|press|tap/)) {
      const selectorMatch = lowerCommand.match(/(?:click|press|tap)\s+(?:the\s+)?(?:on\s+)?["']?([^"']+?)["']?(?:\s+button|\s+link|\s+element)?$/);
      if (selectorMatch) {
        const text = selectorMatch[1].trim();
        // Generate selector based on text
        const selector = `text=${text}`;
        actions.push({ type: 'click', selector });
      }
    }

    // Fill/type patterns
    if (lowerCommand.match(/fill|type|enter|input/)) {
      const fillMatch = lowerCommand.match(/(?:fill|type|enter|input)\s+["']?([^"']+?)["']?\s+(?:with|as)\s+["']?([^"']+?)["']?$/);
      if (fillMatch) {
        const field = fillMatch[1].trim();
        const value = fillMatch[2].trim();
        const selector = `[name="${field}"], [placeholder*="${field}" i], label:has-text("${field}") + input`;
        actions.push({ type: 'fill', selector, value });
      }
    }

    // Screenshot patterns
    if (lowerCommand.match(/screenshot|capture|snap/)) {
      actions.push({ type: 'screenshot' });
    }

    // Wait patterns
    if (lowerCommand.match(/wait|pause|sleep/)) {
      const timeMatch = lowerCommand.match(/(\d+)\s*(second|sec|ms|millisecond)/);
      const timeout = timeMatch ?
        (timeMatch[2].startsWith('s') ? parseInt(timeMatch[1]) * 1000 : parseInt(timeMatch[1])) :
        2000;
      actions.push({ type: 'wait', timeout });
    }

    // Hover patterns
    if (lowerCommand.match(/hover|mouseover/)) {
      const selectorMatch = lowerCommand.match(/(?:hover|mouseover)\s+(?:over\s+)?["']?([^"']+?)["']?$/);
      if (selectorMatch) {
        const text = selectorMatch[1].trim();
        const selector = `text=${text}`;
        actions.push({ type: 'hover', selector });
      }
    }

    // Select patterns
    if (lowerCommand.match(/select|choose/)) {
      const selectMatch = lowerCommand.match(/(?:select|choose)\s+["']?([^"']+?)["']?\s+from\s+["']?([^"']+?)["']?$/);
      if (selectMatch) {
        const value = selectMatch[1].trim();
        const field = selectMatch[2].trim();
        const selector = `select[name="${field}"], label:has-text("${field}") + select`;
        actions.push({ type: 'select', selector, value });
      }
    }

    return actions;
  }

  /**
   * Execute test with Playwright actions
   * Note: Actual MCP tool calls should be made by the API route
   */
  public async executeTest(
    testId: string,
    actions: PlaywrightAction[]
  ): Promise<TestResult> {
    const startTime = Date.now();

    const result: TestResult = {
      testId,
      status: 'running',
      duration: 0,
      actions,
      screenshots: [],
      playwrightCode: this.generatePlaywrightCode(actions)
    };

    // Store in history immediately
    this.testHistory.set(testId, result);

    try {
      // The actual execution happens in the API route using MCP tools
      // This is a placeholder for the service-level logic

      const endTime = Date.now();
      result.duration = endTime - startTime;
      result.status = 'success';

      this.testHistory.set(testId, result);
      return result;
    } catch (error) {
      const endTime = Date.now();
      result.duration = endTime - startTime;
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';

      this.testHistory.set(testId, result);
      return result;
    }
  }

  /**
   * Start recording browser actions
   */
  public startRecording(sessionId: string): RecordingSession {
    const session: RecordingSession = {
      sessionId,
      startTime: new Date(),
      actions: [],
      isRecording: true
    };

    this.recordingSessions.set(sessionId, session);
    return session;
  }

  /**
   * Stop recording and return recorded actions
   */
  public stopRecording(sessionId: string): {
    actions: PlaywrightAction[],
    playwrightCode: string
  } | null {
    const session = this.recordingSessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.isRecording = false;
    const actions = session.actions;
    const playwrightCode = this.generatePlaywrightCode(actions);

    // Clean up session
    this.recordingSessions.delete(sessionId);

    return { actions, playwrightCode };
  }

  /**
   * Add action to recording session
   */
  public recordAction(sessionId: string, action: PlaywrightAction): boolean {
    const session = this.recordingSessions.get(sessionId);
    if (!session || !session.isRecording) {
      return false;
    }

    session.actions.push(action);
    return true;
  }

  /**
   * Get test results by ID
   */
  public getTestResults(testId: string): TestResult | undefined {
    return this.testHistory.get(testId);
  }

  /**
   * Get all test history
   */
  public getAllTestHistory(): TestResult[] {
    return Array.from(this.testHistory.values())
      .sort((a, b) => b.testId.localeCompare(a.testId)); // Most recent first
  }

  /**
   * Generate unique test ID
   */
  public generateTestId(): string {
    this.testCounter++;
    return `test-${Date.now()}-${this.testCounter}`;
  }

  /**
   * Generate Playwright code from actions
   */
  public generatePlaywrightCode(actions: PlaywrightAction[]): string {
    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test('Generated test', async ({ page }) => {\n`;

    for (const action of actions) {
      switch (action.type) {
        case 'navigate':
          code += `  await page.goto('${action.url}');\n`;
          break;
        case 'click':
          code += `  await page.locator('${action.selector}').click();\n`;
          break;
        case 'fill':
          code += `  await page.locator('${action.selector}').fill('${action.value}');\n`;
          break;
        case 'screenshot':
          code += `  await page.screenshot({ path: 'screenshot.png' });\n`;
          break;
        case 'hover':
          code += `  await page.locator('${action.selector}').hover();\n`;
          break;
        case 'select':
          code += `  await page.locator('${action.selector}').selectOption('${action.value}');\n`;
          break;
        case 'wait':
          code += `  await page.waitForTimeout(${action.timeout || 1000});\n`;
          break;
        case 'evaluate':
          code += `  await page.evaluate(() => { ${action.code} });\n`;
          break;
      }
    }

    code += `});\n`;
    return code;
  }

  /**
   * Clear test history (for cleanup)
   */
  public clearHistory(): void {
    this.testHistory.clear();
  }

  /**
   * Get active recording sessions count
   */
  public getActiveRecordingsCount(): number {
    return Array.from(this.recordingSessions.values())
      .filter(s => s.isRecording).length;
  }
}

// Export singleton instance
export const browserAutomationService = new BrowserAutomationService();
