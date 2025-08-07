// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const EventEmitter = require('events');

// Global terminal emitter for real-time output
global.terminalEmitter = new EventEmitter();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Import middleware
const { errorHandler, notFoundHandler, requestLogger, timeoutHandler } = require('./middleware/errorHandler');
const { rateLimit } = require('./middleware/validation');

// Enable CORS for all origins
app.use(cors());

// Add request logging and timeout handling
app.use(requestLogger);
app.use(timeoutHandler);

// Add rate limiting (100 requests per 15 minutes)
app.use(rateLimit(15 * 60 * 1000, 100));

// Parse JSON bodies with size limits
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies with size limits
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// IMPORTANT: Define specific routes BEFORE static middleware to avoid conflicts

// Main page redirect to Product Creation Hub (MUST be before static middleware)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../static', 'product-creation-hub.html'));
});

// Product Creation Hub route
app.get('/product-creation', (req, res) => {
    res.sendFile(path.join(__dirname, '../static', 'product-creation-hub.html'));
});

// Component Browser route
app.get('/component-browser', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'component-browser.html'));
});

// IDE route - serve React IDE
app.get('/ide', (req, res) => {
    res.sendFile(path.join(__dirname, '../clean-repo/ide-react.html'));
});

// Serve static files from the static directory (AFTER specific routes)
app.use(express.static(path.join(__dirname, '../static')));

// Serve clean-repo static files for IDE
app.use('/ide/static', express.static(path.join(__dirname, '../clean-repo/static')));

// Import routes (using refactored modular version)
const agentRoutes = require('./routes/agent-refactored');
const terminalRoutes = require('./routes/terminal');
const magicRoutes = require('./routes/magic');
const productCreationRoutes = require('./routes/product-creation-api');
const infiniteLoopRoutes = require('./routes/infinite-loop');

// Temporarily disable GitHub rules integration
// const rulesIntegration = require('./integrations/rules-integration');

// Initialize WebSocket server after routes are set up
const { initializeWebSocketServer } = require('./integrations/websocket-server');

// Use routes
app.use('/api/agent', agentRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/magic', magicRoutes);
app.use('/api/infinite', infiniteLoopRoutes);
app.use('/api', productCreationRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Autonomous Vibe Coding Agent is running',
    timestamp: new Date().toISOString()
  });
});

// Serve generated project websites
app.get('/projects/:projectId/*', (req, res) => {
  const projectId = req.params.projectId;
  const filePath = req.params[0] || 'index.html';
  const fullPath = path.join(__dirname, '../projects', projectId, filePath);
  
  // Security check - ensure we're within projects directory
  const projectsDir = path.join(__dirname, '../projects');
  const resolvedPath = path.resolve(fullPath);
  if (!resolvedPath.startsWith(path.resolve(projectsDir))) {
    return res.status(403).send('Access denied');
  }
  
  // Set proper MIME types
  if (filePath.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html');
  } else if (filePath.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (filePath.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  
  res.sendFile(resolvedPath);
});

// Serve project root (defaults to index.html)
app.get('/projects/:projectId', (req, res) => {
  const projectId = req.params.projectId;
  const indexPath = path.join(__dirname, '../projects', projectId, 'index.html');
  res.sendFile(indexPath);
});

// Project gallery index - show all available projects
app.get('/projects', (req, res) => {
  const projectsDir = path.join(__dirname, '../projects');
  const fs = require('fs');
  
  try {
    const projectFolders = fs.readdirSync(projectsDir)
      .filter(folder => {
        try {
          const folderPath = path.join(projectsDir, folder);
          const stats = fs.statSync(folderPath);
          return stats.isDirectory() && 
                 fs.existsSync(path.join(folderPath, 'index.html'));
        } catch (error) {
          console.warn(`Skipping invalid folder ${folder}:`, error.message);
          return false;
        }
      })
      .map(folder => {
        try {
          const folderPath = path.join(projectsDir, folder);
          const stats = fs.statSync(folderPath);
          return {
            id: folder,
            name: folder,
            created: stats.birthtime,
            url: `/projects/${folder}/`
          };
        } catch (error) {
          console.warn(`Error reading folder ${folder}:`, error.message);
          return null;
        }
      })
      .filter(project => project !== null)
      .sort((a, b) => b.created - a.created); // Newest first
    
    // Generate HTML gallery page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Projects Gallery</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; text-align: center; }
        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .project-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .project-card h3 { margin-top: 0; color: #007bff; }
        .project-link { display: inline-block; background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; }
        .project-link:hover { background: #0056b3; }
        .created-date { color: #666; font-size: 14px; }
        .no-projects { text-align: center; color: #666; font-style: italic; }
    </style>
</head>
<body>
    <h1>🚀 Generated Projects Gallery</h1>
    <p style="text-align: center; color: #666;">Browse all websites generated by the Autonomous Vibe Interface</p>
    
    ${projectFolders.length > 0 ? `
    <div class="projects-grid">
        ${projectFolders.map(project => `
        <div class="project-card">
            <h3>Project ${project.name}</h3>
            <p class="created-date">Created: ${project.created.toLocaleDateString()}</p>
            <a href="${project.url}" class="project-link" target="_blank">View Website →</a>
        </div>
        `).join('')}
    </div>
    ` : `
    <div class="no-projects">
        <p>No projects generated yet. Create your first website using the Autonomous Vibe Interface!</p>
        <a href="/" class="project-link">Go to Interface →</a>
    </div>
    `}
</body>
</html>`;
    
    res.send(html);
  } catch (error) {
    console.error('Error reading projects directory:', error);
    res.status(500).send('Error loading projects gallery');
  }
});

// Root path already defined above to redirect to Product Creation Hub
// Removed duplicate route definition that was serving old index.html

// Add global error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Export the app for Vercel serverless functions
module.exports = app;

// Only start server if not in production (for local development)
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Autonomous Vibe Coding Agent server is running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🖥️ Terminal Interface: http://localhost:${PORT}/terminal-interface.html`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    
    // Initialize WebSocket server after HTTP server is listening
    initializeWebSocketServer(server);
    console.log(`🔌 WebSocket server initialized`);
  });
}