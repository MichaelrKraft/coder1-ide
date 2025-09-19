import React, { useState, useEffect } from 'react';
import './Documentation.css';

interface DocumentationProps {
  onClose?: () => void;
}

interface FeatureDoc {
  id: string;
  title: string;
  icon: string;
  category: string;
  description: string;
  details: string[];
  usage: string;
  shortcut?: string;
  status?: 'active' | 'coming-soon' | 'experimental';
}

const FEATURES: FeatureDoc[] = [
  // AI Control Features
  {
    id: 'thinking-modes',
    title: 'Thinking Modes',
    icon: '🧠',
    category: 'AI Control',
    description: 'Control how deeply Claude thinks about your requests',
    details: [
      '⚡ Normal - Standard response speed (~5s)',
      '🤔 Think - More thoughtful responses (~15s)',
      '🧠 Think Hard - Deep analysis and reasoning (~30s)',
      '💭 Ultrathink - Maximum reasoning depth (~60s)'
    ],
    usage: 'Click the thinking mode button in the terminal header to cycle through modes. Higher modes use more tokens but provide more thorough analysis.',
    status: 'active'
  },
  {
    id: 'supervision',
    title: 'Supervision Mode',
    icon: '👁️',
    category: 'AI Control',
    description: 'AI asks for confirmation before making changes',
    details: [
      'Review all AI-suggested changes before applying',
      'Provides explanations for each modification',
      'Approve or reject changes individually',
      'Learn from AI decision-making process'
    ],
    usage: 'Enable Supervision when working on critical code or when you want to understand AI\'s reasoning.',
    status: 'active'
  },

  // Advanced Features
  {
    id: 'infinite-loop',
    title: 'Infinite Loop',
    icon: '♾️',
    category: 'Advanced Features',
    description: 'Continuous AI-driven development workflow',
    details: [
      'AI continuously improves code',
      'Automatic testing and refinement',
      'Iterative enhancement cycles',
      'Stop anytime with results preserved'
    ],
    usage: 'Start Infinite Loop for autonomous code improvement. AI will refactor, optimize, and enhance until you\'re satisfied.',
    status: 'experimental'
  },
  {
    id: 'parallel-agents',
    title: 'Parallel Agents',
    icon: '👥',
    category: 'Advanced Features',
    description: 'Multiple AI agents working simultaneously',
    details: [
      'Spawn multiple specialized agents',
      'Each focuses on different aspects',
      'Coordinate results automatically',
      'Faster completion of complex tasks'
    ],
    usage: 'Enable for large refactoring or when multiple files need different types of changes simultaneously.',
    status: 'active'
  },
  {
    id: 'hivemind',
    title: 'Hivemind Dashboard',
    icon: '🐝',
    category: 'Advanced Features',
    description: 'Coordinate multiple AI agents with specialized roles',
    details: [
      '👑 Queen Agent - Orchestrates and assigns tasks',
      '🏗️ Alpha Agent - Architecture and design decisions',
      '⚙️ Beta Agent - Implementation and coding',
      '🔍 Gamma Agent - Testing and analysis',
      'Real-time progress tracking',
      'Shared knowledge between agents'
    ],
    usage: 'Launch Hivemind for complex projects requiring multiple perspectives. Agents collaborate to deliver comprehensive solutions.',
    status: 'experimental'
  },

  // Session Management
  {
    id: 'github-deployment',
    title: 'GitHub Deployment Dashboard',
    icon: '🚀',
    category: 'Session Management',
    description: 'Deploy your projects directly to GitHub with educational guidance',
    details: [
      '📚 Learn Git fundamentals with interactive tutorials',
      '🎓 Beginner-friendly explanations for every Git operation',
      '✅ Safe deployment with pre-flight checks',
      '📊 Visual commit history and branch management',
      '🔄 One-click push to GitHub repositories',
      '📝 Automatic commit message generation',
      '🛡️ Protection against common Git mistakes'
    ],
    usage: 'Access the GitHub deployment dashboard to learn Git while deploying your code. Perfect for beginners with step-by-step guidance and educational tooltips.',
    status: 'active'
  },
  {
    id: 'checkpoint',
    title: 'Checkpoint',
    icon: '📸',
    category: 'Session Management',
    description: 'Save snapshots of your entire IDE state',
    details: [
      'Captures all open files and content',
      'Saves conversation history with AI',
      'Preserves UI configuration',
      'Includes git state and modifications',
      'Auto-checkpoint every 10 minutes'
    ],
    usage: 'Create checkpoints before major changes or experiments. Restore anytime if things go wrong.',
    shortcut: 'Cmd/Ctrl+Shift+S',
    status: 'active'
  },
  {
    id: 'timeline',
    title: 'Timeline',
    icon: '⏰',
    category: 'Session Management',
    description: 'Visual history of all your checkpoints',
    details: [
      'Interactive timeline visualization',
      'Compare different checkpoints',
      'One-click restore to any point',
      'Filter by tags and timestamps',
      'Export/import checkpoint sets'
    ],
    usage: 'Open Timeline to see your development journey. Perfect for tracking progress or recovering lost work.',
    shortcut: 'Cmd/Ctrl+Shift+T',
    status: 'active'
  },
  {
    id: 'claude-hooks',
    title: 'AI-Powered Claude Code Hooks',
    icon: '🤖',
    category: 'Advanced Features',
    description: 'Revolutionary AI-driven automation system that intelligently optimizes your development workflow',
    details: [
      '🧠 AI Project Analysis - Automatically analyzes codebase health and identifies optimization opportunities',
      '⚡ Smart Configuration Generation - AI selects and configures the perfect hooks for your project type',
      '📊 Performance Tracking & ROI - Measures hook effectiveness and development productivity gains',
      '🎯 Intelligent Recommendations - AI suggests new hooks based on coding patterns and project needs',
      '🔄 Self-Optimizing Workflows - Hooks automatically adapt and improve based on usage analytics',
      '🏗️ Architecture-Aware Setup - AI understands your tech stack and configures appropriate automation',
      '📈 Codebase Health Scoring - Real-time analysis of code quality, performance, and maintainability',
      '🚀 One-Click Optimization - Apply AI-recommended hook configurations instantly',
      '💡 Predictive Maintenance - AI predicts potential issues and suggests preventive hooks',
      '🎨 Custom Hook Generation - AI creates project-specific automation tailored to your workflow'
    ],
    usage: 'This revolutionary system transforms basic hooks into an intelligent development companion. AI analyzes your entire project, generates optimal configurations, and continuously improves your workflow. Access through the AI-powered dashboard for smart recommendations, performance analytics, and automated optimization.',
    status: 'active'
  }
];

const KEYBOARD_SHORTCUTS = [
  { keys: 'Cmd/Ctrl+Shift+S', action: 'Create checkpoint' },
  { keys: 'Cmd/Ctrl+Shift+R', action: 'Restore last checkpoint' },
  { keys: 'Cmd/Ctrl+Shift+T', action: 'Open timeline' },
  { keys: 'Cmd/Ctrl+Shift+V', action: 'Toggle voice mode' },
  { keys: 'Cmd/Ctrl+Shift+H', action: 'Toggle Hivemind' },
  { keys: 'F1', action: 'Open documentation' },
  { keys: 'Cmd/Ctrl+K', action: 'Clear terminal' },
  { keys: 'Cmd/Ctrl+/', action: 'Toggle comment' },
  { keys: 'Esc', action: 'Close dialogs' }
];

const Documentation: React.FC<DocumentationProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const categories = ['all', ...Array.from(new Set(FEATURES.map(f => f.category)))];

  const filteredFeatures = FEATURES.filter(feature => {
    const matchesSearch = searchQuery === '' || 
      feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.details.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
      if (e.key === 'F1') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <span className="status-badge active">Active</span>;
      case 'experimental':
        return <span className="status-badge experimental">Experimental</span>;
      case 'coming-soon':
        return <span className="status-badge coming-soon">Coming Soon</span>;
      default:
        return null;
    }
  };

  return (
    <div className="documentation-container">
      <div className="documentation-header">
        <button 
          className="back-to-ide-button"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
            e.currentTarget.style.transform = 'translateY(-50%) translateX(-2px)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
            e.currentTarget.style.transform = 'translateY(-50%) translateX(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ← Back to IDE
        </button>
        <div className="header-content">
          <h1>
            <span className="header-icon">📚</span>
            Coder1 Features
          </h1>
          <p className="header-subtitle">
            Master the power of AI-enhanced development
          </p>
        </div>
        {onClose && (
          <button className="close-button" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        )}
      </div>

      <div className="documentation-controls">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category}
              className={`category-button ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="documentation-content">
        <div className="features-grid">
          {filteredFeatures.map(feature => (
            <div 
              key={feature.id} 
              className={`feature-card ${selectedFeature === feature.id ? 'expanded' : ''}`}
              onClick={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
            >
              <div className="feature-header">
                <div className="feature-title-row">
                  <span className="feature-icon">{feature.icon}</span>
                  <h3 className="feature-title">{feature.title}</h3>
                </div>
                {getStatusBadge(feature.status)}
              </div>
              
              <p className="feature-description">{feature.description}</p>
              
              {selectedFeature === feature.id && (
                <div className="feature-details">
                  <div className="details-section">
                    <h4>Features</h4>
                    <ul className="details-list">
                      {feature.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="usage-section">
                    <h4>How to Use</h4>
                    <p>{feature.usage}</p>
                  </div>
                  
                  {feature.shortcut && (
                    <div className="shortcut-section">
                      <h4>Keyboard Shortcut</h4>
                      <kbd className="shortcut-key">{feature.shortcut}</kbd>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="shortcuts-section">
          <h2>
            <span className="section-icon">⌨️</span>
            Keyboard Shortcuts
          </h2>
          <div className="shortcuts-grid">
            {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
              <div key={idx} className="shortcut-item">
                <kbd className="shortcut-keys">{shortcut.keys}</kbd>
                <span className="shortcut-action">{shortcut.action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tips-section">
          <h2>
            <span className="section-icon">💡</span>
            Pro Tips
          </h2>
          <div className="tips-grid">
            <div className="tip-card">
              <h4>🎯 Start Simple</h4>
              <p>Begin with Normal thinking mode and increase as needed. Higher modes provide better results but take more time.</p>
            </div>
            <div className="tip-card">
              <h4>📸 Checkpoint Often</h4>
              <p>Create manual checkpoints before risky operations. Auto-checkpoints happen every 10 minutes.</p>
            </div>
            <div className="tip-card">
              <h4>🐝 Hivemind for Complex Tasks</h4>
              <p>Use Hivemind when you need multiple perspectives or are tackling architecture-level changes.</p>
            </div>
            <div className="tip-card">
              <h4>♾️ Infinite Loop Magic</h4>
              <p>Let AI continuously improve your code. Great for optimization, refactoring, and polish.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;