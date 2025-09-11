/**
 * Session Cleanup Utility
 * Identifies and removes duplicate sessions based on timestamp
 */

import fs from 'fs/promises';
import path from 'path';

interface SessionMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  lastUpdated?: string;
  metadata?: any;
}

interface DuplicateGroup {
  timestamp: number;
  sessions: string[];
}

export class SessionCleanupUtility {
  private dataDir: string;
  
  constructor(dataDir: string = path.join(process.cwd(), 'data', 'sessions')) {
    this.dataDir = dataDir;
  }
  
  /**
   * Scan for duplicate sessions based on timestamp
   */
  async findDuplicateSessions(): Promise<DuplicateGroup[]> {
    const duplicates: Map<number, string[]> = new Map();
    
    try {
      const sessionDirs = await fs.readdir(this.dataDir);
      
      for (const sessionDir of sessionDirs) {
        // Extract timestamp from session ID (e.g., session_1757222103224_h18xrx2r0tk)
        const match = sessionDir.match(/session_(\d+)_/);
        if (match) {
          const timestamp = parseInt(match[1]);
          
          if (!duplicates.has(timestamp)) {
            duplicates.set(timestamp, []);
          }
          duplicates.get(timestamp)!.push(sessionDir);
        }
      }
      
      // Filter to only include groups with duplicates
      const duplicateGroups: DuplicateGroup[] = [];
      for (const [timestamp, sessions] of duplicates.entries()) {
        if (sessions.length > 1) {
          duplicateGroups.push({ timestamp, sessions });
        }
      }
      
      return duplicateGroups;
    } catch (error) {
      console.error('Error finding duplicate sessions:', error);
      return [];
    }
  }
  
  /**
   * Merge duplicate sessions, preserving all checkpoints
   */
  async mergeDuplicateSessions(group: DuplicateGroup): Promise<void> {
    if (group.sessions.length < 2) return;
    
    console.log(`Merging ${group.sessions.length} duplicate sessions from timestamp ${group.timestamp}`);
    
    // Use the first session as the primary
    const primarySession = group.sessions[0];
    const primaryDir = path.join(this.dataDir, primarySession);
    
    // Collect all checkpoints from duplicate sessions
    const allCheckpoints: string[] = [];
    
    for (let i = 1; i < group.sessions.length; i++) {
      const duplicateDir = path.join(this.dataDir, group.sessions[i]);
      const checkpointsDir = path.join(duplicateDir, 'checkpoints');
      
      try {
        const checkpoints = await fs.readdir(checkpointsDir);
        
        // Copy checkpoints to primary session
        for (const checkpoint of checkpoints) {
          const sourcePath = path.join(checkpointsDir, checkpoint);
          const destPath = path.join(primaryDir, 'checkpoints', `merged_${i}_${checkpoint}`);
          
          await fs.copyFile(sourcePath, destPath);
          allCheckpoints.push(`merged_${i}_${checkpoint}`);
        }
        
        // Remove the duplicate session directory
        await fs.rm(duplicateDir, { recursive: true });
        console.log(`  - Removed duplicate session: ${group.sessions[i]}`);
        
      } catch (error) {
        console.error(`  - Error processing duplicate ${group.sessions[i]}:`, error);
      }
    }
    
    if (allCheckpoints.length > 0) {
      console.log(`  - Merged ${allCheckpoints.length} checkpoints into ${primarySession}`);
    }
  }
  
  /**
   * Clean all duplicate sessions
   */
  async cleanAllDuplicates(): Promise<void> {
    console.log('Starting session cleanup...');
    
    const duplicateGroups = await this.findDuplicateSessions();
    
    if (duplicateGroups.length === 0) {
      console.log('No duplicate sessions found.');
      return;
    }
    
    console.log(`Found ${duplicateGroups.length} groups of duplicate sessions`);
    
    for (const group of duplicateGroups) {
      await this.mergeDuplicateSessions(group);
    }
    
    console.log('Session cleanup complete!');
  }
  
  /**
   * Fix session metadata naming (CoderOne -> Coder1)
   */
  async fixSessionNaming(): Promise<void> {
    console.log('Fixing session naming conventions...');
    
    try {
      const sessionDirs = await fs.readdir(this.dataDir);
      let fixedCount = 0;
      
      for (const sessionDir of sessionDirs) {
        const metadataPath = path.join(this.dataDir, sessionDir, 'metadata.json');
        
        try {
          const content = await fs.readFile(metadataPath, 'utf8');
          const metadata: SessionMetadata = JSON.parse(content);
          
          let updated = false;
          
          // Fix description
          if (metadata.description?.includes('CoderOne')) {
            metadata.description = metadata.description.replace(/CoderOne/g, 'Coder1');
            updated = true;
          }
          
          // Fix name if it's generic
          if (metadata.name?.includes('CoderOne')) {
            metadata.name = metadata.name.replace(/CoderOne/g, 'Coder1');
            updated = true;
          }
          
          if (updated) {
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            fixedCount++;
            console.log(`  - Fixed naming in session: ${sessionDir}`);
          }
          
        } catch (error) {
          // Skip if metadata file doesn't exist or is invalid
        }
      }
      
      console.log(`Fixed naming in ${fixedCount} sessions`);
      
    } catch (error) {
      console.error('Error fixing session naming:', error);
    }
  }
  
  /**
   * Run full cleanup process
   */
  async runFullCleanup(): Promise<void> {
    console.log('=== Starting Full Session Cleanup ===\n');
    
    // Step 1: Clean duplicates
    await this.cleanAllDuplicates();
    console.log('');
    
    // Step 2: Fix naming
    await this.fixSessionNaming();
    console.log('');
    
    console.log('=== Cleanup Complete ===');
  }
}

// Export for use in API route or standalone script
export default SessionCleanupUtility;