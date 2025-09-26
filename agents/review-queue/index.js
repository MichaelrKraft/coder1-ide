/**
 * Review Queue System
 * Manages pending, approved, and rejected drafts
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ReviewQueue {
  constructor() {
    this.basePath = __dirname;
    this.paths = {
      pending: path.join(this.basePath, 'pending'),
      approved: path.join(this.basePath, 'approved'),
      rejected: path.join(this.basePath, 'rejected')
    };
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure all queue directories exist
   */
  async ensureDirectories() {
    for (const dir of Object.values(this.paths)) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Add a draft to the pending queue
   */
  async add(draft) {
    const id = uuidv4();
    const queueItem = {
      id,
      ...draft,
      queued_at: new Date().toISOString(),
      status: 'pending'
    };
    
    const filePath = path.join(this.paths.pending, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(queueItem, null, 2));
    
    console.log(`📥 Added to queue: ${id}`);
    return id;
  }

  /**
   * Get a specific item from any queue
   */
  async get(id) {
    // Check all queues
    for (const [status, dirPath] of Object.entries(this.paths)) {
      const filePath = path.join(dirPath, `${id}.json`);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        return { ...JSON.parse(data), current_status: status };
      } catch {
        // File doesn't exist in this queue
        continue;
      }
    }
    
    throw new Error(`Queue item ${id} not found`);
  }

  /**
   * Approve a pending item
   */
  async approve(id, editedContent = null) {
    const pendingPath = path.join(this.paths.pending, `${id}.json`);
    const approvedPath = path.join(this.paths.approved, `${id}.json`);
    
    try {
      // Read the pending item
      const data = await fs.readFile(pendingPath, 'utf-8');
      const item = JSON.parse(data);
      
      // Update with approval info
      item.status = 'approved';
      item.approved_at = new Date().toISOString();
      
      // If edited content provided, update it
      if (editedContent) {
        item.draft_response = editedContent;
        item.edited = true;
      }
      
      // Move to approved
      await fs.writeFile(approvedPath, JSON.stringify(item, null, 2));
      await fs.unlink(pendingPath);
      
      console.log(`✅ Approved: ${id}`);
      return item;
    } catch (error) {
      throw new Error(`Failed to approve ${id}: ${error.message}`);
    }
  }

  /**
   * Reject a pending item
   */
  async reject(id, reason = '') {
    const pendingPath = path.join(this.paths.pending, `${id}.json`);
    const rejectedPath = path.join(this.paths.rejected, `${id}.json`);
    
    try {
      // Read the pending item
      const data = await fs.readFile(pendingPath, 'utf-8');
      const item = JSON.parse(data);
      
      // Update with rejection info
      item.status = 'rejected';
      item.rejected_at = new Date().toISOString();
      item.rejection_reason = reason;
      
      // Move to rejected
      await fs.writeFile(rejectedPath, JSON.stringify(item, null, 2));
      await fs.unlink(pendingPath);
      
      console.log(`❌ Rejected: ${id}`);
      return item;
    } catch (error) {
      throw new Error(`Failed to reject ${id}: ${error.message}`);
    }
  }

  /**
   * Get all pending items
   */
  async getPending() {
    return this.getItemsFromQueue('pending');
  }

  /**
   * Get all approved items ready to execute
   */
  async getApproved() {
    return this.getItemsFromQueue('approved');
  }

  /**
   * Get all rejected items
   */
  async getRejected() {
    return this.getItemsFromQueue('rejected');
  }

  /**
   * Get items from a specific queue
   */
  async getItemsFromQueue(queueName) {
    const dirPath = this.paths[queueName];
    try {
      const files = await fs.readdir(dirPath);
      const items = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(dirPath, file), 'utf-8');
          items.push(JSON.parse(data));
        }
      }
      
      // Sort by creation date
      items.sort((a, b) => new Date(a.queued_at) - new Date(b.queued_at));
      return items;
    } catch (error) {
      console.error(`Error reading ${queueName} queue:`, error);
      return [];
    }
  }

  /**
   * Execute an approved item (mark as executed and move to archive)
   */
  async markExecuted(id) {
    const approvedPath = path.join(this.paths.approved, `${id}.json`);
    const archivePath = path.join(this.basePath, 'archive');
    
    try {
      // Ensure archive directory exists
      await fs.mkdir(archivePath, { recursive: true });
      
      // Read the approved item
      const data = await fs.readFile(approvedPath, 'utf-8');
      const item = JSON.parse(data);
      
      // Update with execution info
      item.status = 'executed';
      item.executed_at = new Date().toISOString();
      
      // Move to archive with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivedPath = path.join(archivePath, `${timestamp}-${id}.json`);
      await fs.writeFile(archivedPath, JSON.stringify(item, null, 2));
      await fs.unlink(approvedPath);
      
      console.log(`🚀 Executed and archived: ${id}`);
      return item;
    } catch (error) {
      throw new Error(`Failed to mark as executed ${id}: ${error.message}`);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [pending, approved, rejected] = await Promise.all([
      this.getPending(),
      this.getApproved(),
      this.getRejected()
    ]);
    
    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      total: pending.length + approved.length + rejected.length,
      breakdown: {
        byType: this.groupByType([...pending, ...approved, ...rejected]),
        byPriority: this.groupByPriority(pending)
      }
    };
  }

  /**
   * Group items by type
   */
  groupByType(items) {
    const groups = {};
    for (const item of items) {
      groups[item.type] = (groups[item.type] || 0) + 1;
    }
    return groups;
  }

  /**
   * Group items by priority
   */
  groupByPriority(items) {
    const groups = { high: 0, medium: 0, low: 0 };
    for (const item of items) {
      const priority = item.metadata?.priority || 'low';
      groups[priority]++;
    }
    return groups;
  }

  /**
   * Clean up old rejected items (older than 7 days)
   */
  async cleanupRejected() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const rejected = await this.getRejected();
    let cleaned = 0;
    
    for (const item of rejected) {
      if (new Date(item.rejected_at) < sevenDaysAgo) {
        const filePath = path.join(this.paths.rejected, `${item.id}.json`);
        await fs.unlink(filePath);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old rejected items`);
    }
    
    return cleaned;
  }
}

module.exports = ReviewQueue;