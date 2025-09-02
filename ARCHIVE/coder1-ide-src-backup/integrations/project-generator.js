/**
 * Real Project File Generation System
 * 
 * Handles actual file creation, project scaffolding, and structure generation
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ProjectGenerator {
    constructor(options = {}) {
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../projects');
        this.templatesDir = options.templatesDir || path.join(__dirname, '../templates');
        this.logger = options.logger || console;
        
        // File generation metrics
        this.metrics = {
            projectsGenerated: 0,
            filesCreated: 0,
            totalLinesGenerated: 0,
            averageProjectSize: 0
        };
    }

    /**
     * Generate a complete project from enhanced brief
     */
    async generateProject(enhancedBrief, options = {}) {
        const projectId = options.projectId || `project-${Date.now()}`;
        const projectPath = path.join(this.projectsDir, projectId);
        
        try {
            this.logger.log(`📁 Generating project: ${projectId}`);
            
            // Create project directory
            await fs.mkdir(projectPath, { recursive: true });
            
            // Parse enhanced brief to extract requirements
            const requirements = this._parseEnhancedBrief(enhancedBrief);
            
            // Generate project structure
            const projectStructure = await this._generateProjectStructure(requirements);
            
            // Create files based on structure
            const createdFiles = await this._createProjectFiles(projectPath, projectStructure, requirements);
            
            // Install dependencies if needed
            if (projectStructure.packageJson) {
                await this._createPackageJson(projectPath, projectStructure.packageJson);
            }
            
            // Create deployment configuration
            if (requirements.deployment) {
                await this._createDeploymentConfig(projectPath, requirements.deployment);
            }
            
            // Generate README
            await this._createReadme(projectPath, requirements);
            
            // Update metrics
            this.metrics.projectsGenerated++;
            this.metrics.filesCreated += createdFiles.length;
            
            const projectInfo = {
                id: projectId,
                path: projectPath,
                requirements,
                structure: projectStructure,
                files: createdFiles,
                createdAt: new Date().toISOString(),
                size: await this._calculateProjectSize(projectPath)
            };
            
            this.logger.log(`✅ Project generated: ${projectId} with ${createdFiles.length} files`);
            
            return projectInfo;
            
        } catch (error) {
            this.logger.error(`❌ Project generation failed: ${projectId}`, error);
            throw error;
        }
    }

    /**
     * Parse enhanced brief to extract structured requirements
     */
    _parseEnhancedBrief(enhancedBrief) {
        // Extract key information from enhanced brief
        const requirements = {
            projectName: this._extractProjectName(enhancedBrief),
            projectType: this._extractProjectType(enhancedBrief),
            framework: this._extractFramework(enhancedBrief),
            features: this._extractFeatures(enhancedBrief),
            styling: this._extractStyling(enhancedBrief),
            deployment: this._extractDeployment(enhancedBrief),
            database: this._extractDatabase(enhancedBrief),
            authentication: this._extractAuthentication(enhancedBrief)
        };
        
        return requirements;
    }

    /**
     * Generate project structure based on requirements
     */
    async _generateProjectStructure(requirements) {
        const structure = {
            type: requirements.projectType,
            framework: requirements.framework,
            directories: [],
            files: [],
            packageJson: null,
            scripts: {}
        };

        // Define structure based on project type and framework
        switch (requirements.framework) {
            case 'react':
                structure.directories = ['src', 'public', 'src/components', 'src/hooks', 'src/utils'];
                structure.files = [
                    'src/App.js',
                    'src/index.js',
                    'src/App.css',
                    'src/index.css',
                    'public/index.html'
                ];
                structure.packageJson = this._getReactPackageJson(requirements);
                break;
                
            case 'nextjs':
                structure.directories = ['pages', 'components', 'styles', 'public', 'lib'];
                structure.files = [
                    'pages/index.js',
                    'pages/_app.js',
                    'components/Layout.js',
                    'styles/globals.css',
                    'package.json'
                ];
                structure.packageJson = this._getNextJSPackageJson(requirements);
                break;
                
            case 'vanilla':
                structure.directories = ['css', 'js', 'images'];
                structure.files = [
                    'index.html',
                    'css/styles.css',
                    'js/script.js'
                ];
                break;
                
            case 'vue':
                structure.directories = ['src', 'public', 'src/components'];
                structure.files = [
                    'src/main.js',
                    'src/App.vue',
                    'public/index.html'
                ];
                structure.packageJson = this._getVuePackageJson(requirements);
                break;
                
            default:
                // Default to vanilla HTML/CSS/JS
                structure.directories = ['assets', 'css', 'js'];
                structure.files = [
                    'index.html',
                    'css/styles.css',
                    'js/script.js'
                ];
        }

        return structure;
    }

    /**
     * Create all project files
     */
    async _createProjectFiles(projectPath, structure, requirements) {
        const createdFiles = [];
        
        // Create directories
        for (const dir of structure.directories) {
            const dirPath = path.join(projectPath, dir);
            await fs.mkdir(dirPath, { recursive: true });
        }
        
        // Create files
        for (const file of structure.files) {
            const filePath = path.join(projectPath, file);
            const content = await this._generateFileContent(file, requirements, structure);
            
            await fs.writeFile(filePath, content, 'utf8');
            createdFiles.push({
                path: file,
                size: content.length,
                lines: content.split('\n').length
            });
        }
        
        return createdFiles;
    }

    /**
     * Generate content for specific file types
     */
    async _generateFileContent(filePath, requirements, structure) {
        const fileName = path.basename(filePath);
        const fileExt = path.extname(filePath);
        
        switch (fileName) {
            case 'index.html':
                return this._generateHTML(requirements, structure);
            case 'styles.css':
            case 'globals.css':
                return this._generateCSS(requirements);
            case 'script.js':
                return this._generateJavaScript(requirements);
            case 'App.js':
                return this._generateReactApp(requirements);
            case 'index.js':
                if (structure.framework === 'react') {
                    return this._generateReactIndex(requirements);
                }
                return this._generateJavaScript(requirements);
            default:
                if (fileExt === '.js') {
                    return this._generateJavaScript(requirements);
                } else if (fileExt === '.css') {
                    return this._generateCSS(requirements);
                } else if (fileExt === '.html') {
                    return this._generateHTML(requirements, structure);
                }
                return '// Generated file\n';
        }
    }

    /**
     * Generate HTML content
     */
    _generateHTML(requirements, structure) {
        const title = requirements.projectName || 'Generated Project';
        const styling = requirements.styling || 'modern';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="${structure.framework === 'vanilla' ? 'css/' : ''}styles.css">
</head>
<body>
    <header>
        <nav>
            <h1>${title}</h1>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section id="hero">
            <h2>Welcome to ${title}</h2>
            <p>This is an autonomously generated website built with AI.</p>
            ${requirements.features.includes('cta') ? '<button class="cta-button">Get Started</button>' : ''}
        </section>
        
        ${requirements.features.includes('gallery') ? this._generateGallerySection() : ''}
        ${requirements.features.includes('testimonials') ? this._generateTestimonialsSection() : ''}
        ${requirements.features.includes('contact') ? this._generateContactSection() : ''}
    </main>
    
    <footer>
        <p>&copy; 2024 ${title}. Generated autonomously with Coder1ide.</p>
    </footer>
    
    <script src="${structure.framework === 'vanilla' ? 'js/' : ''}script.js"></script>
</body>
</html>`;
    }

    /**
     * Generate CSS content
     */
    _generateCSS(requirements) {
        const styling = requirements.styling || 'modern';
        
        let baseStyles = `/* Generated CSS */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    background: #2c3e50;
    color: white;
    padding: 1rem 0;
}

nav {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
}

nav ul {
    display: flex;
    list-style: none;
    gap: 2rem;
}

nav a {
    color: white;
    text-decoration: none;
    transition: opacity 0.3s;
}

nav a:hover {
    opacity: 0.8;
}

main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

#hero {
    text-align: center;
    padding: 4rem 0;
}

#hero h2 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.cta-button {
    background: #3498db;
    color: white;
    padding: 1rem 2rem;
    border: none;
    border-radius: 5px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: background 0.3s;
}

.cta-button:hover {
    background: #2980b9;
}

footer {
    background: #34495e;
    color: white;
    text-align: center;
    padding: 2rem 0;
    margin-top: 4rem;
}`;

        // Add styling-specific CSS
        if (styling === 'glassmorphism') {
            baseStyles += `
/* Glassmorphism effects */
nav {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.cta-button {
    background: rgba(52, 152, 219, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}`;
        }

        if (styling === 'gradient') {
            baseStyles += `
/* Gradient effects */
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}`;
        }

        return baseStyles;
    }

    /**
     * Generate JavaScript content
     */
    _generateJavaScript(requirements) {
        let jsContent = `// Generated JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('${requirements.projectName || 'Project'} loaded successfully');
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });`;

        // Add feature-specific JavaScript
        if (requirements.features.includes('cta')) {
            jsContent += `
    
    // CTA button interaction
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            alert('Welcome to ${requirements.projectName || 'our project'}!');
        });
    }`;
        }

        if (requirements.features.includes('contact')) {
            jsContent += `
    
    // Contact form handling
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }`;
        }

        jsContent += `
});`;

        return jsContent;
    }

    /**
     * Generate React App component
     */
    _generateReactApp(requirements) {
        return `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${requirements.projectName || 'React App'}</h1>
        <p>Autonomously generated React application</p>
        ${requirements.features.includes('cta') ? `
        <button className="cta-button" onClick={() => alert('Hello from React!')}>
          Get Started
        </button>` : ''}
      </header>
      
      <main>
        ${requirements.features.includes('gallery') ? `
        <section className="gallery">
          <h2>Gallery</h2>
          <div className="gallery-grid">
            {/* Gallery items will be added here */}
          </div>
        </section>` : ''}
      </main>
      
      <footer>
        <p>&copy; 2024 ${requirements.projectName || 'React App'}. Built with Coder1ide.</p>
      </footer>
    </div>
  );
}

export default App;`;
    }

    /**
     * Generate React index.js file
     */
    _generateReactIndex(requirements) {
        return `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    }

    /**
     * Extract project information from enhanced brief
     */
    _extractProjectName(brief) {
        const nameMatch = brief.match(/project name[:\s]+([^\n.]+)/i);
        return nameMatch ? nameMatch[1].trim() : 'Generated Project';
    }

    _extractProjectType(brief) {
        if (brief.toLowerCase().includes('ecommerce') || brief.toLowerCase().includes('e-commerce')) {
            return 'ecommerce';
        } else if (brief.toLowerCase().includes('portfolio')) {
            return 'portfolio';
        } else if (brief.toLowerCase().includes('blog')) {
            return 'blog';
        } else if (brief.toLowerCase().includes('landing')) {
            return 'landing';
        }
        return 'website';
    }

    _extractFramework(brief) {
        if (brief.toLowerCase().includes('react')) {
            return 'react';
        } else if (brief.toLowerCase().includes('next') || brief.toLowerCase().includes('nextjs')) {
            return 'nextjs';
        } else if (brief.toLowerCase().includes('vue')) {
            return 'vue';
        }
        return 'vanilla';
    }

    _extractFeatures(brief) {
        const features = [];
        const lowerBrief = brief.toLowerCase();
        
        if (lowerBrief.includes('contact') || lowerBrief.includes('contact form')) {
            features.push('contact');
        }
        if (lowerBrief.includes('gallery') || lowerBrief.includes('portfolio')) {
            features.push('gallery');
        }
        if (lowerBrief.includes('testimonial') || lowerBrief.includes('review')) {
            features.push('testimonials');
        }
        if (lowerBrief.includes('call to action') || lowerBrief.includes('cta') || lowerBrief.includes('button')) {
            features.push('cta');
        }
        
        return features;
    }

    _extractStyling(brief) {
        const lowerBrief = brief.toLowerCase();
        
        if (lowerBrief.includes('glassmorphism') || lowerBrief.includes('glass')) {
            return 'glassmorphism';
        } else if (lowerBrief.includes('gradient')) {
            return 'gradient';
        } else if (lowerBrief.includes('minimal')) {
            return 'minimal';
        }
        return 'modern';
    }

    _extractDeployment(brief) {
        const lowerBrief = brief.toLowerCase();
        
        if (lowerBrief.includes('vercel')) {
            return 'vercel';
        } else if (lowerBrief.includes('netlify')) {
            return 'netlify';
        }
        return 'vercel'; // Default to Vercel
    }

    _extractDatabase(brief) {
        // Implementation for database extraction
        return null; // Simplified for now
    }

    _extractAuthentication(brief) {
        // Implementation for auth extraction
        return null; // Simplified for now
    }

    /**
     * Helper methods for generating package.json files
     */
    _getReactPackageJson(requirements) {
        return {
            name: requirements.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            version: '0.1.0',
            private: true,
            dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                'react-scripts': '5.0.1'
            },
            scripts: {
                start: 'react-scripts start',
                build: 'react-scripts build',
                test: 'react-scripts test',
                eject: 'react-scripts eject'
            }
        };
    }

    _getNextJSPackageJson(requirements) {
        return {
            name: requirements.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            version: '0.1.0',
            private: true,
            dependencies: {
                next: '^14.0.0',
                react: '^18.2.0',
                'react-dom': '^18.2.0'
            },
            scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint'
            }
        };
    }

    _getVuePackageJson(requirements) {
        return {
            name: requirements.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            version: '0.1.0',
            private: true,
            dependencies: {
                vue: '^3.3.0'
            },
            scripts: {
                serve: 'vue-cli-service serve',
                build: 'vue-cli-service build',
                lint: 'vue-cli-service lint'
            }
        };
    }

    /**
     * Generate additional content sections
     */
    _generateGallerySection() {
        return `
        <section id="gallery">
            <h2>Gallery</h2>
            <div class="gallery-grid">
                <div class="gallery-item">
                    <img src="https://via.placeholder.com/300x200" alt="Gallery Item 1">
                    <h3>Project 1</h3>
                    <p>Description of the first project.</p>
                </div>
                <div class="gallery-item">
                    <img src="https://via.placeholder.com/300x200" alt="Gallery Item 2">
                    <h3>Project 2</h3>
                    <p>Description of the second project.</p>
                </div>
            </div>
        </section>`;
    }

    _generateTestimonialsSection() {
        return `
        <section id="testimonials">
            <h2>What People Say</h2>
            <div class="testimonials-grid">
                <div class="testimonial">
                    <p>"This is an amazing project!"</p>
                    <cite>- Happy Client</cite>
                </div>
            </div>
        </section>`;
    }

    _generateContactSection() {
        return `
        <section id="contact">
            <h2>Contact Us</h2>
            <form id="contact-form">
                <div class="form-group">
                    <label for="name">Name:</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="message">Message:</label>
                    <textarea id="message" name="message" required></textarea>
                </div>
                <button type="submit">Send Message</button>
            </form>
        </section>`;
    }

    /**
     * Create package.json file
     */
    async _createPackageJson(projectPath, packageJsonData) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const content = JSON.stringify(packageJsonData, null, 2);
        await fs.writeFile(packageJsonPath, content, 'utf8');
    }

    /**
     * Create deployment configuration
     */
    async _createDeploymentConfig(projectPath, deployment) {
        if (deployment === 'vercel') {
            const vercelConfig = {
                version: 2,
                builds: [
                    {
                        src: 'package.json',
                        use: '@vercel/static-build',
                        config: { distDir: 'build' }
                    }
                ]
            };
            
            const configPath = path.join(projectPath, 'vercel.json');
            await fs.writeFile(configPath, JSON.stringify(vercelConfig, null, 2), 'utf8');
        }
    }

    /**
     * Create README file
     */
    async _createReadme(projectPath, requirements) {
        const readmeContent = `# ${requirements.projectName}

This project was autonomously generated using Coder1ide.

## Features

${requirements.features.map(feature => `- ${feature.charAt(0).toUpperCase() + feature.slice(1)}`).join('\n')}

## Framework

Built with ${requirements.framework}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

## Deployment

This project is configured for deployment on ${requirements.deployment}.

## Generated by

[Coder1ide](https://coder1ide.com) - Autonomous Development Platform
`;

        const readmePath = path.join(projectPath, 'README.md');
        await fs.writeFile(readmePath, readmeContent, 'utf8');
    }

    /**
     * Calculate project size metrics
     */
    async _calculateProjectSize(projectPath) {
        let totalSize = 0;
        let fileCount = 0;
        
        async function calculateDir(dirPath) {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                
                if (item.isDirectory()) {
                    await calculateDir(itemPath);
                } else {
                    const stats = await fs.stat(itemPath);
                    totalSize += stats.size;
                    fileCount++;
                }
            }
        }
        
        await calculateDir(projectPath);
        
        return {
            totalSize,
            fileCount,
            averageFileSize: fileCount > 0 ? totalSize / fileCount : 0
        };
    }
}

module.exports = { ProjectGenerator };