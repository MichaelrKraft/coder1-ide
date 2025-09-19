// Project Detection Utilities for Enhanced Preview
export interface ProjectInfo {
  framework: string;
  hasPackageJson: boolean;
  hasDevServer: boolean;
  devCommand?: string;
  devPort?: number;
  buildCommand?: string;
  suggestions: string[];
}

export interface DevServerStatus {
  isRunning: boolean;
  port?: number;
  url?: string;
  error?: string;
}

/**
 * Detect project framework and configuration
 */
export async function detectProject(): Promise<ProjectInfo> {
  const defaultProject: ProjectInfo = {
    framework: 'unknown',
    hasPackageJson: false,
    hasDevServer: false,
    suggestions: ['Create files to see live preview', 'Open JavaScript or React files in editor']
  };

  try {
    // Try to read package.json from the workspace
    const packageJsonResponse = await fetch('/api/files/read?path=package.json');

    if (!packageJsonResponse.ok) {
      return defaultProject;
    }

    const packageJsonData = await packageJsonResponse.json();
    if (!packageJsonData.success) {
      return defaultProject;
    }

    const packageJson = JSON.parse(packageJsonData.content);

    const project: ProjectInfo = {
      framework: detectFramework(packageJson),
      hasPackageJson: true,
      hasDevServer: false,
      suggestions: []
    };

    // Extract dev command and port
    const scripts = packageJson.scripts || {};
    project.devCommand = scripts.dev || scripts.start || scripts['dev:server'];
    project.buildCommand = scripts.build;

    // Try to detect dev server port
    project.devPort = detectDevPort(packageJson, project.devCommand);

    // Generate framework-specific suggestions
    project.suggestions = generateSuggestions(project.framework, packageJson);

    return project;
  } catch (error) {
    console.warn('Failed to detect project:', error);
    return defaultProject;
  }
}

/**
 * Detect framework from package.json dependencies
 */
function detectFramework(packageJson: any): string {
  const deps = { 
    ...packageJson.dependencies, 
    ...packageJson.devDependencies 
  };

  // Check for specific frameworks
  if (deps['next']) return 'Next.js';
  if (deps['react'] && (deps['@vitejs/plugin-react'] || deps['vite'])) return 'React + Vite';
  if (deps['react']) return 'React';
  if (deps['vue']) return 'Vue.js';
  if (deps['@angular/core']) return 'Angular';
  if (deps['svelte']) return 'Svelte';
  if (deps['nuxt']) return 'Nuxt.js';
  if (deps['gatsby']) return 'Gatsby';
  if (deps['express'] || deps['fastify'] || deps['koa']) return 'Node.js Server';
  if (deps['typescript'] && !deps['react'] && !deps['vue']) return 'TypeScript';

  return 'JavaScript';
}

/**
 * Extract dev server port from package.json or scripts
 */
function detectDevPort(packageJson: any, devCommand?: string): number | undefined {
  // Common default ports by framework
  const defaultPorts: Record<string, number> = {
    'Next.js': 3000,
    'React + Vite': 5173,
    'React': 3000,
    'Vue.js': 8080,
    'Angular': 4200,
    'Svelte': 5000,
    'Node.js Server': 3000
  };

  // Try to extract port from scripts
  if (devCommand) {
    const portMatch = devCommand.match(/--port[=\s](\d+)|\-p[=\s](\d+)|:(\d+)/);
    if (portMatch) {
      const port = parseInt(portMatch[1] || portMatch[2] || portMatch[3]);
      if (port) return port;
    }
  }

  // Check config files for port (basic patterns)
  const configValues = [
    packageJson.port,
    packageJson.config?.port,
    packageJson.vite?.server?.port,
    packageJson.next?.server?.port
  ];

  for (const port of configValues) {
    if (typeof port === 'number' && port > 1000 && port < 65536) {
      return port;
    }
  }

  // Return framework default
  const framework = detectFramework(packageJson);
  return defaultPorts[framework] || 3000;
}

/**
 * Generate helpful suggestions based on project type
 */
function generateSuggestions(framework: string, packageJson: any): string[] {
  const hasScripts = packageJson.scripts && Object.keys(packageJson.scripts).length > 0;
  const scripts = packageJson.scripts || {};

  const suggestions: string[] = [];

  // Framework-specific suggestions
  switch (framework) {
    case 'Next.js':
      suggestions.push('Run `npm run dev` to start Next.js development server');
      suggestions.push('Open pages in the editor to see live preview');
      if (scripts.build) suggestions.push('Use `npm run build` to create production build');
      break;

    case 'React + Vite':
    case 'React':
      suggestions.push('Start development server with `npm start` or `npm run dev`');
      suggestions.push('Open React components (.jsx, .tsx) for live preview');
      suggestions.push('Use Props playground to test component variations');
      break;

    case 'Vue.js':
      suggestions.push('Run `npm run serve` or `npm run dev` to start Vue development');
      suggestions.push('Open .vue components to see live preview');
      break;

    case 'Angular':
      suggestions.push('Use `ng serve` or `npm start` to start Angular development');
      suggestions.push('Open component files to see live updates');
      break;

    case 'Node.js Server':
      suggestions.push('Start your server with `npm start` or `npm run dev`');
      suggestions.push('API endpoints will be available for testing');
      break;

    case 'TypeScript':
      suggestions.push('Compile TypeScript with `npm run build` or `tsc`');
      suggestions.push('Open .ts files for syntax checking and preview');
      break;

    default:
      if (hasScripts) {
        const availableScripts = Object.keys(scripts).slice(0, 3);
        suggestions.push(`Available scripts: ${availableScripts.join(', ')}`);
      }
      suggestions.push('Open JavaScript files to enable live preview');
      suggestions.push('Add React or Vue dependencies for component preview');
  }

  return suggestions;
}

/**
 * Check if dev server is running on specified port
 */
export async function checkDevServerStatus(port: number = 3000): Promise<DevServerStatus> {
  const url = `http://localhost:${port}`;
  
  try {
    // Use a simple fetch with timeout to check if server responds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors', // Avoid CORS issues for this check
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return {
      isRunning: true,
      port,
      url
    };
  } catch (error) {
    return {
      isRunning: false,
      port,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

/**
 * Get smart action suggestions based on project state
 */
export function getSmartActions(projectInfo: ProjectInfo, devServerStatus: DevServerStatus): Array<{
  id: string;
  label: string;
  description: string;
  action: string;
  primary: boolean;
}> {
  const actions: Array<{
    id: string;
    label: string;
    description: string;
    action: string;
    primary: boolean;
  }> = [];

  // Dev server actions
  if (projectInfo.hasPackageJson && projectInfo.devCommand) {
    if (!devServerStatus.isRunning) {
      actions.push({
        id: 'start-dev-server',
        label: `Start ${projectInfo.framework} Server`,
        description: `Run ${projectInfo.devCommand} to start development server`,
        action: `npm run ${projectInfo.devCommand.replace('npm run ', '')}`,
        primary: true
      });
    } else {
      actions.push({
        id: 'open-dev-server',
        label: 'Open Running App',
        description: `View your ${projectInfo.framework} app in new tab`,
        action: 'open-tab',
        primary: true
      });
    }
  }

  // File creation suggestions
  if (projectInfo.framework === 'React' || projectInfo.framework === 'React + Vite') {
    actions.push({
      id: 'create-component',
      label: 'Create React Component',
      description: 'Generate a new React component file',
      action: 'create-file',
      primary: false
    });
  }

  // Build actions
  if (projectInfo.buildCommand) {
    actions.push({
      id: 'build-project',
      label: 'Build Project',
      description: `Run ${projectInfo.buildCommand} to create production build`,
      action: projectInfo.buildCommand,
      primary: false
    });
  }

  // Fallback actions
  if (actions.length === 0) {
    actions.push({
      id: 'create-file',
      label: 'Create New File',
      description: 'Create a JavaScript or React file to start',
      action: 'create-file',
      primary: true
    });
  }

  return actions;
}