// Simplified app.js for deployment
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const EventEmitter = require('events');

// Global terminal emitter for real-time output
global.terminalEmitter = new EventEmitter();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Define static directory path
const staticPath = path.join(__dirname, '../static');
console.log('Static directory path:', staticPath);

// Main page - PRD Generator (must come BEFORE static files)
app.get('/', (req, res) => {
    const filePath = path.join(staticPath, 'product-creation-hub.html');
    console.log('Serving main page from:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving main page:', err);
            res.status(404).send('File not found');
        }
    });
});

// Product Creation Hub route
app.get('/product-creation', (req, res) => {
    const filePath = path.join(staticPath, 'product-creation-hub.html');
    console.log('Serving product creation from:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving product creation page:', err);
            res.status(404).send('File not found');
        }
    });
});

// Coder1 Platform homepage route
app.get('/platform', (req, res) => {
    const filePath = path.join(staticPath, 'homepage.html');
    console.log('Serving Coder1 platform page from:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving platform page:', err);
            res.status(404).send('Platform page not found');
        }
    });
});

// Serve IDE static assets first (for CSS, JS files)
app.use('/ide/static', express.static(path.join(__dirname, '../ide-build/static')));

// Test route for debugging
app.get('/ide/test', (req, res) => {
    const filePath = path.join(__dirname, '../ide-build', 'test.html');
    console.log('Serving IDE test from:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving IDE test page:', err);
            res.status(404).send('IDE test not found');
        }
    });
});

// Coder1 IDE route - serve the built React app
app.get('/ide', (req, res) => {
    const filePath = path.join(__dirname, '../ide-build', 'index.html');
    console.log('Serving IDE from:', filePath);
    
    // Add cache-busting headers
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving IDE page:', err);
            res.status(404).send('IDE interface not found');
        }
    });
});

// Alternative IDE routes
app.get('/coder1-ide', (req, res) => {
    res.redirect('/ide');
});

// IDE Beta route - serves the same IDE build
app.get('/ide-beta', (req, res) => {
    const filePath = path.join(__dirname, '../ide-build', 'index.html');
    console.log('Serving IDE Beta from:', filePath);
    
    // Add cache-busting headers
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving IDE Beta page:', err);
            res.status(404).send('IDE Beta interface not found');
        }
    });
});

// Serve static files from static directory (comes AFTER custom routes)
app.use(express.static(staticPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Coder1 Platform is running!',
    timestamp: new Date().toISOString()
  });
});

// Basic API endpoint for PRD generation
app.post('/api/generate-prd', (req, res) => {
  const { projectId, originalRequest, questions, answers, sessionId } = req.body;
  
  // Generate a comprehensive PRD based on the questions and answers
  const prdContent = generatePRDContent(originalRequest, questions, answers);
  
  res.json({
    success: true,
    prdDocument: {
      id: `prd-${projectId}`,
      title: `Product Requirements Document - ${originalRequest.substring(0, 50)}`,
      content: prdContent,
      metadata: {
        confidence: 85,
        completeness: 100,
        generatedAt: new Date().toISOString(),
        sessionId: sessionId
      },
      sections: [
        'Executive Summary',
        'Project Overview',
        'Target Audience',
        'Core Features',
        'Technical Requirements',
        'Design Requirements',
        'Timeline & Budget',
        'Success Metrics'
      ]
    }
  });
});

// Helper function to generate PRD content
function generatePRDContent(originalRequest, questions, answers) {
  let content = `# Product Requirements Document\n\n`;
  content += `## Executive Summary\n${originalRequest}\n\n`;
  
  content += `## Requirements Analysis\n\n`;
  
  // Map questions and answers to PRD sections
  if (questions && answers) {
    questions.forEach((q, index) => {
      if (answers[index]) {
        content += `### ${q.question}\n`;
        content += `${answers[index].answer}\n\n`;
      }
    });
  }
  
  content += `## Next Steps\n`;
  content += `1. Review and refine requirements\n`;
  content += `2. Create detailed technical specifications\n`;
  content += `3. Design wireframes and mockups\n`;
  content += `4. Begin development planning\n`;
  
  return content;
}

// API endpoint for available personas
app.get('/api/personas/available', (req, res) => {
  res.json({
    success: true,
    personas: [
      {
        id: 'ux-designer',
        name: 'UX Designer',
        color: '#8B5CF6',
        iconClass: 'fas fa-paint-brush',
        expertise: ['User Experience', 'Visual Design', 'Prototyping', 'User Research']
      },
      {
        id: 'backend-engineer',
        name: 'Backend Engineer',
        color: '#3B82F6',
        iconClass: 'fas fa-server',
        expertise: ['API Design', 'Database Architecture', 'Scalability', 'Security']
      },
      {
        id: 'frontend-developer',
        name: 'Frontend Developer',
        color: '#10B981',
        iconClass: 'fas fa-code',
        expertise: ['React/Vue/Angular', 'Responsive Design', 'Performance', 'Accessibility']
      },
      {
        id: 'product-manager',
        name: 'Product Manager',
        color: '#F59E0B',
        iconClass: 'fas fa-chart-line',
        expertise: ['Market Analysis', 'User Stories', 'Roadmapping', 'Metrics']
      },
      {
        id: 'security-expert',
        name: 'Security Expert',
        color: '#EF4444',
        iconClass: 'fas fa-shield-alt',
        expertise: ['Threat Modeling', 'Compliance', 'Encryption', 'Best Practices']
      },
      {
        id: 'devops-engineer',
        name: 'DevOps Engineer',
        color: '#6366F1',
        iconClass: 'fas fa-cogs',
        expertise: ['CI/CD', 'Infrastructure', 'Monitoring', 'Deployment']
      }
    ]
  });
});

// API endpoint for persona consultation
app.post('/api/consultation/analyze', (req, res) => {
  const { projectId, personas, prdDocument } = req.body;
  
  // Simulate consultation analysis
  const consultationResults = {
    success: true,
    analysis: {
      consensusLevel: 85,
      successProbability: 78,
      criticalFindings: 3,
      agreements: [
        'Focus on user-centric design approach',
        'Implement robust security measures from the start',
        'Use agile development methodology'
      ],
      conflicts: [
        'Timeline expectations vs. feature complexity',
        'Performance requirements vs. budget constraints'
      ],
      recommendations: {
        immediate: [
          'Define MVP scope clearly',
          'Set up development environment',
          'Create user personas and journey maps'
        ],
        shortTerm: [
          'Develop proof of concept',
          'Conduct user testing',
          'Establish monitoring systems'
        ],
        longTerm: [
          'Plan for scalability',
          'Consider international expansion',
          'Build team expertise'
        ]
      }
    }
  };
  
  res.json(consultationResults);
});

// API endpoint for wireframe generation
app.post('/api/wireframes/generate', (req, res) => {
  const { projectId, prdDocument } = req.body;
  
  // Simulate wireframe generation
  res.json({
    success: true,
    wireframes: {
      wireframes: [
        {
          name: 'Homepage',
          htmlFile: '/wireframes/homepage.html',
          htmlContent: '<div style="padding: 20px; border: 1px solid #ddd;"><h1>Homepage Wireframe</h1><p>Navigation, Hero Section, Features, Footer</p></div>'
        },
        {
          name: 'Dashboard',
          htmlFile: '/wireframes/dashboard.html',
          htmlContent: '<div style="padding: 20px; border: 1px solid #ddd;"><h1>Dashboard Wireframe</h1><p>Sidebar, Main Content Area, Stats Cards</p></div>'
        },
        {
          name: 'User Profile',
          htmlFile: '/wireframes/profile.html',
          htmlContent: '<div style="padding: 20px; border: 1px solid #ddd;"><h1>User Profile Wireframe</h1><p>Avatar, User Info, Settings, Activity</p></div>'
        }
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        totalPages: 3
      }
    }
  });
});

// API endpoint for version management
app.get('/api/versions/:projectId', (req, res) => {
  const { projectId } = req.params;
  
  res.json({
    success: true,
    versions: [
      {
        id: 'v1.0',
        name: 'Initial Version',
        createdAt: new Date().toISOString(),
        description: 'First complete PRD with all requirements'
      }
    ]
  });
});

// API endpoint for project export
app.post('/api/project/export', (req, res) => {
  const { projectId, format } = req.body;
  
  res.json({
    success: true,
    exportData: {
      format: format || 'json',
      downloadUrl: `/downloads/project-${projectId}.${format || 'json'}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    }
  });
});

// Import and use infinite loop routes (using simple version to avoid dependency issues)
try {
  // Try simple version first (no external dependencies)
  const infiniteLoopRoutes = require('./routes/infinite-loop-simple');
  app.use('/api/infinite', infiniteLoopRoutes);
  console.log('✅ Infinite loop routes loaded successfully (simple mode)');
} catch (error) {
  console.error('❌ Failed to load infinite loop routes:');
  console.error('  Error:', error.message);
  console.error('  Stack:', error.stack);
  
  // Try loading the original version as fallback
  try {
    const infiniteLoopRoutes = require('./routes/infinite-loop');
    app.use('/api/infinite', infiniteLoopRoutes);
    console.log('✅ Infinite loop routes loaded (original version)');
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError.message);
  }
}

// Import and use hivemind routes
try {
  const hivemindRoutes = require('./routes/hivemind');
  app.use('/api/hivemind', hivemindRoutes);
  console.log('✅ Hivemind routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load hivemind routes:');
  console.error('  Error:', error.message);
  console.error('  Stack:', error.stack);
}

// Import and use parallel agents routes
try {
  const parallelAgentsRoutes = require('./routes/parallel-agents');
  app.use('/api/parallel-agents', parallelAgentsRoutes);
  console.log('✅ Parallel agents routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load parallel agents routes:');
  console.error('  Error:', error.message);
  console.error('  Stack:', error.stack);
}

// Import and use other API routes if available
try {
  const productCreationRoutes = require('./routes/product-creation-api');
  app.use('/api', productCreationRoutes);
  console.log('✅ Product creation routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Failed to load product creation routes:', error.message);
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export the app for server.js
module.exports = app;