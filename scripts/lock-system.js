#!/usr/bin/env node

/**
 * Coder1 IDE Agent Lock System
 * Prevents multiple agents from modifying the same files simultaneously
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOCK_DIR = path.join(__dirname, '../.coder1/locks');
const AGENT_LOG = path.join(__dirname, '../.coder1/agent-activity.log');

// Ensure lock directory exists
if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
}

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    const colorCode = colors[color] || colors.reset;
    console.log(`${colorCode}[${timestamp}] ${message}${colors.reset}`);
    
    // Also log to file
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(AGENT_LOG, logMessage);
}

function generateAgentId() {
    return `agent-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function createLock(agentId, taskDescription, files = []) {
    const lockData = {
        agentId,
        taskDescription,
        files,
        startTime: new Date().toISOString(),
        pid: process.pid,
        hostname: require('os').hostname(),
        status: 'active'
    };
    
    const lockFile = path.join(LOCK_DIR, `${agentId}.lock`);
    
    try {
        fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2));
        log(`🔒 Lock created: ${agentId} - ${taskDescription}`, 'green');
        log(`📁 Protected files: ${files.join(', ') || 'none specified'}`, 'blue');
        return true;
    } catch (error) {
        log(`❌ Failed to create lock: ${error.message}`, 'red');
        return false;
    }
}

function removeLock(agentId) {
    const lockFile = path.join(LOCK_DIR, `${agentId}.lock`);
    
    try {
        if (fs.existsSync(lockFile)) {
            const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
            fs.unlinkSync(lockFile);
            log(`🔓 Lock removed: ${agentId} - ${lockData.taskDescription}`, 'green');
            return true;
        }
        return false;
    } catch (error) {
        log(`❌ Failed to remove lock: ${error.message}`, 'red');
        return false;
    }
}

function checkConflicts(files = []) {
    const locks = getActiveLocks();
    const conflicts = [];
    
    for (const lock of locks) {
        if (lock.files && lock.files.length > 0) {
            const conflictingFiles = files.filter(file => 
                lock.files.some(lockedFile => 
                    file.includes(lockedFile) || lockedFile.includes(file)
                )
            );
            
            if (conflictingFiles.length > 0) {
                conflicts.push({
                    agentId: lock.agentId,
                    taskDescription: lock.taskDescription,
                    conflictingFiles
                });
            }
        }
    }
    
    return conflicts;
}

function getActiveLocks() {
    const locks = [];
    
    try {
        if (fs.existsSync(LOCK_DIR)) {
            const lockFiles = fs.readdirSync(LOCK_DIR).filter(f => f.endsWith('.lock'));
            
            for (const lockFile of lockFiles) {
                try {
                    const lockData = JSON.parse(fs.readFileSync(path.join(LOCK_DIR, lockFile), 'utf8'));
                    locks.push(lockData);
                } catch (error) {
                    log(`⚠️ Invalid lock file: ${lockFile}`, 'yellow');
                }
            }
        }
    } catch (error) {
        log(`❌ Failed to read locks: ${error.message}`, 'red');
    }
    
    return locks;
}

function cleanupOldLocks(maxAgeHours = 2) {
    const locks = getActiveLocks();
    const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    let cleaned = 0;
    
    for (const lock of locks) {
        const lockAge = new Date(lock.startTime);
        if (lockAge < cutoff) {
            removeLock(lock.agentId);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        log(`🧹 Cleaned up ${cleaned} old locks`, 'yellow');
    }
    
    return cleaned;
}

function showStatus() {
    const locks = getActiveLocks();
    
    if (locks.length === 0) {
        log('✅ No active locks - system is free', 'green');
        return;
    }
    
    log(`🔒 ${locks.length} active locks:`, 'blue');
    for (const lock of locks) {
        const duration = Math.round((Date.now() - new Date(lock.startTime)) / 1000 / 60);
        log(`  • ${lock.agentId}: ${lock.taskDescription} (${duration}m ago)`, 'blue');
        if (lock.files && lock.files.length > 0) {
            log(`    Files: ${lock.files.join(', ')}`, 'blue');
        }
    }
}

// CLI interface
function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            const agentId = process.argv[3] || generateAgentId();
            const taskDescription = process.argv[4] || 'Unspecified task';
            const files = process.argv.slice(5);
            
            // Check for conflicts first
            const conflicts = checkConflicts(files);
            if (conflicts.length > 0) {
                log('⚠️ Conflicts detected:', 'yellow');
                for (const conflict of conflicts) {
                    log(`  • Agent ${conflict.agentId}: ${conflict.taskDescription}`, 'red');
                    log(`    Conflicting files: ${conflict.conflictingFiles.join(', ')}`, 'red');
                }
                log('❌ Cannot create lock due to conflicts', 'red');
                process.exit(1);
            }
            
            if (createLock(agentId, taskDescription, files)) {
                console.log(agentId); // Return agent ID for scripts
            } else {
                process.exit(1);
            }
            break;
            
        case 'remove':
            const removeAgentId = process.argv[3];
            if (!removeAgentId) {
                log('❌ Agent ID required', 'red');
                process.exit(1);
            }
            removeLock(removeAgentId);
            break;
            
        case 'check':
            const checkFiles = process.argv.slice(3);
            const foundConflicts = checkConflicts(checkFiles);
            if (foundConflicts.length > 0) {
                log('⚠️ Conflicts found:', 'yellow');
                for (const conflict of foundConflicts) {
                    log(`  • ${conflict.agentId}: ${conflict.taskDescription}`, 'red');
                }
                process.exit(1);
            } else {
                log('✅ No conflicts found', 'green');
            }
            break;
            
        case 'status':
            showStatus();
            break;
            
        case 'cleanup':
            const maxAge = parseInt(process.argv[3]) || 2;
            cleanupOldLocks(maxAge);
            break;
            
        case 'clear':
            // Emergency clear all locks
            try {
                if (fs.existsSync(LOCK_DIR)) {
                    const lockFiles = fs.readdirSync(LOCK_DIR).filter(f => f.endsWith('.lock'));
                    for (const lockFile of lockFiles) {
                        fs.unlinkSync(path.join(LOCK_DIR, lockFile));
                    }
                    log(`🚨 Emergency: Cleared ${lockFiles.length} locks`, 'yellow');
                }
            } catch (error) {
                log(`❌ Failed to clear locks: ${error.message}`, 'red');
            }
            break;
            
        default:
            console.log(`
Coder1 IDE Lock System

Usage:
  node lock-system.js create [agent-id] [description] [file1] [file2] ...
  node lock-system.js remove <agent-id>
  node lock-system.js check [file1] [file2] ...
  node lock-system.js status
  node lock-system.js cleanup [hours]
  node lock-system.js clear

Examples:
  node lock-system.js create "Fixing StatusBar buttons" StatusBar.tsx
  node lock-system.js check StatusBar.tsx Terminal.tsx
  node lock-system.js status
  node lock-system.js cleanup 1
            `);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    createLock,
    removeLock,
    checkConflicts,
    getActiveLocks,
    cleanupOldLocks,
    showStatus
};