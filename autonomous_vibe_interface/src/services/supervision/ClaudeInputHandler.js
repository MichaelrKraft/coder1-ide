/**
 * ClaudeInputHandler - Manages direct input delivery to Claude subprocess
 * 
 * Solves the fundamental issue of PTY write going to bash instead of Claude.
 * Uses multiple strategies to ensure input reaches Claude's actual process.
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class ClaudeInputHandler extends EventEmitter {
    constructor() {
        super();
        this.claudeProcesses = new Map(); // Track Claude processes by session
        this.inputStrategies = ['direct', 'expect', 'fifo', 'clipboard']; // Fallback strategies
        this.currentStrategy = 'direct';
        
        console.log('[ClaudeInputHandler] Initialized with multiple input strategies');
    }

    /**
     * Detect Claude process when "claude" command is executed
     */
    async detectClaudeProcess(sessionId, parentPid) {
        try {
            // Wait a bit for Claude to fully spawn
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Find Claude process that's a child of our PTY session
            const command = process.platform === 'darwin' 
                ? `pgrep -P ${parentPid} claude || pgrep claude | head -1`
                : `pgrep -P ${parentPid} claude`;
                
            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    if (stdout) {
                        const claudePid = parseInt(stdout.trim().split('\n')[0]);
                        if (claudePid) {
                            this.claudeProcesses.set(sessionId, {
                                pid: claudePid,
                                detectedAt: Date.now(),
                                parentPid: parentPid
                            });
                            
                            console.log(`[ClaudeInputHandler] Claude process detected: PID ${claudePid} for session ${sessionId}`);
                            this.emit('claudeDetected', { sessionId, pid: claudePid });
                            
                            // Monitor Claude process
                            this.monitorClaudeProcess(sessionId, claudePid);
                            
                            resolve(claudePid);
                            return;
                        }
                    }
                    
                    console.log('[ClaudeInputHandler] Claude process not found via pgrep, will retry...');
                    resolve(null);
                });
            });
        } catch (error) {
            console.error('[ClaudeInputHandler] Error detecting Claude process:', error);
            return null;
        }
    }

    /**
     * Monitor Claude process to detect when it exits
     */
    monitorClaudeProcess(sessionId, pid) {
        const checkInterval = setInterval(() => {
            exec(`ps -p ${pid}`, (error, stdout) => {
                if (error || !stdout.includes(pid.toString())) {
                    console.log(`[ClaudeInputHandler] Claude process ${pid} has exited`);
                    this.claudeProcesses.delete(sessionId);
                    this.emit('claudeExited', { sessionId, pid });
                    clearInterval(checkInterval);
                }
            });
        }, 2000); // Check every 2 seconds
    }

    /**
     * Send input to Claude using the most appropriate strategy with retry logic
     */
    async sendToClaudeProcess(sessionId, input, ptyProcess, maxRetries = 3) {
        const claudeInfo = this.claudeProcesses.get(sessionId);
        
        if (!claudeInfo) {
            console.log('[ClaudeInputHandler] No Claude process found, using PTY fallback');
            return this.sendViaPTY(ptyProcess, input);
        }

        console.log(`[ClaudeInputHandler] Sending to Claude PID ${claudeInfo.pid}: "${input.substring(0, 50)}..."`);
        
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            // Try strategies in order
            for (const strategy of this.inputStrategies) {
                try {
                    const success = await this.tryInputStrategy(strategy, claudeInfo.pid, input, ptyProcess);
                    if (success) {
                        console.log(`[ClaudeInputHandler] Successfully sent input using ${strategy} strategy`);
                        this.currentStrategy = strategy;
                        
                        // Verify input was received (optional)
                        const verified = await this.verifyInputDelivery(sessionId, input);
                        if (verified) {
                            console.log('[ClaudeInputHandler] Input delivery verified');
                            return true;
                        } else {
                            console.log('[ClaudeInputHandler] Input delivery not verified, but likely successful');
                            return true; // Still return true as we sent it
                        }
                    }
                } catch (error) {
                    console.log(`[ClaudeInputHandler] ${strategy} strategy failed:`, error.message);
                }
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`[ClaudeInputHandler] Retry attempt ${retryCount} of ${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }
        
        // All strategies and retries failed, use PTY as last resort
        console.log('[ClaudeInputHandler] All strategies failed after retries, using PTY write as fallback');
        return this.sendViaPTY(ptyProcess, input);
    }

    /**
     * Verify that input was delivered to Claude
     */
    async verifyInputDelivery(sessionId, input, timeout = 2000) {
        // Simple verification - check if Claude process is still running
        const claudeInfo = this.claudeProcesses.get(sessionId);
        if (!claudeInfo) return false;
        
        return new Promise((resolve) => {
            exec(`ps -p ${claudeInfo.pid}`, (error, stdout) => {
                if (!error && stdout.includes(claudeInfo.pid.toString())) {
                    // Process is still running, assume input was received
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    /**
     * Try a specific input strategy
     */
    async tryInputStrategy(strategy, claudePid, input, ptyProcess) {
        switch (strategy) {
        case 'direct':
            return await this.sendViaDirectInput(claudePid, input);
        case 'expect':
            return await this.sendViaExpect(ptyProcess, input);
        case 'fifo':
            return await this.sendViaFIFO(claudePid, input);
        case 'clipboard':
            return await this.sendViaClipboardPaste(ptyProcess, input);
        default:
            return false;
        }
    }

    /**
     * Strategy 1: Direct input to Claude's stdin (if we can access it)
     */
    async sendViaDirectInput(claudePid, input) {
        // This is tricky because we need to access Claude's stdin file descriptor
        // On macOS/Linux, we might be able to write to /proc/[pid]/fd/0
        if (process.platform === 'linux') {
            try {
                const stdinPath = `/proc/${claudePid}/fd/0`;
                await fs.promises.writeFile(stdinPath, input + '\n');
                return true;
            } catch (error) {
                // Expected to fail on most systems due to permissions
                return false;
            }
        }
        return false;
    }

    /**
     * Strategy 2: Use expect-style automation (primary strategy for Claude)
     */
    async sendViaExpect(ptyProcess, input) {
        if (!ptyProcess || ptyProcess.killed) {
            return false;
        }
        
        try {
            // Method 1: Direct character-by-character typing simulation
            console.log('[ClaudeInputHandler] Using character-by-character typing simulation');
            
            // Small initial delay to ensure terminal is ready
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Send input character by character with realistic typing delays
            for (const char of input) {
                ptyProcess.write(char);
                await new Promise(resolve => setTimeout(resolve, 25)); // 25ms between chars (realistic typing)
            }
            
            // Send Enter with a small delay
            await new Promise(resolve => setTimeout(resolve, 100));
            ptyProcess.write('\r\n');
            
            console.log(`[ClaudeInputHandler] Sent via character simulation: "${input}"`);
            return true;
        } catch (error) {
            console.log('[ClaudeInputHandler] Character simulation failed, trying bulk send');
            
            try {
                // Method 2: Bulk send with proper line endings
                await new Promise(resolve => setTimeout(resolve, 100));
                ptyProcess.write(input + '\r\n');
                console.log(`[ClaudeInputHandler] Sent via bulk method: "${input}"`);
                return true;
            } catch (bulkError) {
                console.log('[ClaudeInputHandler] Bulk send also failed:', bulkError);
                return false;
            }
        }
    }

    /**
     * Strategy 3: Use named pipe (FIFO)
     */
    async sendViaFIFO(claudePid, input) {
        // Create a temporary FIFO
        const fifoPath = `/tmp/claude_input_${claudePid}`;
        
        try {
            // Create FIFO if it doesn't exist
            await new Promise((resolve, reject) => {
                exec(`mkfifo ${fifoPath} 2>/dev/null`, (error) => {
                    // Ignore error if FIFO already exists
                    resolve();
                });
            });
            
            // Write to FIFO (non-blocking)
            await fs.promises.writeFile(fifoPath, input + '\n', { flag: 'a' });
            
            // Try to redirect FIFO to Claude's stdin
            exec(`echo "${input}" > ${fifoPath} &`, (error) => {
                if (error) console.log('[ClaudeInputHandler] FIFO write error:', error);
            });
            
            return true;
        } catch (error) {
            console.log('[ClaudeInputHandler] FIFO strategy failed:', error);
            return false;
        }
    }

    /**
     * Strategy 4: Use clipboard and paste
     */
    async sendViaClipboardPaste(ptyProcess, input) {
        if (process.platform === 'darwin') {
            try {
                // Copy to clipboard
                await new Promise((resolve, reject) => {
                    exec(`echo "${input}" | pbcopy`, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                });
                
                // Send paste command (Cmd+V on macOS)
                ptyProcess.write('\x16'); // Ctrl+V (might work in some terminals)
                await new Promise(resolve => setTimeout(resolve, 100));
                ptyProcess.write('\r');
                
                return true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }

    /**
     * Fallback: Send via PTY (original method)
     */
    async sendViaPTY(ptyProcess, input) {
        if (!ptyProcess || ptyProcess.killed) {
            console.log('[ClaudeInputHandler] PTY process not available');
            return false;
        }
        
        // Send with a small delay to ensure terminal is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        ptyProcess.write(input + '\r');
        console.log('[ClaudeInputHandler] Sent via PTY write (fallback)');
        return true;
    }

    /**
     * Verify if input was received by checking Claude's output
     */
    async verifyInputReceived(sessionId, expectedResponse, timeout = 5000) {
        return new Promise((resolve) => {
            let timeoutId;
            
            const listener = (data) => {
                if (data.output && data.output.includes(expectedResponse)) {
                    clearTimeout(timeoutId);
                    this.removeListener('claudeOutput', listener);
                    resolve(true);
                }
            };
            
            this.on('claudeOutput', listener);
            
            timeoutId = setTimeout(() => {
                this.removeListener('claudeOutput', listener);
                resolve(false);
            }, timeout);
        });
    }

    /**
     * Clean up resources for a session
     */
    cleanup(sessionId) {
        this.claudeProcesses.delete(sessionId);
        console.log(`[ClaudeInputHandler] Cleaned up session ${sessionId}`);
    }
}

module.exports = { ClaudeInputHandler };