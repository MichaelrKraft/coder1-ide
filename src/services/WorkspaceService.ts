export interface WorkspaceConfig {
  id: string;
  name: string;
  rootPath: string;
  projectType: 'react' | 'vue' | 'angular' | 'node' | 'python' | 'java' | 'other';
  claudePersona: string;
  gitRepository?: string;
  gitBranch?: string;
  dependencies: string[];
  buildCommand?: string;
  testCommand?: string;
  startCommand?: string;
  environment: Record<string, string>;
  settings: WorkspaceSettings;
}

export interface WorkspaceSettings {
  autoSave: boolean;
  formatOnSave: boolean;
  lintOnSave: boolean;
  autoImports: boolean;
  tabSize: number;
  theme: 'dark' | 'light' | 'auto';
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  supervisionEnabled: boolean;
  supervisionLevel: 'conservative' | 'balanced' | 'aggressive';
  autoApprovalThresholds: {
    codeQuality: number;
    securityRisk: number;
    performanceImpact: number;
    testCoverage: number;
  };
}

export interface WorkspaceResource {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface WorkspaceMetrics {
  workspaceId: string;
  timestamp: Date;
  filesCount: number;
  linesOfCode: number;
  buildTime: number;
  testCoverage: number;
  codeQualityScore: number;
  securityScore: number;
  performanceScore: number;
  resourceUsage: WorkspaceResource;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  projectType: WorkspaceConfig['projectType'];
  files: Array<{
    path: string;
    content: string;
  }>;
  dependencies: string[];
  scripts: Record<string, string>;
  settings: Partial<WorkspaceSettings>;
  claudePersona: string;
}

export class WorkspaceService {
  private workspaces: Map<string, WorkspaceConfig> = new Map();
  private workspaceMetrics: Map<string, WorkspaceMetrics[]> = new Map();
  private resourceLimits: WorkspaceResource = {
    cpu: 80,
    memory: 85,
    disk: 90,
    network: 1000
  };

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const templates: WorkspaceTemplate[] = [
      {
        id: 'react-typescript',
        name: 'React TypeScript',
        description: 'Modern React application with TypeScript',
        projectType: 'react',
        files: [
          {
            path: 'src/App.tsx',
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React TypeScript</h1>
      </header>
    </div>
  );
}

export default App;`
          },
          {
            path: 'src/App.css',
            content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
}`
          }
        ],
        dependencies: ['react', 'react-dom', '@types/react', '@types/react-dom', 'typescript'],
        scripts: {
          'start': 'react-scripts start',
          'build': 'react-scripts build',
          'test': 'react-scripts test'
        },
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced'
        },
        claudePersona: 'frontend'
      },
      {
        id: 'node-express',
        name: 'Node.js Express API',
        description: 'RESTful API with Express and TypeScript',
        projectType: 'node',
        files: [
          {
            path: 'src/server.ts',
            content: `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`
          }
        ],
        dependencies: ['express', 'cors', '@types/express', '@types/cors', 'typescript', 'ts-node'],
        scripts: {
          'start': 'node dist/server.js',
          'dev': 'ts-node src/server.ts',
          'build': 'tsc'
        },
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced'
        },
        claudePersona: 'backend'
      },
      {
        id: 'python-fastapi',
        name: 'Python FastAPI',
        description: 'Modern Python API with FastAPI',
        projectType: 'python',
        files: [
          {
            path: 'main.py',
            content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="FastAPI Application")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World", "timestamp": datetime.now()}

@app.get("/health")
async def health():
    return {"status": "OK", "timestamp": datetime.now()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)`
          }
        ],
        dependencies: ['fastapi', 'uvicorn[standard]', 'python-multipart'],
        scripts: {
          'start': 'uvicorn main:app --host 0.0.0.0 --port 8000',
          'dev': 'uvicorn main:app --reload'
        },
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced'
        },
        claudePersona: 'backend'
      }
    ];

    (this as any).templates = templates;
  }

  async createWorkspace(config: Partial<WorkspaceConfig>): Promise<WorkspaceConfig> {
    const workspaceId = config.id || this.generateWorkspaceId();
    
    const defaultSettings: WorkspaceSettings = {
      autoSave: true,
      formatOnSave: true,
      lintOnSave: true,
      autoImports: true,
      tabSize: 2,
      theme: 'dark',
      fontSize: 14,
      wordWrap: true,
      minimap: true,
      lineNumbers: true,
      supervisionEnabled: true,
      supervisionLevel: 'balanced',
      autoApprovalThresholds: {
        codeQuality: 80,
        securityRisk: 20,
        performanceImpact: 30,
        testCoverage: 70
      }
    };

    const workspace: WorkspaceConfig = {
      id: workspaceId,
      name: config.name || `Workspace ${workspaceId}`,
      rootPath: config.rootPath || `/workspace/${workspaceId}`,
      projectType: config.projectType || 'react',
      claudePersona: config.claudePersona || 'analyzer',
      gitRepository: config.gitRepository,
      gitBranch: config.gitBranch || 'main',
      dependencies: config.dependencies || [],
      buildCommand: config.buildCommand,
      testCommand: config.testCommand,
      startCommand: config.startCommand,
      environment: config.environment || {},
      settings: { ...defaultSettings, ...config.settings }
    };

    this.workspaces.set(workspaceId, workspace);
    this.workspaceMetrics.set(workspaceId, []);

    await this.initializeWorkspaceFiles(workspace);
    
    return workspace;
  }

  async createWorkspaceFromTemplate(templateId: string, config: Partial<WorkspaceConfig>): Promise<WorkspaceConfig> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const workspace = await this.createWorkspace({
      ...config,
      projectType: template.projectType,
      dependencies: [...template.dependencies, ...(config.dependencies || [])],
      settings: { ...template.settings, ...config.settings } as WorkspaceSettings,
      claudePersona: config.claudePersona || template.claudePersona
    });

    for (const file of template.files) {
      await this.createWorkspaceFile(workspace.id, file.path, file.content);
    }

    if (template.scripts && (template.projectType === 'react' || template.projectType === 'node')) {
      await this.updatePackageJson(workspace.id, template.scripts, template.dependencies);
    }

    return workspace;
  }

  private async initializeWorkspaceFiles(workspace: WorkspaceConfig): Promise<void> {
    const directories = [
      'src',
      'public',
      'tests',
      'docs',
      '.vscode'
    ];

    for (const dir of directories) {
      await this.createWorkspaceDirectory(workspace.id, dir);
    }

    await this.createWorkspaceFile(workspace.id, '.gitignore', this.getGitignoreContent(workspace.projectType));
    await this.createWorkspaceFile(workspace.id, 'README.md', this.getReadmeContent(workspace));
    
    if (workspace.projectType === 'react' || workspace.projectType === 'node') {
      await this.createWorkspaceFile(workspace.id, 'package.json', this.getPackageJsonContent(workspace));
    }

    if (workspace.projectType === 'python') {
      await this.createWorkspaceFile(workspace.id, 'requirements.txt', this.getRequirementsContent(workspace));
    }
  }

  private async createWorkspaceDirectory(workspaceId: string, path: string): Promise<void> {
    console.log(`Creating directory: ${path} in workspace ${workspaceId}`);
  }

  private async createWorkspaceFile(workspaceId: string, path: string, content: string): Promise<void> {
    console.log(`Creating file: ${path} in workspace ${workspaceId}`);
  }

  private async updatePackageJson(workspaceId: string, scripts: Record<string, string>, dependencies: string[]): Promise<void> {
    console.log(`Updating package.json in workspace ${workspaceId}`);
  }

  private getGitignoreContent(projectType: WorkspaceConfig['projectType']): string {
    const common = `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;

    const typeSpecific = {
      react: `
# React
build/
dist/
*.tsbuildinfo
`,
      node: `
# Node.js
dist/
coverage/
*.tsbuildinfo
`,
      python: `
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
`,
      vue: `
# Vue
dist/
node_modules/
*.tsbuildinfo
`,
      angular: `
# Angular
dist/
node_modules/
*.tsbuildinfo
`,
      java: `
# Java
*.class
*.jar
*.war
*.ear
target/
`,
      other: ''
    };

    return common + (typeSpecific[projectType] || '');
  }

  private getReadmeContent(workspace: WorkspaceConfig): string {
    return `# ${workspace.name}

## Project Information
- **Type**: ${workspace.projectType}
- **Claude Persona**: ${workspace.claudePersona}
- **Supervision**: ${workspace.settings.supervisionEnabled ? 'Enabled' : 'Disabled'}

## Getting Started

### Prerequisites
- Node.js (if applicable)
- Python (if applicable)
- Git

### Installation
\`\`\`bash
# Clone the repository
git clone ${workspace.gitRepository || 'your-repo-url'}

# Install dependencies
${workspace.projectType === 'python' ? 'pip install -r requirements.txt' : 'npm install'}
\`\`\`

### Development
\`\`\`bash
# Start development server
${workspace.startCommand || 'npm start'}
\`\`\`

### Build
\`\`\`bash
# Build for production
${workspace.buildCommand || 'npm run build'}
\`\`\`

### Testing
\`\`\`bash
# Run tests
${workspace.testCommand || 'npm test'}
\`\`\`

## Features
- Autonomous Claude supervision
- Real-time code quality monitoring
- Integrated security scanning
- Performance optimization

## Contributing
This project uses Coder1 IDE with autonomous supervision for development.
`;
  }

  private getPackageJsonContent(workspace: WorkspaceConfig): string {
    const packageJson = {
      name: workspace.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `${workspace.projectType} project managed by Coder1 IDE`,
      main: workspace.projectType === 'node' ? 'dist/server.js' : 'src/index.js',
      scripts: {
        start: workspace.startCommand || 'react-scripts start',
        build: workspace.buildCommand || 'react-scripts build',
        test: workspace.testCommand || 'react-scripts test'
      },
      dependencies: workspace.dependencies.reduce((acc, dep) => {
        acc[dep] = 'latest';
        return acc;
      }, {} as Record<string, string>),
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0'
      }
    };

    return JSON.stringify(packageJson, null, 2);
  }

  private getRequirementsContent(workspace: WorkspaceConfig): string {
    return workspace.dependencies.join('\n') + '\n';
  }

  getWorkspace(workspaceId: string): WorkspaceConfig | undefined {
    return this.workspaces.get(workspaceId);
  }

  getAllWorkspaces(): WorkspaceConfig[] {
    return Array.from(this.workspaces.values());
  }

  async updateWorkspace(workspaceId: string, updates: Partial<WorkspaceConfig>): Promise<WorkspaceConfig> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const updatedWorkspace = { ...workspace, ...updates };
    this.workspaces.set(workspaceId, updatedWorkspace);
    
    return updatedWorkspace;
  }

  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    const deleted = this.workspaces.delete(workspaceId);
    this.workspaceMetrics.delete(workspaceId);
    
    if (deleted) {
      await this.cleanupWorkspaceFiles(workspaceId);
    }
    
    return deleted;
  }

  private async cleanupWorkspaceFiles(workspaceId: string): Promise<void> {
    console.log(`Cleaning up files for workspace ${workspaceId}`);
  }

  async duplicateWorkspace(sourceWorkspaceId: string, newName: string): Promise<WorkspaceConfig> {
    const sourceWorkspace = this.workspaces.get(sourceWorkspaceId);
    if (!sourceWorkspace) {
      throw new Error(`Source workspace ${sourceWorkspaceId} not found`);
    }

    const duplicatedWorkspace = await this.createWorkspace({
      ...sourceWorkspace,
      id: undefined, // Generate new ID
      name: newName,
      rootPath: undefined // Generate new path
    });

    return duplicatedWorkspace;
  }

  recordMetrics(workspaceId: string, metrics: Omit<WorkspaceMetrics, 'workspaceId' | 'timestamp'>): void {
    const workspaceMetrics = this.workspaceMetrics.get(workspaceId) || [];
    
    const newMetrics: WorkspaceMetrics = {
      workspaceId,
      timestamp: new Date(),
      ...metrics
    };

    workspaceMetrics.push(newMetrics);
    
    if (workspaceMetrics.length > 1000) {
      workspaceMetrics.splice(0, workspaceMetrics.length - 1000);
    }
    
    this.workspaceMetrics.set(workspaceId, workspaceMetrics);
  }

  getWorkspaceMetrics(workspaceId: string, limit: number = 100): WorkspaceMetrics[] {
    const metrics = this.workspaceMetrics.get(workspaceId) || [];
    return metrics.slice(-limit);
  }

  checkResourceLimits(workspaceId: string): { exceeded: boolean; violations: string[] } {
    const metrics = this.getWorkspaceMetrics(workspaceId, 1);
    if (metrics.length === 0) {
      return { exceeded: false, violations: [] };
    }

    const latest = metrics[0];
    const violations: string[] = [];

    if (latest.resourceUsage.cpu > this.resourceLimits.cpu) {
      violations.push(`CPU usage (${latest.resourceUsage.cpu}%) exceeds limit (${this.resourceLimits.cpu}%)`);
    }

    if (latest.resourceUsage.memory > this.resourceLimits.memory) {
      violations.push(`Memory usage (${latest.resourceUsage.memory}%) exceeds limit (${this.resourceLimits.memory}%)`);
    }

    if (latest.resourceUsage.disk > this.resourceLimits.disk) {
      violations.push(`Disk usage (${latest.resourceUsage.disk}%) exceeds limit (${this.resourceLimits.disk}%)`);
    }

    if (latest.resourceUsage.network > this.resourceLimits.network) {
      violations.push(`Network latency (${latest.resourceUsage.network}ms) exceeds limit (${this.resourceLimits.network}ms)`);
    }

    return { exceeded: violations.length > 0, violations };
  }

  getTemplate(templateId: string): WorkspaceTemplate | undefined {
    const templates = (this as any).templates as WorkspaceTemplate[];
    return templates.find(t => t.id === templateId);
  }

  getAllTemplates(): WorkspaceTemplate[] {
    return (this as any).templates as WorkspaceTemplate[];
  }

  updateResourceLimits(limits: Partial<WorkspaceResource>): void {
    this.resourceLimits = { ...this.resourceLimits, ...limits };
  }

  getResourceLimits(): WorkspaceResource {
    return { ...this.resourceLimits };
  }

  private generateWorkspaceId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async exportWorkspace(workspaceId: string): Promise<string> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const metrics = this.getWorkspaceMetrics(workspaceId);
    
    const exportData = {
      workspace,
      metrics,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importWorkspace(exportData: string): Promise<WorkspaceConfig> {
    const data = JSON.parse(exportData);
    const workspace = data.workspace as WorkspaceConfig;
    
    const newWorkspace = await this.createWorkspace({
      ...workspace,
      id: undefined,
      name: `${workspace.name} (Imported)`
    });

    if (data.metrics) {
      this.workspaceMetrics.set(newWorkspace.id, data.metrics);
    }

    return newWorkspace;
  }
}
