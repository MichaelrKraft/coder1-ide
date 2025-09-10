const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// In-memory storage for captured components (will persist to file later)
const capturedComponents = new Map();

// Component storage directory
const COMPONENTS_DIR = path.join(__dirname, '../../data/captured-components');

// Initialize storage directory
async function initializeStorage() {
    try {
        await fs.mkdir(COMPONENTS_DIR, { recursive: true });
        
        // Load existing components from disk
        const files = await fs.readdir(COMPONENTS_DIR);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(path.join(COMPONENTS_DIR, file), 'utf-8');
                const component = JSON.parse(data);
                capturedComponents.set(component.id, component);
            }
        }
        console.log(`📦 Loaded ${capturedComponents.size} captured components`);
    } catch (error) {
        console.error('Failed to initialize component storage:', error);
    }
}

// Initialize on module load
initializeStorage();

// Serve the beta components page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../CANONICAL/components-capture.html'));
});

// API: Save captured component (increased limit to 50mb for large components)
router.post('/api/save', express.json({ limit: '50mb' }), async (req, res) => {
    try {
        const { html, css, url, title, selector, screenshot } = req.body;
        
        if (!html || !css) {
            return res.status(400).json({ error: 'Missing required fields: html and css' });
        }
        
        // Generate unique ID
        const id = crypto.randomBytes(8).toString('hex');
        const timestamp = new Date().toISOString();
        
        const component = {
            id,
            title: title || 'Untitled Component',
            url: url || 'Unknown',
            selector: selector || 'body',
            html,
            css,
            screenshot: screenshot || null,
            timestamp,
            tags: [],
            category: 'uncategorized',
            framework: 'vanilla', // Will be detected later
            generatedCode: null // Will be populated by AI
        };
        
        // Save to memory
        capturedComponents.set(id, component);
        
        // Persist to disk
        await fs.writeFile(
            path.join(COMPONENTS_DIR, `${id}.json`),
            JSON.stringify(component, null, 2)
        );
        
        console.log(`✅ Saved component ${id}: ${component.title}`);
        
        res.json({
            success: true,
            id,
            message: 'Component captured successfully'
        });
    } catch (error) {
        console.error('Error saving component:', error);
        res.status(500).json({ error: 'Failed to save component' });
    }
});

// API: List all captured components
router.get('/api/list', (req, res) => {
    const components = Array.from(capturedComponents.values()).map(c => ({
        id: c.id,
        title: c.title,
        url: c.url,
        timestamp: c.timestamp,
        tags: c.tags,
        category: c.category,
        hasScreenshot: !!c.screenshot,
        hasGeneratedCode: !!c.generatedCode
    }));
    
    res.json({
        success: true,
        components,
        total: components.length
    });
});

// API: Get specific component
router.get('/api/component/:id', (req, res) => {
    const component = capturedComponents.get(req.params.id);
    
    if (!component) {
        return res.status(404).json({ error: 'Component not found' });
    }
    
    res.json({
        success: true,
        component
    });
});

// API: Delete component
router.delete('/api/component/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!capturedComponents.has(id)) {
        return res.status(404).json({ error: 'Component not found' });
    }
    
    try {
        // Remove from memory
        capturedComponents.delete(id);
        
        // Remove from disk
        await fs.unlink(path.join(COMPONENTS_DIR, `${id}.json`));
        
        res.json({
            success: true,
            message: 'Component deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting component:', error);
        res.status(500).json({ error: 'Failed to delete component' });
    }
});

// API: Generate code for component (AI integration)
router.post('/api/generate-code/:id', async (req, res) => {
    const { id } = req.params;
    const { framework = 'react' } = req.body;
    
    const component = capturedComponents.get(id);
    
    if (!component) {
        return res.status(404).json({ error: 'Component not found' });
    }
    
    try {
        // For now, return a simple conversion
        // Later this will integrate with Claude for intelligent code generation
        let generatedCode = '';
        
        if (framework === 'react') {
            generatedCode = `
import React from 'react';
import './Component.css';

const CapturedComponent = () => {
    return (
        <div className="captured-component">
            ${component.html}
        </div>
    );
};

export default CapturedComponent;

/* CSS (Component.css) */
${component.css}
`;
        } else if (framework === 'vue') {
            generatedCode = `
<template>
    <div class="captured-component">
        ${component.html}
    </div>
</template>

<script>
export default {
    name: 'CapturedComponent'
}
</script>

<style scoped>
${component.css}
</style>
`;
        } else {
            // Vanilla HTML/CSS/JS
            generatedCode = `
<!-- HTML -->
${component.html}

<!-- CSS -->
<style>
${component.css}
</style>
`;
        }
        
        // Save generated code
        component.generatedCode = { [framework]: generatedCode };
        
        // Persist update
        await fs.writeFile(
            path.join(COMPONENTS_DIR, `${id}.json`),
            JSON.stringify(component, null, 2)
        );
        
        res.json({
            success: true,
            code: generatedCode,
            framework
        });
    } catch (error) {
        console.error('Error generating code:', error);
        res.status(500).json({ error: 'Failed to generate code' });
    }
});

// API: Update component metadata
router.put('/api/component/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const component = capturedComponents.get(id);
    
    if (!component) {
        return res.status(404).json({ error: 'Component not found' });
    }
    
    try {
        // Update allowed fields
        if (updates.title) component.title = updates.title;
        if (updates.tags) component.tags = updates.tags;
        if (updates.category) component.category = updates.category;
        
        // Save to memory
        capturedComponents.set(id, component);
        
        // Persist to disk
        await fs.writeFile(
            path.join(COMPONENTS_DIR, `${id}.json`),
            JSON.stringify(component, null, 2)
        );
        
        res.json({
            success: true,
            component
        });
    } catch (error) {
        console.error('Error updating component:', error);
        res.status(500).json({ error: 'Failed to update component' });
    }
});

// API: Search components
router.get('/api/search', (req, res) => {
    const { q, category, tag } = req.query;
    
    let results = Array.from(capturedComponents.values());
    
    // Filter by search query
    if (q) {
        const query = q.toLowerCase();
        results = results.filter(c => 
            c.title.toLowerCase().includes(query) ||
            c.url.toLowerCase().includes(query) ||
            c.tags.some(t => t.toLowerCase().includes(query))
        );
    }
    
    // Filter by category
    if (category) {
        results = results.filter(c => c.category === category);
    }
    
    // Filter by tag
    if (tag) {
        results = results.filter(c => c.tags.includes(tag));
    }
    
    res.json({
        success: true,
        results: results.map(c => ({
            id: c.id,
            title: c.title,
            url: c.url,
            timestamp: c.timestamp,
            tags: c.tags,
            category: c.category
        })),
        total: results.length
    });
});

module.exports = router;