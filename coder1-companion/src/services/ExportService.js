const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

class ExportService {
  constructor(options) {
    this.logger = options.logger;
    this.claudeBridge = options.claudeBridge;
    this.sessionManager = options.sessionManager;
    
    // Export configuration
    this.exportDir = path.join(require('os').homedir(), '.coder1-companion', 'exports');
  }

  async initialize() {
    await fs.mkdir(this.exportDir, { recursive: true });
    this.logger.info('📦 Export Service initialized');
  }

  async exportSession(sessionId, options = {}) {
    this.logger.info(`📦 Exporting session: ${sessionId}`);

    try {
      // Get session data
      const session = await this.sessionManager.getSession(sessionId);
      const timeline = await this.sessionManager.getSessionTimeline(sessionId);
      
      // Create export package
      const exportData = {
        session: session,
        timeline: timeline,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Coder1 Companion',
          version: require('../../package.json').version
        }
      };

      // Enhanced export with Claude analysis
      if (options.includeAnalysis && this.claudeBridge.isReady()) {
        try {
          const analysis = await this.generateSessionAnalysis(session, timeline);
          exportData.analysis = analysis;
        } catch (error) {
          this.logger.warn('Failed to generate session analysis:', error);
        }
      }

      // Generate export in requested formats
      const formats = options.formats || ['json'];
      const exportPaths = {};

      for (const format of formats) {
        const exportPath = await this.exportInFormat(sessionId, exportData, format);
        exportPaths[format] = exportPath;
      }

      this.logger.success(`✅ Session exported: ${sessionId}`);
      
      return {
        success: true,
        sessionId,
        exportPaths,
        metadata: exportData.metadata
      };

    } catch (error) {
      this.logger.error(`❌ Failed to export session ${sessionId}:`, error);
      throw error;
    }
  }

  async exportProject(projectPath, options = {}) {
    this.logger.info(`📦 Exporting project: ${projectPath}`);

    try {
      const exportId = `project_${Date.now()}`;
      
      // Analyze project structure
      const projectStructure = await this.analyzeProjectStructure(projectPath);
      
      // Get git information
      const gitInfo = await this.getGitInformation(projectPath);
      
      // Create export package
      const exportData = {
        projectPath,
        structure: projectStructure,
        git: gitInfo,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportId
        }
      };

      // Enhanced export with Claude analysis
      if (options.includeAnalysis && this.claudeBridge.isReady()) {
        try {
          const analysis = await this.generateProjectAnalysis(projectPath, projectStructure);
          exportData.analysis = analysis;
        } catch (error) {
          this.logger.warn('Failed to generate project analysis:', error);
        }
      }

      // Create archive
      const archivePath = await this.createProjectArchive(projectPath, exportId, options);
      
      // Save metadata
      const metadataPath = path.join(this.exportDir, `${exportId}_metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(exportData, null, 2));

      this.logger.success(`✅ Project exported: ${exportId}`);
      
      return {
        success: true,
        exportId,
        archivePath,
        metadataPath,
        metadata: exportData.metadata
      };

    } catch (error) {
      this.logger.error(`❌ Failed to export project ${projectPath}:`, error);
      throw error;
    }
  }

  async generateSessionAnalysis(session, timeline) {
    const prompt = this.buildSessionAnalysisPrompt(session, timeline);
    
    const result = await this.claudeBridge.executeCommand({
      command: prompt,
      sessionId: session.id
    });

    return this.parseSessionAnalysis(result.result);
  }

  buildSessionAnalysisPrompt(session, timeline) {
    const duration = Date.now() - new Date(session.startTime).getTime();
    const durationHours = (duration / (1000 * 60 * 60)).toFixed(1);
    
    const events = timeline.events || [];
    const recentEvents = events.slice(-20).map((event, index) => {
      return `${index + 1}. [${new Date(event.timestamp).toLocaleTimeString()}] ${event.type}: ${event.data?.command || event.data || 'activity'}`;
    }).join('\n');

    return `Analyze this development session for export documentation:

SESSION OVERVIEW:
- Duration: ${durationHours} hours
- Total Events: ${events.length}
- Project: ${session.projectPath}
- Started: ${new Date(session.startTime).toLocaleString()}

RECENT ACTIVITY:
${recentEvents}

Please provide a comprehensive JSON analysis with:
{
  "executiveSummary": "High-level overview of what was accomplished",
  "keyAccomplishments": ["accomplishment 1", "accomplishment 2"],
  "technicalDetails": {
    "primaryLanguages": ["language1", "language2"],
    "frameworks": ["framework1", "framework2"],
    "toolsUsed": ["tool1", "tool2"]
  },
  "codeQuality": {
    "score": 0.85,
    "observations": ["observation 1", "observation 2"]
  },
  "recommendations": {
    "immediate": ["recommendation 1", "recommendation 2"],
    "future": ["future item 1", "future item 2"]
  },
  "documentation": {
    "readmeNeeded": true,
    "apiDocsNeeded": false,
    "testingNeeded": true
  },
  "exportNotes": "Additional context for whoever receives this export"
}`;
  }

  parseSessionAnalysis(result) {
    try {
      const jsonStr = result.raw || result.content || '';
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          executiveSummary: parsed.executiveSummary || 'Development session completed',
          keyAccomplishments: parsed.keyAccomplishments || [],
          technicalDetails: parsed.technicalDetails || {},
          codeQuality: parsed.codeQuality || { score: 0.7, observations: [] },
          recommendations: parsed.recommendations || { immediate: [], future: [] },
          documentation: parsed.documentation || {},
          exportNotes: parsed.exportNotes || 'Session export generated by Coder1 Companion'
        };
      }
      
      return this.fallbackSessionAnalysis();
    } catch (error) {
      this.logger.warn('Failed to parse session analysis:', error);
      return this.fallbackSessionAnalysis();
    }
  }

  fallbackSessionAnalysis() {
    return {
      executiveSummary: 'Development session completed',
      keyAccomplishments: [],
      technicalDetails: {},
      codeQuality: { score: 0.7, observations: [] },
      recommendations: { immediate: [], future: [] },
      documentation: {},
      exportNotes: 'Session export generated by Coder1 Companion'
    };
  }

  async generateProjectAnalysis(projectPath, structure) {
    const prompt = this.buildProjectAnalysisPrompt(projectPath, structure);
    
    const result = await this.claudeBridge.executeCommand({
      command: prompt,
      workDir: projectPath
    });

    return this.parseProjectAnalysis(result.result);
  }

  buildProjectAnalysisPrompt(projectPath, structure) {
    const fileTypes = this.analyzeFileTypes(structure.files);
    const totalFiles = structure.files.length;
    const totalSize = structure.totalSize;

    return `Analyze this project for export documentation:

PROJECT OVERVIEW:
- Path: ${projectPath}
- Total Files: ${totalFiles}
- Total Size: ${this.formatBytes(totalSize)}
- File Types: ${JSON.stringify(fileTypes)}

DIRECTORY STRUCTURE:
${structure.directories.slice(0, 20).join('\n')}

KEY FILES:
${structure.keyFiles.map(f => `- ${f.name} (${this.formatBytes(f.size)})`).join('\n')}

Please provide a JSON analysis with:
{
  "projectType": "web-app|library|cli-tool|mobile-app|other",
  "primaryLanguage": "JavaScript|TypeScript|Python|other",
  "framework": "React|Vue|Angular|Express|Next.js|other",
  "architecture": "Description of the project architecture",
  "dependencies": {
    "production": ["dep1", "dep2"],
    "development": ["dev-dep1", "dev-dep2"]
  },
  "setupInstructions": ["step 1", "step 2", "step 3"],
  "deploymentInfo": {
    "type": "static|server|container|serverless",
    "instructions": ["deploy step 1", "deploy step 2"]
  },
  "documentation": {
    "quality": "excellent|good|fair|poor",
    "missing": ["what's missing 1", "what's missing 2"]
  },
  "codeQuality": {
    "score": 0.85,
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"]
  },
  "exportSummary": "Summary for whoever receives this project export"
}`;
  }

  parseProjectAnalysis(result) {
    try {
      const jsonStr = result.raw || result.content || '';
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.fallbackProjectAnalysis();
    } catch (error) {
      this.logger.warn('Failed to parse project analysis:', error);
      return this.fallbackProjectAnalysis();
    }
  }

  fallbackProjectAnalysis() {
    return {
      projectType: 'other',
      primaryLanguage: 'JavaScript',
      framework: 'other',
      architecture: 'Standard project structure',
      dependencies: { production: [], development: [] },
      setupInstructions: ['npm install', 'npm start'],
      deploymentInfo: { type: 'static', instructions: [] },
      documentation: { quality: 'fair', missing: [] },
      codeQuality: { score: 0.7, strengths: [], improvements: [] },
      exportSummary: 'Project exported via Coder1 Companion'
    };
  }

  async analyzeProjectStructure(projectPath) {
    const structure = {
      directories: [],
      files: [],
      keyFiles: [],
      totalSize: 0
    };

    await this.scanDirectory(projectPath, structure, projectPath);
    
    // Identify key files
    structure.keyFiles = structure.files
      .filter(file => this.isKeyFile(file.name))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    return structure;
  }

  async scanDirectory(dirPath, structure, rootPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(rootPath, fullPath);
        
        // Skip common ignore patterns
        if (this.shouldIgnore(relativePath)) continue;
        
        if (item.isDirectory()) {
          structure.directories.push(relativePath);
          await this.scanDirectory(fullPath, structure, rootPath);
        } else {
          try {
            const stats = await fs.stat(fullPath);
            structure.files.push({
              name: relativePath,
              size: stats.size,
              modified: stats.mtime
            });
            structure.totalSize += stats.size;
          } catch (error) {
            // Skip unreadable files
          }
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  shouldIgnore(filePath) {
    const ignorePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.cache',
      '.DS_Store',
      'Thumbs.db',
      '.env',
      '.env.local'
    ];
    
    return ignorePatterns.some(pattern => filePath.includes(pattern));
  }

  isKeyFile(fileName) {
    const keyFiles = [
      'package.json',
      'README.md',
      'index.js',
      'index.ts',
      'app.js',
      'app.ts',
      'main.js',
      'main.ts',
      'Dockerfile',
      'docker-compose.yml',
      '.gitignore',
      'tsconfig.json',
      'webpack.config.js',
      'vite.config.js',
      'next.config.js'
    ];
    
    return keyFiles.includes(path.basename(fileName).toLowerCase());
  }

  analyzeFileTypes(files) {
    const types = {};
    
    files.forEach(file => {
      const ext = path.extname(file.name).toLowerCase();
      types[ext] = (types[ext] || 0) + 1;
    });
    
    return types;
  }

  async getGitInformation(projectPath) {
    try {
      return {
        branch: execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf8' }).trim(),
        commit: execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf8' }).trim(),
        status: execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf8' }),
        remotes: execSync('git remote -v', { cwd: projectPath, encoding: 'utf8' }),
        tags: execSync('git tag --sort=-version:refname', { cwd: projectPath, encoding: 'utf8' }).split('\n').slice(0, 5)
      };
    } catch (error) {
      return null;
    }
  }

  async exportInFormat(sessionId, data, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `session-${sessionId}-${timestamp}`;
    
    switch (format.toLowerCase()) {
      case 'json':
        return await this.exportAsJSON(fileName, data);
      
      case 'markdown':
        return await this.exportAsMarkdown(fileName, data);
      
      case 'html':
        return await this.exportAsHTML(fileName, data);
      
      case 'pdf':
        return await this.exportAsPDF(fileName, data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async exportAsJSON(fileName, data) {
    const filePath = path.join(this.exportDir, `${fileName}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  async exportAsMarkdown(fileName, data) {
    const markdown = this.generateMarkdown(data);
    const filePath = path.join(this.exportDir, `${fileName}.md`);
    await fs.writeFile(filePath, markdown);
    return filePath;
  }

  async exportAsHTML(fileName, data) {
    const html = this.generateHTML(data);
    const filePath = path.join(this.exportDir, `${fileName}.html`);
    await fs.writeFile(filePath, html);
    return filePath;
  }

  generateMarkdown(data) {
    const session = data.session;
    const timeline = data.timeline;
    const analysis = data.analysis;
    
    let md = `# Session Export: ${session.id}\n\n`;
    md += `**Exported**: ${data.metadata.exportedAt}\n`;
    md += `**Project**: ${session.projectPath}\n`;
    md += `**Duration**: ${new Date(session.startTime).toLocaleString()}\n\n`;
    
    if (analysis) {
      md += `## Executive Summary\n\n${analysis.executiveSummary}\n\n`;
      
      if (analysis.keyAccomplishments.length > 0) {
        md += `## Key Accomplishments\n\n`;
        analysis.keyAccomplishments.forEach(item => {
          md += `- ${item}\n`;
        });
        md += '\n';
      }
    }
    
    if (timeline.events && timeline.events.length > 0) {
      md += `## Timeline\n\n`;
      timeline.events.slice(-20).forEach((event, index) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        md += `**${time}** - ${event.type}: ${event.data?.command || event.data || 'activity'}\n\n`;
      });
    }
    
    return md;
  }

  generateHTML(data) {
    // Basic HTML template for session export
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Coder1 Session Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .timeline-item { margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .timestamp { font-weight: bold; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Session Export: ${data.session.id}</h1>
        <p><strong>Exported:</strong> ${data.metadata.exportedAt}</p>
        <p><strong>Project:</strong> ${data.session.projectPath}</p>
    </div>
    
    ${data.analysis ? `
    <div class="section">
        <h2>Executive Summary</h2>
        <p>${data.analysis.executiveSummary}</p>
    </div>
    ` : ''}
    
    <div class="section">
        <h2>Session Timeline</h2>
        ${data.timeline.events ? data.timeline.events.slice(-20).map(event => `
            <div class="timeline-item">
                <span class="timestamp">${new Date(event.timestamp).toLocaleTimeString()}</span>
                ${event.type}: ${event.data?.command || event.data || 'activity'}
            </div>
        `).join('') : 'No timeline data available'}
    </div>
</body>
</html>`;
  }

  async createProjectArchive(projectPath, exportId, options = {}) {
    const archivePath = path.join(this.exportDir, `${exportId}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        resolve(archivePath);
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      
      // Add project files (excluding ignored patterns)
      archive.glob('**/*', {
        cwd: projectPath,
        ignore: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '.cache/**',
          '*.log'
        ]
      });
      
      archive.finalize();
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up Export Service...');
    // Cleanup logic if needed
    this.logger.info('✅ Export Service cleanup complete');
  }
}

module.exports = { ExportService };