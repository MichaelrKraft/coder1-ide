import React, { useState, useEffect } from 'react';
import { fileSystemService } from '../services/fileSystem';

interface AgentsFileWizardProps {
  isVisible: boolean;
  onClose: () => void;
  targetDirectory?: string;
  onFileCreated?: (filePath: string) => void;
}

interface ProjectDetectionResult {
  framework: string;
  packageManager: string;
  language: string;
  hasTests: boolean;
  buildTool: string;
  features: string[];
}

const AgentsFileWizard: React.FC<AgentsFileWizardProps> = ({ 
  isVisible, 
  onClose, 
  targetDirectory = '/', 
  onFileCreated 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [projectInfo, setProjectInfo] = useState<ProjectDetectionResult>({
    framework: 'unknown',
    packageManager: 'npm',
    language: 'javascript',
    hasTests: false,
    buildTool: 'unknown',
    features: []
  });
  const [customData, setCustomData] = useState({
    projectDescription: '',
    additionalCommands: '',
    codingGuidelines: '',
    contextNotes: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  // Auto-detect project setup when wizard opens
  useEffect(() => {
    if (isVisible && targetDirectory) {
      detectProjectSetup();
    }
  }, [isVisible, targetDirectory]);

  const detectProjectSetup = async () => {
    const detection: ProjectDetectionResult = {
      framework: 'unknown',
      packageManager: 'npm',
      language: 'javascript',
      hasTests: false,
      buildTool: 'unknown',
      features: []
    };

    try {
      // Check for package.json
      const packageJsonPath = `${targetDirectory}/package.json`;
      try {
        const packageContent = await fileSystemService.readFile(packageJsonPath);
        const packageData = JSON.parse(packageContent);
        
        // Detect package manager
        if (await fileExists(`${targetDirectory}/yarn.lock`)) {
          detection.packageManager = 'yarn';
        } else if (await fileExists(`${targetDirectory}/pnpm-lock.yaml`)) {
          detection.packageManager = 'pnpm';
        }

        // Detect framework
        const deps = { ...packageData.dependencies, ...packageData.devDependencies };
        if (deps.react) detection.framework = 'react';
        else if (deps.vue) detection.framework = 'vue';
        else if (deps.svelte) detection.framework = 'svelte';
        else if (deps.express) detection.framework = 'express';
        else if (deps.next) detection.framework = 'nextjs';
        else if (deps.nuxt) detection.framework = 'nuxt';

        // Detect language
        if (deps.typescript || await fileExists(`${targetDirectory}/tsconfig.json`)) {
          detection.language = 'typescript';
        }

        // Detect build tools
        if (deps.vite) detection.buildTool = 'vite';
        else if (deps.webpack) detection.buildTool = 'webpack';
        else if (deps.parcel) detection.buildTool = 'parcel';
        else if (packageData.scripts?.build) detection.buildTool = 'npm-scripts';

        // Detect testing
        if (deps.jest || deps.vitest || deps.cypress || deps.playwright) {
          detection.hasTests = true;
        }

        // Detect features
        const features = [];
        if (deps.tailwindcss) features.push('tailwindcss');
        if (deps.eslint) features.push('eslint');
        if (deps.prettier) features.push('prettier');
        if (deps['@storybook/react']) features.push('storybook');
        detection.features = features;

      } catch (error) {
        console.log('No package.json found or error reading it');
      }

      // Check for other indicators
      if (await fileExists(`${targetDirectory}/requirements.txt`)) {
        detection.language = 'python';
        detection.framework = 'python';
        detection.packageManager = 'pip';
      } else if (await fileExists(`${targetDirectory}/Cargo.toml`)) {
        detection.language = 'rust';
        detection.framework = 'rust';
        detection.packageManager = 'cargo';
      } else if (await fileExists(`${targetDirectory}/go.mod`)) {
        detection.language = 'go';
        detection.framework = 'go';
        detection.packageManager = 'go';
      }

    } catch (error) {
      console.error('Error detecting project setup:', error);
    }

    setProjectInfo(detection);
  };

  const fileExists = async (path: string): Promise<boolean> => {
    try {
      await fileSystemService.readFile(path);
      return true;
    } catch {
      return false;
    }
  };

  const generateTemplate = (): string => {
    const { framework, packageManager, language, hasTests, buildTool, features } = projectInfo;
    const { projectDescription, additionalCommands, codingGuidelines, contextNotes } = customData;

    return `# AGENTS.md

This file provides instructions for AI coding agents working with this ${framework !== 'unknown' ? framework : 'project'}.

## Project Overview
${projectDescription || `This is a ${language} project${framework !== 'unknown' ? ` using ${framework}` : ''}.`}

## Technology Stack
- **Language**: ${language}
${framework !== 'unknown' ? `- **Framework**: ${framework}` : ''}
- **Package Manager**: ${packageManager}
${buildTool !== 'unknown' ? `- **Build Tool**: ${buildTool}` : ''}
${features.length > 0 ? `- **Additional Tools**: ${features.join(', ')}` : ''}

## Build Commands
${generateBuildCommands()}

## Project Structure
${generateProjectStructure()}

${hasTests ? `## Testing
- Run tests with the appropriate command above
- Write tests for new features
- Maintain test coverage above 80%

` : ''}## Coding Guidelines
${codingGuidelines || generateCodingGuidelines()}

${additionalCommands ? `## Additional Commands
${additionalCommands}

` : ''}## Context for AI Agents
${contextNotes || generateContextNotes()}

---
*Generated by CoderOne IDE - AGENTS.md Wizard*`;
  };

  const generateBuildCommands = (): string => {
    const { packageManager, framework, hasTests } = projectInfo;
    
    const commands = [];
    
    if (packageManager === 'python') {
      commands.push('- `pip install -r requirements.txt` - Install dependencies');
      commands.push('- `python main.py` - Run the application');
      if (hasTests) commands.push('- `pytest` - Run tests');
    } else if (packageManager === 'cargo') {
      commands.push('- `cargo build` - Build the project');
      commands.push('- `cargo run` - Run the application');
      commands.push('- `cargo test` - Run tests');
    } else if (packageManager === 'go') {
      commands.push('- `go build` - Build the project');
      commands.push('- `go run main.go` - Run the application');
      commands.push('- `go test` - Run tests');
    } else {
      // JavaScript/TypeScript projects
      commands.push(`- \`${packageManager} install\` - Install dependencies`);
      
      if (framework === 'react' || framework === 'nextjs') {
        commands.push(`- \`${packageManager} run dev\` - Start development server`);
        commands.push(`- \`${packageManager} run build\` - Build for production`);
      } else if (framework === 'express') {
        commands.push(`- \`${packageManager} run start\` - Start the server`);
        commands.push(`- \`${packageManager} run dev\` - Start development server`);
      } else {
        commands.push(`- \`${packageManager} start\` - Start the application`);
        commands.push(`- \`${packageManager} run build\` - Build the project`);
      }
      
      if (hasTests) {
        commands.push(`- \`${packageManager} test\` - Run tests`);
      }
    }

    return commands.join('\n');
  };

  const generateProjectStructure = (): string => {
    const { framework, language } = projectInfo;
    
    if (framework === 'react' || framework === 'nextjs') {
      return `- \`src/\` - Source code
  - \`components/\` - React components
  - \`pages/\` - Page components${framework === 'nextjs' ? ' (Next.js routing)' : ''}
  - \`hooks/\` - Custom React hooks
  - \`utils/\` - Utility functions
  - \`types/\` - TypeScript type definitions
- \`public/\` - Static assets
- \`package.json\` - Project dependencies and scripts`;
    } else if (language === 'python') {
      return `- Main application files in root directory
- \`requirements.txt\` - Python dependencies
- \`tests/\` - Test files
- \`README.md\` - Project documentation`;
    } else {
      return `- \`src/\` - Source code directory
- Main application files
- Configuration files
- Documentation files`;
    }
  };

  const generateCodingGuidelines = (): string => {
    const { language, features } = projectInfo;
    
    const guidelines = [];
    
    if (language === 'typescript') {
      guidelines.push('- Use TypeScript strict mode');
      guidelines.push('- Define interfaces for all data structures');
      guidelines.push('- Prefer explicit types over `any`');
    } else if (language === 'javascript') {
      guidelines.push('- Use modern ES6+ syntax');
      guidelines.push('- Write clear, self-documenting code');
    } else if (language === 'python') {
      guidelines.push('- Follow PEP 8 style guide');
      guidelines.push('- Use type hints where appropriate');
      guidelines.push('- Write docstrings for functions and classes');
    }

    if (features.includes('eslint')) {
      guidelines.push('- Follow ESLint configuration');
    }
    
    if (features.includes('prettier')) {
      guidelines.push('- Code formatting handled by Prettier');
    }

    guidelines.push('- Write meaningful commit messages');
    guidelines.push('- Add comments for complex logic');
    
    return guidelines.join('\n');
  };

  const generateContextNotes = (): string => {
    const { framework, language } = projectInfo;
    
    return `This ${language} project${framework !== 'unknown' ? ` uses ${framework}` : ''} and follows modern development practices. 

When working with this codebase:
- Maintain consistency with existing code style
- Test new features thoroughly
- Update documentation when making significant changes
- Consider performance implications of changes
- Follow security best practices

The project structure and build commands above will help you understand how to work effectively with this codebase.`;
  };

  const handleCreateFile = async () => {
    setIsCreating(true);
    
    try {
      const agentsPath = `${targetDirectory}/AGENTS.md`;
      const template = generateTemplate();
      
      const success = await fileSystemService.writeFile(agentsPath, template);
      
      if (success) {
        onFileCreated?.(agentsPath);
        onClose();
        
        // Show success notification
        const notification = document.createElement('div');
        notification.innerHTML = `✅ <strong>AGENTS.md</strong> created successfully!`;
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 10000;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95));
          color: white; padding: 14px 20px; border-radius: 8px;
          font-size: 14px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
          animation: slideInFade 0.3s ease-out;
          font-family: -apple-system, system-ui, sans-serif;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
        
      } else {
        throw new Error('Failed to write file');
      }
    } catch (error) {
      console.error('Failed to create AGENTS.md:', error);
      alert('Failed to create AGENTS.md file. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div className="agents-wizard" onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: 'var(--tokyo-bg)',
        border: '2px solid var(--tokyo-purple)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '700px',
        width: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--tokyo-fg)',
            fontSize: '24px',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--tokyo-purple)', marginBottom: '8px', fontSize: '24px' }}>
            🤖 Create AGENTS.md File
          </h2>
          <p style={{ color: 'var(--tokyo-fg-dark)', margin: 0 }}>
            Generate AI-friendly documentation for your project
          </p>
        </div>

        {currentStep === 0 && (
          <div>
            <h3 style={{ color: 'var(--tokyo-fg)', marginBottom: '16px' }}>
              Project Detection Results
            </h3>
            
            <div style={{ 
              background: 'var(--tokyo-bg-dark)', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div>
                  <strong style={{ color: 'var(--tokyo-blue)' }}>Framework:</strong> {projectInfo.framework}
                </div>
                <div>
                  <strong style={{ color: 'var(--tokyo-blue)' }}>Language:</strong> {projectInfo.language}
                </div>
                <div>
                  <strong style={{ color: 'var(--tokyo-blue)' }}>Package Manager:</strong> {projectInfo.packageManager}
                </div>
                <div>
                  <strong style={{ color: 'var(--tokyo-blue)' }}>Build Tool:</strong> {projectInfo.buildTool}
                </div>
                <div>
                  <strong style={{ color: 'var(--tokyo-blue)' }}>Has Tests:</strong> {projectInfo.hasTests ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong style={{ color: 'var(--tokyo-blue)' }}>Features:</strong> {projectInfo.features.join(', ') || 'None detected'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--tokyo-fg)', fontWeight: '600' }}>
                Project Description (Optional)
              </label>
              <textarea
                value={customData.projectDescription}
                onChange={(e) => setCustomData(prev => ({ ...prev, projectDescription: e.target.value }))}
                placeholder="Brief description of what this project does..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--tokyo-bg-dark)',
                  border: '1px solid var(--tokyo-fg-gutter)',
                  borderRadius: '6px',
                  color: 'var(--tokyo-fg)',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--tokyo-fg-dark)', fontSize: '14px' }}>
                Step 1 of 2 - Project Setup
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                style={{
                  background: 'var(--tokyo-purple)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h3 style={{ color: 'var(--tokyo-fg)', marginBottom: '16px' }}>
              Additional Configuration
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--tokyo-fg)', fontWeight: '600' }}>
                Additional Commands (Optional)
              </label>
              <textarea
                value={customData.additionalCommands}
                onChange={(e) => setCustomData(prev => ({ ...prev, additionalCommands: e.target.value }))}
                placeholder="Any custom build or deployment commands..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--tokyo-bg-dark)',
                  border: '1px solid var(--tokyo-fg-gutter)',
                  borderRadius: '6px',
                  color: 'var(--tokyo-fg)',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--tokyo-fg)', fontWeight: '600' }}>
                Coding Guidelines (Optional)
              </label>
              <textarea
                value={customData.codingGuidelines}
                onChange={(e) => setCustomData(prev => ({ ...prev, codingGuidelines: e.target.value }))}
                placeholder="Specific coding standards or preferences..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--tokyo-bg-dark)',
                  border: '1px solid var(--tokyo-fg-gutter)',
                  borderRadius: '6px',
                  color: 'var(--tokyo-fg)',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--tokyo-fg)', fontWeight: '600' }}>
                Context Notes (Optional)
              </label>
              <textarea
                value={customData.contextNotes}
                onChange={(e) => setCustomData(prev => ({ ...prev, contextNotes: e.target.value }))}
                placeholder="Additional context to help AI agents understand this project..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--tokyo-bg-dark)',
                  border: '1px solid var(--tokyo-fg-gutter)',
                  borderRadius: '6px',
                  color: 'var(--tokyo-fg)',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentStep(0)}
                style={{
                  background: 'transparent',
                  color: 'var(--tokyo-fg)',
                  border: '1px solid var(--tokyo-fg-gutter)',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ← Back
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ color: 'var(--tokyo-fg-dark)', fontSize: '14px' }}>
                  Step 2 of 2 - Customization
                </div>
                <button
                  onClick={handleCreateFile}
                  disabled={isCreating}
                  style={{
                    background: isCreating ? 'var(--tokyo-fg-gutter)' : 'var(--tokyo-green)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    minWidth: '120px'
                  }}
                >
                  {isCreating ? 'Creating...' : '🤖 Create File'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsFileWizard;