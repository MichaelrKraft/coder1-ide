/**
 * Review Queue API Routes
 * Provides endpoints for reviewing and managing pending content
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const QUEUE_DIR = path.join(__dirname, '../review-queue');
const PENDING_DIR = path.join(QUEUE_DIR, 'pending');
const APPROVED_DIR = path.join(QUEUE_DIR, 'approved');
const REJECTED_DIR = path.join(QUEUE_DIR, 'rejected');

/**
 * Get all pending items
 */
router.get('/pending', async (req, res) => {
  try {
    const files = await fs.readdir(PENDING_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const items = await Promise.all(
      jsonFiles.map(async (file) => {
        const filepath = path.join(PENDING_DIR, file);
        const content = await fs.readFile(filepath, 'utf8');
        return JSON.parse(content);
      })
    );
    
    // Sort by created_at (newest first)
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({
      success: true,
      count: items.length,
      items: items
    });
  } catch (error) {
    console.error('Error reading pending items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get single item by ID
 */
router.get('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const files = await fs.readdir(PENDING_DIR);
    const file = files.find(f => f.includes(id));
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    const filepath = path.join(PENDING_DIR, file);
    const content = await fs.readFile(filepath, 'utf8');
    const item = JSON.parse(content);
    
    res.json({
      success: true,
      item: item
    });
  } catch (error) {
    console.error('Error reading item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Approve an item
 */
router.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const files = await fs.readdir(PENDING_DIR);
    const file = files.find(f => f.includes(id));
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Ensure approved directory exists
    await fs.mkdir(APPROVED_DIR, { recursive: true });
    
    // Read item and update status
    const sourcePath = path.join(PENDING_DIR, file);
    const content = await fs.readFile(sourcePath, 'utf8');
    const item = JSON.parse(content);
    
    item.status = 'approved';
    item.approved_at = new Date().toISOString();
    item.approved_by = req.body.approver || 'manual';
    
    // Move to approved directory
    const destPath = path.join(APPROVED_DIR, file);
    await fs.writeFile(destPath, JSON.stringify(item, null, 2));
    await fs.unlink(sourcePath);
    
    console.log(`✅ Approved: ${item.type} - ${item.topic || item.title || id}`);
    
    res.json({
      success: true,
      message: 'Item approved successfully',
      item: item
    });
  } catch (error) {
    console.error('Error approving item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Reject an item
 */
router.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const files = await fs.readdir(PENDING_DIR);
    const file = files.find(f => f.includes(id));
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Ensure rejected directory exists
    await fs.mkdir(REJECTED_DIR, { recursive: true });
    
    // Read item and update status
    const sourcePath = path.join(PENDING_DIR, file);
    const content = await fs.readFile(sourcePath, 'utf8');
    const item = JSON.parse(content);
    
    item.status = 'rejected';
    item.rejected_at = new Date().toISOString();
    item.rejected_by = req.body.rejector || 'manual';
    item.rejection_reason = reason || 'No reason provided';
    
    // Move to rejected directory
    const destPath = path.join(REJECTED_DIR, file);
    await fs.writeFile(destPath, JSON.stringify(item, null, 2));
    await fs.unlink(sourcePath);
    
    console.log(`❌ Rejected: ${item.type} - ${item.topic || item.title || id}`);
    
    res.json({
      success: true,
      message: 'Item rejected successfully',
      item: item
    });
  } catch (error) {
    console.error('Error rejecting item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Edit an item
 */
router.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, draft_response, script, title, topic } = req.body;
    const files = await fs.readdir(PENDING_DIR);
    const file = files.find(f => f.includes(id));
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Read item and update content
    const filepath = path.join(PENDING_DIR, file);
    const fileContent = await fs.readFile(filepath, 'utf8');
    const item = JSON.parse(fileContent);
    
    // Update fields
    if (content !== undefined) item.content = content;
    if (draft_response !== undefined) item.draft_response = draft_response;
    if (script !== undefined) item.script = script;
    if (title !== undefined) item.title = title;
    if (topic !== undefined) item.topic = topic;
    
    item.edited_at = new Date().toISOString();
    item.edited = true;
    
    // Save updated item
    await fs.writeFile(filepath, JSON.stringify(item, null, 2));
    
    console.log(`✏️  Edited: ${item.type} - ${item.topic || item.title || id}`);
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      item: item
    });
  } catch (error) {
    console.error('Error editing item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get stats
 */
router.get('/stats', async (req, res) => {
  try {
    const pendingFiles = await fs.readdir(PENDING_DIR);
    const approvedFiles = await fs.readdir(APPROVED_DIR).catch(() => []);
    const rejectedFiles = await fs.readdir(REJECTED_DIR).catch(() => []);
    
    const pending = pendingFiles.filter(f => f.endsWith('.json')).length;
    const approved = approvedFiles.filter(f => f.endsWith('.json')).length;
    const rejected = rejectedFiles.filter(f => f.endsWith('.json')).length;
    
    res.json({
      success: true,
      stats: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected
      }
    });
  } catch (error) {
    console.error('Error reading stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
