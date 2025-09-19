const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { ClaudeCodeBridge } = require('../bridge/ClaudeCodeBridge');
const { FileSync } = require('../sync/FileSync');
const { CommandRouter } = require('../commands/CommandRouter');
const { SessionManager } = require('./SessionManager');
const { SessionSummaryService } = require('../services/SessionSummaryService');
const { DocumentationService } = require('../services/DocumentationService');

class CompanionServer {
  constructor(options) {
    this.port = options.port;
    this.security = options.security;
    this.logger = options.logger;
    this.config = options.config;
    
    this.app = express();
    this.server = null;
    this.wss = null;
    
    // Core services
    this.claudeBridge = null;
    this.fileSync = null;
    this.commandRouter = null;
    this.sessionManager = null;
    this.sessionSummaryService = null;
    this.documentationService = null;
    
    // Connection tracking
    this.connections = new Map();
    this.activeProjects = new Map();
  }

  async start() {
    // Initialize core services
    await this.initializeServices();
    
    // Setup Express middleware
    this.setupMiddleware();
    
    // Setup REST API routes
    this.setupRoutes();
    
    // Start HTTP server
    this.server = this.app.listen(this.port, '127.0.0.1');
    
    // Setup WebSocket server
    this.setupWebSocket();
    
    this.logger.info(`🌐 HTTP Server: http://localhost:${this.port}`);
    this.logger.info(`🔌 WebSocket Server: ws://localhost:${this.port}`);
  }

  async initializeServices() {
    this.logger.info('🔧 Initializing core services...');
    
    // Claude Code Bridge - handles all Claude Code CLI interactions
    this.claudeBridge = new ClaudeCodeBridge({
      logger: this.logger.createChild('Claude'),
      config: this.config
    });
    await this.claudeBridge.initialize();
    
    // File Sync Service - real-time file synchronization
    this.fileSync = new FileSync({
      logger: this.logger.createChild('FileSync'),
      config: this.config
    });
    
    // Command Router - routes web commands to appropriate handlers
    this.commandRouter = new CommandRouter({
      claudeBridge: this.claudeBridge,
      fileSync: this.fileSync,
      logger: this.logger.createChild('Commands')
    });
    
    // Session Manager - tracks development sessions
    this.sessionManager = new SessionManager({
      logger: this.logger.createChild('Sessions'),
      claudeBridge: this.claudeBridge
    });
    
    // Session Summary Service - AI-powered session analysis via Claude headless mode
    this.sessionSummaryService = new SessionSummaryService({
      logger: this.logger.createChild('SessionSummary'),
      claudeBridge: this.claudeBridge,
      projectService: null // Will add project service integration later if needed
    });
    
    // Documentation Service - Local documentation server with Claude search
    this.documentationService = new DocumentationService({
      logger: this.logger.createChild('Documentation'),
      claudeBridge: this.claudeBridge,
      config: this.config
    });
    
    this.logger.success('✅ All services initialized');
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: this.config.get('security.allowedOrigins'),
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Security headers
    this.app.use((req, res, next) => {
      res.header('X-Powered-By', 'Coder1-Companion');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-Content-Type-Options', 'nosniff');
      next();
    });
    
    // Request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: require('../../package.json').version,
        uptime: process.uptime(),
        connections: this.connections.size,
        activeProjects: this.activeProjects.size,
        services: {
          claudeBridge: this.claudeBridge?.isReady() || false,
          fileSync: this.fileSync?.isReady() || false
        }
      });
    });
    
    // Connection info for IDE detection
    this.app.get('/connection', (req, res) => {
      res.json({
        version: require('../../package.json').version,
        port: this.port,
        capabilities: [
          'claude-code-integration',
          'file-sync',
          'session-management',
          'session-summaries',
          'documentation-server',
          'command-routing'
        ],
        security: {
          origins: this.config.get('security.allowedOrigins')
        }
      });
    });
    
    // Claude Code proxy endpoints
    this.app.post('/claude/execute', async (req, res) => {
      try {
        const { command, workDir, sessionId } = req.body;
        
        const result = await this.claudeBridge.executeCommand({
          command,
          workDir: workDir || process.cwd(),
          sessionId
        });
        
        res.json(result);
      } catch (error) {
        this.logger.error('Claude execution error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // File operations
    this.app.post('/files/sync', async (req, res) => {
      try {
        const { projectPath, files } = req.body;
        await this.fileSync.syncFiles(projectPath, files);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('File sync error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Session management
    this.app.get('/sessions/:sessionId', async (req, res) => {
      try {
        const session = await this.sessionManager.getSession(req.params.sessionId);
        res.json(session);
      } catch (error) {
        res.status(404).json({ error: 'Session not found' });
      }
    });
    
    // Session Summary API endpoints
    this.app.post('/session-summary/generate', async (req, res) => {
      try {
        const { projectPath, sessionData } = req.body;
        
        if (!projectPath) {
          return res.status(400).json({ error: 'projectPath is required' });
        }
        
        const result = await this.sessionSummaryService.generateSessionSummary(
          projectPath,
          sessionData || {}
        );
        
        res.json(result);
      } catch (error) {
        this.logger.error('Session summary generation error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/session-summary/list', async (req, res) => {
      try {
        const { projectPath } = req.query;
        
        if (!projectPath) {
          return res.status(400).json({ error: 'projectPath query parameter is required' });
        }
        
        const summaries = await this.sessionSummaryService.listSessionSummaries(projectPath);
        res.json({ summaries });
      } catch (error) {
        this.logger.error('Failed to list session summaries:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/session-summary/:filename', async (req, res) => {
      try {
        const { projectPath } = req.query;
        const { filename } = req.params;
        
        if (!projectPath) {
          return res.status(400).json({ error: 'projectPath query parameter is required' });
        }
        
        const summary = await this.sessionSummaryService.getSummary(projectPath, filename);
        res.json(summary);
      } catch (error) {
        this.logger.error('Failed to get session summary:', error);
        res.status(404).json({ error: error.message });
      }
    });
    
    this.app.delete('/session-summary/:filename', async (req, res) => {
      try {
        const { projectPath } = req.query;
        const { filename } = req.params;
        
        if (!projectPath) {
          return res.status(400).json({ error: 'projectPath query parameter is required' });
        }
        
        const result = await this.sessionSummaryService.deleteSummary(projectPath, filename);
        res.json(result);
      } catch (error) {
        this.logger.error('Failed to delete session summary:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Documentation Server API endpoints
    this.app.post('/docs/add', async (req, res) => {
      try {
        const { url, options = {} } = req.body;
        
        if (!url) {
          return res.status(400).json({ error: 'url is required' });
        }
        
        const result = await this.documentationService.addDocumentationFromUrl(url, options);
        res.json(result);
      } catch (error) {
        this.logger.error('Documentation add error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.post('/docs/search', async (req, res) => {
      try {
        const { query, options = {} } = req.body;
        
        if (!query) {
          return res.status(400).json({ error: 'query is required' });
        }
        
        const result = await this.documentationService.searchDocumentation(query, options);
        res.json(result);
      } catch (error) {
        this.logger.error('Documentation search error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/docs/list', async (req, res) => {
      try {
        const docs = await this.documentationService.listDocumentation();
        res.json({ docs });
      } catch (error) {
        this.logger.error('Failed to list documentation:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/docs/:docId', async (req, res) => {
      try {
        const { docId } = req.params;
        const doc = await this.documentationService.getDocumentation(docId);
        res.json(doc);
      } catch (error) {
        this.logger.error('Failed to get documentation:', error);
        res.status(404).json({ error: error.message });
      }
    });
    
    this.app.delete('/docs/:docId', async (req, res) => {
      try {
        const { docId } = req.params;
        const result = await this.documentationService.deleteDocumentation(docId);
        res.json(result);
      } catch (error) {
        this.logger.error('Failed to delete documentation:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/docs/stats', async (req, res) => {
      try {
        const stats = await this.documentationService.getServiceStats();
        res.json(stats);
      } catch (error) {
        this.logger.error('Failed to get documentation stats:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Error handling
    this.app.use((error, req, res, next) => {
      this.logger.error('Express error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({
      server: this.server,
      path: '/ws'
    });
    
    this.wss.on('connection', (ws, req) => {
      this.handleWebSocketConnection(ws, req);
    });
    
    this.logger.info('🔌 WebSocket server initialized');
  }

  handleWebSocketConnection(ws, req) {
    const connectionId = uuidv4();
    const clientIp = req.socket.remoteAddress;
    
    this.logger.info(`🔗 New connection: ${connectionId} from ${clientIp}`);
    
    // Store connection
    this.connections.set(connectionId, {
      ws,
      id: connectionId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      projectPath: null,
      sessionId: null
    });
    
    // Setup message handling
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleWebSocketMessage(connectionId, message);
      } catch (error) {
        this.logger.error(`WebSocket message error for ${connectionId}:`, error);
        this.sendWebSocketMessage(connectionId, {
          type: 'error',
          error: 'Failed to process message'
        });
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      this.logger.info(`🔚 Connection closed: ${connectionId}`);
      this.handleDisconnection(connectionId);
    });
    
    // Send welcome message
    this.sendWebSocketMessage(connectionId, {
      type: 'connected',
      connectionId,
      version: require('../../package.json').version
    });
  }

  async handleWebSocketMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    // Update activity
    connection.lastActivity = new Date();
    
    this.logger.debug(`📨 Message from ${connectionId}:`, message.type);
    
    switch (message.type) {
      case 'init':
        await this.handleInit(connectionId, message.data);
        break;
        
      case 'claude-command':
        await this.handleClaudeCommand(connectionId, message.data);
        break;
        
      case 'file-sync':
        await this.handleFileSync(connectionId, message.data);
        break;
        
      case 'session-update':
        await this.handleSessionUpdate(connectionId, message.data);
        break;
        
      case 'ping':
        this.sendWebSocketMessage(connectionId, { type: 'pong' });
        break;
        
      default:
        this.logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  async handleInit(connectionId, data) {
    const connection = this.connections.get(connectionId);
    const { projectPath, sessionId } = data;
    
    // Update connection info
    connection.projectPath = projectPath;
    connection.sessionId = sessionId;
    
    // Initialize file sync for this project
    await this.fileSync.initProject(projectPath, (changes) => {
      this.sendWebSocketMessage(connectionId, {
        type: 'file-changes',
        data: changes
      });
    });
    
    // Initialize documentation service for this project
    try {
      await this.documentationService.initialize(projectPath);
      this.logger.info(`📚 Documentation service initialized for project: ${projectPath}`);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to initialize documentation service for ${projectPath}:`, error.message);
    }
    
    // Track active project
    this.activeProjects.set(projectPath, connectionId);
    
    this.logger.info(`📁 Initialized project: ${projectPath} for session: ${sessionId}`);
    
    this.sendWebSocketMessage(connectionId, {
      type: 'init-complete',
      data: { 
        projectPath, 
        sessionId,
        services: {
          fileSync: true,
          documentation: true,
          sessionSummary: true
        }
      }
    });
  }

  async handleClaudeCommand(connectionId, data) {
    const { command, workDir, requestId } = data;
    
    try {
      // Execute command via Claude Code bridge
      const result = await this.claudeBridge.executeCommand({
        command,
        workDir: workDir || process.cwd(),
        sessionId: this.connections.get(connectionId)?.sessionId,
        onProgress: (progress) => {
          this.sendWebSocketMessage(connectionId, {
            type: 'claude-progress',
            requestId,
            data: progress
          });
        }
      });
      
      this.sendWebSocketMessage(connectionId, {
        type: 'claude-result',
        requestId,
        data: result
      });
      
    } catch (error) {
      this.sendWebSocketMessage(connectionId, {
        type: 'claude-error',
        requestId,
        error: error.message
      });
    }
  }

  async handleFileSync(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection.projectPath) return;
    
    try {
      await this.fileSync.syncFiles(connection.projectPath, data.files);
      
      this.sendWebSocketMessage(connectionId, {
        type: 'sync-complete',
        data: { success: true }
      });
    } catch (error) {
      this.sendWebSocketMessage(connectionId, {
        type: 'sync-error',
        error: error.message
      });
    }
  }

  async handleSessionUpdate(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection.sessionId) return;
    
    await this.sessionManager.updateSession(connection.sessionId, data);
  }

  sendWebSocketMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      connection.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to ${connectionId}:`, error);
      return false;
    }
  }

  handleDisconnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection?.projectPath) {
      this.activeProjects.delete(connection.projectPath);
      this.fileSync.cleanupProject(connection.projectPath);
    }
    
    this.connections.delete(connectionId);
  }

  async stop() {
    this.logger.info('🛑 Stopping Companion Server...');
    
    // Close all WebSocket connections
    for (const [id, connection] of this.connections) {
      connection.ws.close();
    }
    this.connections.clear();
    
    // Stop services
    if (this.claudeBridge) {
      await this.claudeBridge.cleanup();
    }
    
    if (this.fileSync) {
      await this.fileSync.cleanup();
    }
    
    if (this.sessionSummaryService) {
      await this.sessionSummaryService.cleanup();
    }
    
    if (this.documentationService) {
      await this.documentationService.cleanup();
    }
    
    // Close HTTP server
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
    
    this.logger.info('✅ Companion Server stopped');
  }
}

module.exports = { CompanionServer };