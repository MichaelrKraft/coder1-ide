/**
 * Wireframe Generation Service
 * 
 * Generates wireframes for different project types using hand-drawn styling
 * Creates 2-3 wireframe options based on project requirements
 */

const { logger } = require('../monitoring/comprehensive-logger');
const fs = require('fs').promises;
const path = require('path');

class WireframeGenerationService {
    constructor(options = {}) {
        this.logger = options.logger || logger;
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../projects');
    }

    /**
     * Generate wireframes for a project
     */
    async generateWireframes(prdDocument, projectId) {
        try {
            this.logger.info('🎨 Generating wireframes for project', { 
                projectId, 
                projectType: prdDocument.metadata.projectType 
            });

            const wireframes = [];
            const projectType = prdDocument.metadata.projectType;

            // Generate 3 different wireframe layouts
            wireframes.push(this.generateLayout1(projectType, prdDocument));
            wireframes.push(this.generateLayout2(projectType, prdDocument));
            wireframes.push(this.generateLayout3(projectType, prdDocument));

            // Save wireframes to project directory
            const wireframeData = {
                projectId,
                projectType,
                wireframes,
                generatedAt: new Date().toISOString(),
                metadata: {
                    totalOptions: wireframes.length,
                    complexity: prdDocument.metadata.complexity,
                    basedOnPRD: true
                }
            };

            await this.saveWireframes(projectId, wireframeData);

            this.logger.info('✅ Wireframes generated successfully', {
                projectId,
                count: wireframes.length,
                types: wireframes.map(w => w.style)
            });

            return wireframeData;

        } catch (error) {
            this.logger.error('❌ Failed to generate wireframes', {
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Layout 1: Classic Clean Layout
     */
    generateLayout1(projectType, prdDocument) {
        const layout = {
            id: 'layout-1',
            name: 'Classic Clean',
            style: 'clean',
            description: 'Professional and clean layout with traditional navigation',
            svg: this.generateCleanLayoutSVG(projectType),
            html: this.generateCleanLayoutHTML(projectType),
            features: [
                'Top navigation bar',
                'Hero section with clear CTA',
                'Organized content sections',
                'Footer with links'
            ],
            bestFor: ['business', 'professional', 'corporate'],
            mobileResponsive: true
        };

        return layout;
    }

    /**
     * Layout 2: Modern Grid Layout
     */
    generateLayout2(projectType, prdDocument) {
        const layout = {
            id: 'layout-2',
            name: 'Modern Grid',
            style: 'modern',
            description: 'Contemporary grid-based layout with visual emphasis',
            svg: this.generateModernLayoutSVG(projectType),
            html: this.generateModernLayoutHTML(projectType),
            features: [
                'Grid-based content organization',
                'Visual hierarchy emphasis',
                'Interactive elements',
                'Mobile-first design'
            ],
            bestFor: ['portfolio', 'creative', 'showcase'],
            mobileResponsive: true
        };

        return layout;
    }

    /**
     * Layout 3: Minimalist Layout
     */
    generateLayout3(projectType, prdDocument) {
        const layout = {
            id: 'layout-3',
            name: 'Minimalist Focus',
            style: 'minimal',
            description: 'Clean and focused layout with minimal distractions',
            svg: this.generateMinimalLayoutSVG(projectType),
            html: this.generateMinimalLayoutHTML(projectType),
            features: [
                'Minimal navigation',
                'Content-focused design',
                'Plenty of white space',
                'Clear typography hierarchy'
            ],
            bestFor: ['blog', 'writing', 'content-focused'],
            mobileResponsive: true
        };

        return layout;
    }

    /**
     * Generate Clean Layout SVG
     */
    generateCleanLayoutSVG(projectType) {
        const components = this.getProjectTypeComponents(projectType);
        
        return `<svg width="400" height="600" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="400" height="600" fill="#f8f9fa" stroke="#e9ecef" stroke-width="2"/>
  
  <!-- Header -->
  <rect x="10" y="10" width="380" height="60" fill="none" stroke="#495057" stroke-width="2" rx="4"/>
  <text x="20" y="35" font-family="Arial, sans-serif" font-size="14" fill="#495057">Logo</text>
  <text x="340" y="35" font-family="Arial, sans-serif" font-size="12" fill="#495057">Menu</text>
  
  <!-- Hero Section -->
  <rect x="10" y="80" width="380" height="120" fill="none" stroke="#495057" stroke-width="2" rx="4"/>
  <text x="200" y="125" font-family="Arial, sans-serif" font-size="18" fill="#495057" text-anchor="middle">Hero Title</text>
  <text x="200" y="145" font-family="Arial, sans-serif" font-size="12" fill="#6c757d" text-anchor="middle">Compelling subtitle text here</text>
  <rect x="170" y="160" width="60" height="25" fill="none" stroke="#007bff" stroke-width="2" rx="4"/>
  <text x="200" y="175" font-family="Arial, sans-serif" font-size="10" fill="#007bff" text-anchor="middle">CTA Button</text>
  
  <!-- Main Content Area -->
  <rect x="10" y="210" width="380" height="200" fill="none" stroke="#495057" stroke-width="2" rx="4"/>
  ${this.generateContentBlocks(projectType, 220, 40)}
  
  <!-- Sidebar -->
  <rect x="300" y="420" width="90" height="120" fill="none" stroke="#6c757d" stroke-width="1" rx="4"/>
  <text x="345" y="435" font-family="Arial, sans-serif" font-size="10" fill="#6c757d" text-anchor="middle">Sidebar</text>
  
  <!-- Footer -->
  <rect x="10" y="550" width="380" height="40" fill="none" stroke="#495057" stroke-width="2" rx="4"/>
  <text x="200" y="575" font-family="Arial, sans-serif" font-size="10" fill="#6c757d" text-anchor="middle">Footer Links & Info</text>
</svg>`;
    }

    /**
     * Generate Modern Layout SVG
     */
    generateModernLayoutSVG(projectType) {
        return `<svg width="400" height="600" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="400" height="600" fill="#ffffff" stroke="#dee2e6" stroke-width="2"/>
  
  <!-- Navigation -->
  <rect x="10" y="10" width="380" height="50" fill="none" stroke="#495057" stroke-width="2" rx="8"/>
  <circle cx="35" cy="35" r="12" fill="none" stroke="#007bff" stroke-width="2"/>
  <text x="60" y="40" font-family="Arial, sans-serif" font-size="12" fill="#495057">Brand</text>
  
  <!-- Grid Layout -->
  <rect x="10" y="70" width="185" height="140" fill="none" stroke="#495057" stroke-width="2" rx="8"/>
  <text x="102" y="95" font-family="Arial, sans-serif" font-size="14" fill="#495057" text-anchor="middle">Featured</text>
  <text x="102" y="110" font-family="Arial, sans-serif" font-size="10" fill="#6c757d" text-anchor="middle">Main content area</text>
  
  <rect x="205" y="70" width="185" height="140" fill="none" stroke="#6c757d" stroke-width="1" rx="8"/>
  <text x="297" y="95" font-family="Arial, sans-serif" font-size="12" fill="#6c757d" text-anchor="middle">Secondary</text>
  
  <!-- Content Cards -->
  <rect x="10" y="220" width="120" height="100" fill="none" stroke="#495057" stroke-width="2" rx="8"/>
  <rect x="140" y="220" width="120" height="100" fill="none" stroke="#495057" stroke-width="2" rx="8"/>
  <rect x="270" y="220" width="120" height="100" fill="none" stroke="#495057" stroke-width="2" rx="8"/>
  
  ${this.generateGridItems(projectType, 330)}
  
  <!-- Action Area -->
  <rect x="10" y="480" width="380" height="80" fill="none" stroke="#28a745" stroke-width="2" rx="8"/>
  <text x="200" y="505" font-family="Arial, sans-serif" font-size="14" fill="#28a745" text-anchor="middle">Call to Action</text>
  <text x="200" y="520" font-family="Arial, sans-serif" font-size="10" fill="#6c757d" text-anchor="middle">Secondary message</text>
  <rect x="160" y="530" width="80" height="25" fill="none" stroke="#28a745" stroke-width="2" rx="4"/>
  <text x="200" y="545" font-family="Arial, sans-serif" font-size="10" fill="#28a745" text-anchor="middle">Get Started</text>
</svg>`;
    }

    /**
     * Generate Minimal Layout SVG
     */
    generateMinimalLayoutSVG(projectType) {
        return `<svg width="400" height="600" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="400" height="600" fill="#ffffff" stroke="#f8f9fa" stroke-width="1"/>
  
  <!-- Minimal Header -->
  <text x="200" y="40" font-family="Arial, sans-serif" font-size="16" fill="#212529" text-anchor="middle">Brand</text>
  <line x1="50" y1="60" x2="350" y2="60" stroke="#dee2e6" stroke-width="1"/>
  
  <!-- Content Focus Area -->
  <rect x="50" y="80" width="300" height="400" fill="none" stroke="#e9ecef" stroke-width="1" rx="4"/>
  
  <!-- Title -->
  <text x="200" y="110" font-family="Arial, sans-serif" font-size="18" fill="#212529" text-anchor="middle">Main Title</text>
  
  <!-- Content Blocks -->
  <rect x="70" y="130" width="260" height="60" fill="none" stroke="#dee2e6" stroke-width="1" rx="2"/>
  <text x="200" y="150" font-family="Arial, sans-serif" font-size="12" fill="#6c757d" text-anchor="middle">Content Section 1</text>
  <text x="200" y="165" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd" text-anchor="middle">Description or content preview</text>
  
  <rect x="70" y="200" width="260" height="60" fill="none" stroke="#dee2e6" stroke-width="1" rx="2"/>
  <text x="200" y="220" font-family="Arial, sans-serif" font-size="12" fill="#6c757d" text-anchor="middle">Content Section 2</text>
  <text x="200" y="235" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd" text-anchor="middle">Description or content preview</text>
  
  <rect x="70" y="270" width="260" height="60" fill="none" stroke="#dee2e6" stroke-width="1" rx="2"/>
  <text x="200" y="290" font-family="Arial, sans-serif" font-size="12" fill="#6c757d" text-anchor="middle">Content Section 3</text>
  <text x="200" y="305" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd" text-anchor="middle">Description or content preview</text>
  
  <!-- Simple CTA -->
  <rect x="170" y="380" width="60" height="30" fill="none" stroke="#495057" stroke-width="1" rx="4"/>
  <text x="200" y="398" font-family="Arial, sans-serif" font-size="10" fill="#495057" text-anchor="middle">Action</text>
  
  <!-- Minimal Footer -->
  <line x1="50" y1="520" x2="350" y2="520" stroke="#dee2e6" stroke-width="1"/>
  <text x="200" y="545" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd" text-anchor="middle">Simple footer</text>
</svg>`;
    }

    /**
     * Generate content blocks based on project type
     */
    generateContentBlocks(projectType, startY, spacing) {
        const blocks = this.getProjectTypeComponents(projectType);
        let svg = '';
        
        blocks.forEach((block, index) => {
            const y = startY + (index * spacing);
            svg += `<rect x="20" y="${y}" width="100" height="25" fill="none" stroke="#6c757d" stroke-width="1" rx="2"/>
                    <text x="70" y="${y + 15}" font-family="Arial, sans-serif" font-size="9" fill="#6c757d" text-anchor="middle">${block}</text>`;
        });
        
        return svg;
    }

    /**
     * Generate grid items based on project type
     */
    generateGridItems(projectType, startY) {
        const items = this.getProjectTypeComponents(projectType);
        let svg = '';
        
        items.slice(0, 3).forEach((item, index) => {
            const x = 10 + (index * 130);
            svg += `<rect x="${x}" y="${startY}" width="120" height="80" fill="none" stroke="#6c757d" stroke-width="1" rx="4"/>
                    <text x="${x + 60}" y="${startY + 20}" font-family="Arial, sans-serif" font-size="10" fill="#6c757d" text-anchor="middle">${item}</text>`;
        });
        
        return svg;
    }

    /**
     * Get project type specific components
     */
    getProjectTypeComponents(projectType) {
        const components = {
            website: ['About', 'Services', 'Contact', 'Features', 'Testimonials'],
            ecommerce: ['Products', 'Categories', 'Cart', 'Account', 'Reviews'],
            portfolio: ['Projects', 'About', 'Skills', 'Contact', 'Gallery'],
            blog: ['Recent Posts', 'Categories', 'Tags', 'About', 'Archive'],
            dashboard: ['Analytics', 'Reports', 'Settings', 'Users', 'Data'],
            saas: ['Features', 'Pricing', 'Login', 'Dashboard', 'Support']
        };
        
        return components[projectType] || components.website;
    }

    /**
     * Generate HTML wireframe with wired-elements styling
     */
    generateCleanLayoutHTML(projectType) {
        const components = this.getProjectTypeComponents(projectType);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clean Layout Wireframe</title>
    <style>
        body {
            font-family: 'Kalam', cursive;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
            color: #495057;
        }
        .wireframe-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border: 3px solid #495057;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            padding: 20px;
            border-bottom: 2px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .hero {
            padding: 60px 20px;
            text-align: center;
            border-bottom: 2px solid #dee2e6;
            background: #f8f9fa;
        }
        .content {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            padding: 40px 20px;
        }
        .main-content {
            display: grid;
            gap: 20px;
        }
        .content-block {
            border: 2px solid #dee2e6;
            border-radius: 4px;
            padding: 20px;
            background: #f8f9fa;
        }
        .sidebar {
            border: 2px solid #dee2e6;
            border-radius: 4px;
            padding: 20px;
            background: #ffffff;
            height: fit-content;
        }
        .footer {
            padding: 20px;
            border-top: 2px solid #dee2e6;
            text-align: center;
            background: #f8f9fa;
        }
        .btn {
            border: 2px solid #007bff;
            background: none;
            color: #007bff;
            padding: 10px 20px;
            border-radius: 4px;
            font-family: inherit;
            cursor: pointer;
        }
        h1, h2, h3 { margin-top: 0; }
        .sketch-border { border-style: dashed; }
    </style>
</head>
<body>
    <div class="wireframe-container">
        <header class="header">
            <div>
                <h2>Logo</h2>
            </div>
            <nav>
                <span>Navigation Menu</span>
            </nav>
        </header>
        
        <section class="hero">
            <h1>Hero Section Title</h1>
            <p>Compelling subtitle or description text</p>
            <button class="btn">Primary CTA</button>
        </section>
        
        <section class="content">
            <main class="main-content">
                ${components.map(component => `
                    <div class="content-block">
                        <h3>${component}</h3>
                        <p>Content description and details for ${component.toLowerCase()} section.</p>
                    </div>
                `).join('')}
            </main>
            
            <aside class="sidebar">
                <h3>Sidebar</h3>
                <p>Additional information, links, or related content.</p>
            </aside>
        </section>
        
        <footer class="footer">
            <p>Footer information and links</p>
        </footer>
    </div>
</body>
</html>`;
    }

    /**
     * Generate Modern Layout HTML
     */
    generateModernLayoutHTML(projectType) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Grid Wireframe</title>
    <style>
        body {
            font-family: 'Kalam', cursive;
            margin: 0;
            padding: 20px;
            background: #ffffff;
            color: #495057;
        }
        .wireframe-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .nav {
            display: flex;
            align-items: center;
            padding: 20px;
            border: 3px solid #495057;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        .hero-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .hero-main {
            border: 3px solid #495057;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
        }
        .hero-secondary {
            border: 2px solid #6c757d;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
        }
        .content-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            border: 2px solid #495057;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            background: #f8f9fa;
        }
        .cta-section {
            border: 3px solid #28a745;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            background: #d4edda;
        }
        .btn {
            border: 2px solid #28a745;
            background: none;
            color: #28a745;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: inherit;
            font-weight: bold;
        }
        .logo { 
            width: 30px; 
            height: 30px; 
            border: 2px solid #007bff; 
            border-radius: 50%; 
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="wireframe-container">
        <nav class="nav">
            <div class="logo"></div>
            <h2>Brand Name</h2>
        </nav>
        
        <section class="hero-grid">
            <div class="hero-main">
                <h1>Featured Content</h1>
                <p>Main content area with primary focus</p>
            </div>
            <div class="hero-secondary">
                <h2>Secondary</h2>
                <p>Supporting content</p>
            </div>
        </section>
        
        <section class="content-grid">
            <div class="card">
                <h3>Feature 1</h3>
                <p>Description of key feature or service</p>
            </div>
            <div class="card">
                <h3>Feature 2</h3>
                <p>Description of key feature or service</p>
            </div>
            <div class="card">
                <h3>Feature 3</h3>
                <p>Description of key feature or service</p>
            </div>
        </section>
        
        <section class="cta-section">
            <h2>Ready to Get Started?</h2>
            <p>Compelling call-to-action message</p>
            <button class="btn">Take Action Now</button>
        </section>
    </div>
</body>
</html>`;
    }

    /**
     * Generate Minimal Layout HTML
     */
    generateMinimalLayoutHTML(projectType) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minimal Focus Wireframe</title>
    <style>
        body {
            font-family: 'Kalam', cursive;
            margin: 0;
            padding: 40px;
            background: #ffffff;
            color: #212529;
            line-height: 1.6;
        }
        .wireframe-container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }
        .content {
            max-width: 600px;
            margin: 0 auto;
        }
        .content-section {
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 30px;
            margin-bottom: 20px;
            background: #f8f9fa;
        }
        .cta {
            text-align: center;
            margin: 40px 0;
        }
        .btn {
            border: 1px solid #495057;
            background: none;
            color: #495057;
            padding: 12px 24px;
            border-radius: 4px;
            font-family: inherit;
        }
        .footer {
            text-align: center;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
            margin-top: 60px;
            color: #6c757d;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        h2 { font-size: 1.5em; margin-bottom: 15px; }
        h3 { font-size: 1.2em; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="wireframe-container">
        <header class="header">
            <h1>Brand</h1>
        </header>
        
        <main class="content">
            <h2>Main Content Title</h2>
            
            <div class="content-section">
                <h3>Section One</h3>
                <p>Clean, focused content without distractions. This minimal layout emphasizes readability and content consumption.</p>
            </div>
            
            <div class="content-section">
                <h3>Section Two</h3>
                <p>Continued content with consistent spacing and typography. Perfect for blogs, articles, or content-focused sites.</p>
            </div>
            
            <div class="content-section">
                <h3>Section Three</h3>
                <p>Additional content section maintaining the clean, minimal aesthetic throughout the page.</p>
            </div>
            
            <div class="cta">
                <button class="btn">Simple Action</button>
            </div>
        </main>
        
        <footer class="footer">
            <p>Minimal footer information</p>
        </footer>
    </div>
</body>
</html>`;
    }

    /**
     * Save wireframes to project directory
     */
    async saveWireframes(projectId, wireframeData) {
        try {
            const projectDir = path.join(this.projectsDir, projectId);
            await this.ensureDirectoryExists(projectDir);
            
            // Save wireframe data as JSON
            const wireframePath = path.join(projectDir, 'wireframes.json');
            await fs.writeFile(wireframePath, JSON.stringify(wireframeData, null, 2), 'utf8');
            
            // Save individual HTML files for each wireframe
            for (const wireframe of wireframeData.wireframes) {
                const htmlPath = path.join(projectDir, `wireframe-${wireframe.id}.html`);
                await fs.writeFile(htmlPath, wireframe.html, 'utf8');
            }
            
            this.logger.info('✅ Wireframes saved successfully', { 
                projectId, 
                wireframePath 
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to save wireframes', { 
                projectId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Load wireframes from project directory
     */
    async loadWireframes(projectId) {
        try {
            const wireframePath = path.join(this.projectsDir, projectId, 'wireframes.json');
            const wireframeContent = await fs.readFile(wireframePath, 'utf8');
            return JSON.parse(wireframeContent);
        } catch (error) {
            this.logger.error('❌ Failed to load wireframes', { projectId, error: error.message });
            throw error;
        }
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Get wireframe preview data for UI display
     */
    getWireframePreview(wireframes) {
        return wireframes.map(wireframe => ({
            id: wireframe.id,
            name: wireframe.name,
            style: wireframe.style,
            description: wireframe.description,
            features: wireframe.features,
            bestFor: wireframe.bestFor,
            svg: wireframe.svg,
            thumbnail: this.generateThumbnail(wireframe.svg)
        }));
    }

    /**
     * Generate thumbnail version of wireframe
     */
    generateThumbnail(svg) {
        // Return a smaller version of the SVG for thumbnail display
        return svg.replace('width="400" height="600"', 'width="200" height="300"')
                  .replace(/font-size="(\d+)"/g, (match, size) => `font-size="${Math.max(6, parseInt(size) * 0.7)}"`);
    }
}

module.exports = {
    WireframeGenerationService
};