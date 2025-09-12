'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface InteractiveTourProps {
  onClose: () => void;
  onStepChange?: (stepId: string) => void;
  onTourComplete?: () => void;
}

interface SubStep {
  target: string;
  title: string;
  content: string;
  action?: string;
  tooltipPosition?: 'center-monaco' | 'right-terminal' | 'center-terminal';
  borderColor?: 'turquoise' | 'orange';
}

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position?: 'center' | 'auto' | 'middle-top' | 'center-monaco' | 'right-terminal' | 'center-terminal';
  highlightColor?: 'turquoise' | 'orange';
  hasSubSteps?: boolean;
  subSteps?: SubStep[];
  keepHero?: boolean;
  addCode?: boolean;
  openMenu?: boolean;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome-overview',
    title: 'Welcome to Coder1 IDE',
    content: 'This is your AI-powered development environment. The entire interface is designed to help you code faster with AI assistance.',
    target: 'ide-interface', // Target the entire IDE interface
    position: 'center',
    highlightColor: 'turquoise',
    keepHero: true // Hero section stays visible
  },
  {
    id: 'prd-generator',
    title: 'Smart PRD Generator',
    content: 'Click this button to automate your PRD documentation. It uses AI to create comprehensive product requirement documents.',
    target: 'prd-generator-button',
    position: 'auto',
    highlightColor: 'turquoise', // BLUE border, not orange
    keepHero: true // Hero section stays visible
  },
  {
    id: 'file-explorer',
    title: 'File Explorer',
    content: 'Navigate your project files, sessions, and memory. Everything is organized in tabs for easy access.',
    target: 'file-explorer',
    position: 'middle-top', // Move to middle-top
    highlightColor: 'turquoise'
  },
  {
    id: 'code-editor',
    title: 'Monaco Code Editor',
    content: 'Full-featured code editor with syntax highlighting, IntelliSense, and all VS Code features you love.',
    target: 'monaco-editor',
    position: 'center',
    highlightColor: 'turquoise',
    addCode: true // Will trigger code addition
  },
  {
    id: 'terminal-features',
    title: 'AI-Powered Terminal',
    content: 'Your terminal includes voice input and AI supervision. Let me show you the key features.',
    target: 'terminal',
    position: 'auto',
    highlightColor: 'turquoise',
    hasSubSteps: true,
    subSteps: [
      { 
        target: 'voice-input-button', 
        title: 'Voice Input',
        content: 'Click the microphone to use text-to-speech. Speak your commands and watch them execute.',
        tooltipPosition: 'center-monaco',
        borderColor: 'orange'
      },
      { 
        target: 'terminal-settings-button', 
        title: 'Terminal Settings',
        content: 'Configure your terminal preferences, themes, and behavior.',
        action: 'openTerminalSettings',
        tooltipPosition: 'center-monaco',
        borderColor: 'orange'
      },
      { 
        target: 'supervision-button', 
        title: 'AI Supervision',
        content: 'Enable AI supervision for intelligent command suggestions and error prevention.',
        action: 'highlightSupervision',
        tooltipPosition: 'right-terminal',
        borderColor: 'orange'
      }
    ]
  },
  {
    id: 'status-bar-features',
    title: 'Status Bar Tools',
    content: 'Save checkpoints, view timeline, and generate session summaries for perfect handoffs.',
    target: 'status-bar',
    position: 'center-terminal',
    highlightColor: 'turquoise',
    hasSubSteps: true,
    subSteps: [
      { 
        target: 'checkpoint-timeline', 
        title: 'Checkpoint',
        content: 'Save your work at any point to create a restorable checkpoint.',
        tooltipPosition: 'center-terminal',
        borderColor: 'orange'
      },
      { 
        target: 'timeline-button', 
        title: 'Timeline',
        content: 'View the complete history of your development session.',
        tooltipPosition: 'center-terminal',
        borderColor: 'orange'
      },
      { 
        target: 'session-summary', 
        title: 'Session Summary',
        content: 'Generate AI-powered summaries of your coding session for documentation.',
        tooltipPosition: 'center-terminal',
        borderColor: 'orange'
      },
      { 
        target: 'memory-button', 
        title: 'Memory (Core Feature)',
        content: 'Access your AI memory - the core feature that remembers your coding patterns, preferences, and project context across sessions.',
        tooltipPosition: 'center-terminal',
        borderColor: 'orange'
      },
      { 
        target: 'docs-button', 
        title: 'Documentation',
        content: 'Access comprehensive documentation, guides, and API references to help with your development.',
        tooltipPosition: 'center-terminal',
        borderColor: 'orange'
      }
    ]
  },
  {
    id: 'discover-menu',
    title: 'Discover Commands',
    content: 'Access powerful slash commands that enhance your workflow. Type / to see available commands like /build, /test, /deploy and more.',
    target: 'discover-button',
    position: 'center-terminal', // Center in terminal area
    highlightColor: 'orange', // Orange glow for Discover button like other buttons
    openMenu: true // Will trigger menu opening
  }
];

// Sample creative code for Step 4
const CREATIVE_CODE = `// Welcome to Coder1 IDE! 🚀
import { AIAssistant } from '@coder1/ai';
import { createMagic } from './utils/magic';

// Your AI assistant is ready to help
const assistant = new AIAssistant({
  model: 'claude-3',
  mode: 'collaborative',
  vibeLevel: 'maximum'
});

// Build amazing things with AI assistance
async function buildSomethingAmazing() {
  const idea = await assistant.brainstorm('innovative web app');
  const code = await assistant.implement(idea);
  
  // Deploy with confidence
  return createMagic(code);
}

// Start your journey
buildSomethingAmazing().then(result => {
  console.log('✨ Magic created:', result);
});`;

export default function InteractiveTour({ onClose, onStepChange, onTourComplete }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [subHighlightRect, setSubHighlightRect] = useState<DOMRect | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiscoverMenuOpen, setIsDiscoverMenuOpen] = useState(false);

  const currentStepData = tourSteps[currentStep];
  const isOnSubStep = currentStepData.hasSubSteps && currentSubStep > 0;
  const currentSubStepData = isOnSubStep ? currentStepData.subSteps?.[currentSubStep - 1] : null;

  // Add creative code to Monaco editor when on Step 4
  useEffect(() => {
    if (currentStepData.addCode && currentStepData.id === 'code-editor') {
      // Direct manipulation of Monaco editor content for the tour
      const monacoContainer = document.querySelector('[data-tour="monaco-editor"]');
      if (monacoContainer) {
        // Remove any placeholder content
        const placeholder = monacoContainer.querySelector('.flex.items-center.justify-center');
        if (placeholder) {
          placeholder.remove();
        }
        
        // Create a code display if Monaco isn't loaded with Tokyo Night theme
        if (!monacoContainer.querySelector('.monaco-editor')) {
          const codeDisplay = document.createElement('div');
          codeDisplay.className = 'p-4 text-sm font-mono bg-[#1a1b26] overflow-auto h-full';
          codeDisplay.style.whiteSpace = 'pre';
          
          // Apply Tokyo Night syntax highlighting manually
          const coloredCode = CREATIVE_CODE
            .replace(/(\/\/.*$)/gm, '<span style="color: #565f89">$1</span>') // Comments
            .replace(/(import|from|export|const|async|function|await|return|new|if|then)/g, '<span style="color: #bb9af7">$1</span>') // Keywords
            .replace(/('.*?'|".*?")/g, '<span style="color: #9ece6a">$1</span>') // Strings
            .replace(/(AIAssistant|createMagic)/g, '<span style="color: #7aa2f7">$1</span>') // Classes/Functions
            .replace(/(model:|mode:|vibeLevel:)/g, '<span style="color: #73daca">$1</span>') // Object keys
            .replace(/(console\.log)/g, '<span style="color: #7aa2f7">$1</span>'); // Console
          
          codeDisplay.innerHTML = `<pre style="margin: 0; color: #a9b1d6;">${coloredCode}</pre>`;
          monacoContainer.innerHTML = '';
          monacoContainer.appendChild(codeDisplay);
        }
      }
      
      // Also dispatch event in case Monaco is listening
      window.dispatchEvent(new CustomEvent('tour:addCode', { 
        detail: { code: CREATIVE_CODE } 
      }));
    }
  }, [currentStepData.addCode, currentStepData.id]);

  // Open Discover menu when on Step 7
  useEffect(() => {
    if (currentStepData.openMenu && currentStepData.id === 'discover-menu') {
      // First highlight the button
      setTimeout(() => {
        // Then open the menu
        window.dispatchEvent(new Event('tour:openDiscoverMenu'));
        setIsDiscoverMenuOpen(true);
        
        // Enhanced Discover menu content injection with better timing and selectors
        setTimeout(() => {
          console.log(`[InteractiveTour] 🔍 Looking for Discover menu to inject content...`);
          
          // Enhanced selector strategies for finding the menu
          const discoveryStrategies = [
            // Direct data-tour attribute
            () => document.querySelector('[data-tour="discover-menu"]'),
            // Common dropdown/menu patterns
            () => document.querySelector('.discover-panel'),
            () => document.querySelector('[class*="discover"]'),
            () => document.querySelector('[id*="discover"]'),
            // Generic dropdown patterns
            () => document.querySelector('.dropdown-menu:last-child'),
            () => document.querySelector('[class*="dropdown"]:last-child'),
            () => document.querySelector('[class*="menu"]:last-child'),
            // Find by positioning - look for recently appeared elements
            () => {
              const allDropdowns = document.querySelectorAll('[class*="dropdown"], [class*="menu"], [class*="panel"]');
              for (let i = allDropdowns.length - 1; i >= 0; i--) {
                const el = allDropdowns[i] as HTMLElement;
                if (el.offsetHeight > 0 && el.offsetWidth > 0 && 
                    el.getBoundingClientRect().top > 100) { // Not too close to top
                  return el;
                }
              }
              return null;
            }
          ];
          
          let discoverPanel = null;
          let strategyUsed = '';
          
          // Try each strategy
          for (let i = 0; i < discoveryStrategies.length; i++) {
            try {
              discoverPanel = discoveryStrategies[i]();
              if (discoverPanel) {
                strategyUsed = `Strategy ${i + 1}`;
                console.log(`[InteractiveTour] ✓ Found discover panel using ${strategyUsed}:`, discoverPanel);
                break;
              }
            } catch (e) {
              console.log(`[InteractiveTour] Strategy ${i + 1} failed:`, e);
            }
          }
          
          if (discoverPanel) {
            // Add data-tour attribute for highlighting if not present
            if (!discoverPanel.getAttribute('data-tour')) {
              discoverPanel.setAttribute('data-tour', 'discover-menu');
            }
            
            console.log(`[InteractiveTour] 📝 Injecting content into discover panel (${strategyUsed})`);
            
            // Clear existing content and inject our enhanced content
            discoverPanel.innerHTML = '';
            
            const mockContent = document.createElement('div');
            mockContent.className = 'p-6 text-sm bg-gray-900 border border-gray-600 rounded-lg min-w-[300px]';
            mockContent.innerHTML = `
              <div class="space-y-4">
                <div class="flex items-center gap-2 border-b border-gray-700 pb-3">
                  <span class="text-2xl">🔍</span>
                  <h3 class="text-cyan-400 font-bold text-lg">Discover Commands</h3>
                </div>
                <div class="space-y-3">
                  <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                    <span class="text-orange-400 font-mono text-base font-bold">/build</span>
                    <span class="text-gray-200">Build your project with AI assistance</span>
                  </div>
                  <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                    <span class="text-orange-400 font-mono text-base font-bold">/test</span>
                    <span class="text-gray-200">Run comprehensive test suite</span>
                  </div>
                  <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                    <span class="text-orange-400 font-mono text-base font-bold">/deploy</span>
                    <span class="text-gray-200">Deploy to production environment</span>
                  </div>
                  <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                    <span class="text-orange-400 font-mono text-base font-bold">/analyze</span>
                    <span class="text-gray-200">AI-powered codebase analysis</span>
                  </div>
                  <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                    <span class="text-orange-400 font-mono text-base font-bold">/refactor</span>
                    <span class="text-gray-200">Intelligent code refactoring</span>
                  </div>
                </div>
                <div class="mt-4 p-3 bg-gray-800 rounded-lg">
                  <div class="text-xs text-gray-400 text-center">
                    💡 Type <span class="text-cyan-400 font-mono">/</span> in terminal to see all commands
                  </div>
                </div>
              </div>
            `;
            
            discoverPanel.appendChild(mockContent);
            console.log(`[InteractiveTour] ✅ Successfully injected enhanced discover menu content`);
            
            // Force visibility and proper styling
            discoverPanel.style.display = 'block';
            discoverPanel.style.visibility = 'visible';
            discoverPanel.style.opacity = '1';
            
            // Trigger re-highlighting
            setTimeout(() => {
              const event = new CustomEvent('tour:discover-menu-ready');
              window.dispatchEvent(event);
            }, 100);
            
          } else {
            console.error(`[InteractiveTour] 🚨 Could not find discover panel with any strategy`);
            console.log(`[InteractiveTour] Available elements:`, {
              dropdowns: document.querySelectorAll('[class*="dropdown"]').length,
              menus: document.querySelectorAll('[class*="menu"]').length,
              panels: document.querySelectorAll('[class*="panel"]').length,
              dataTour: Array.from(document.querySelectorAll('[data-tour]')).map(el => el.getAttribute('data-tour'))
            });
          }
        }, 300);
      }, 500);
    }
  }, [currentStepData.openMenu, currentStepData.id]);

  // Execute step actions
  const executeStepAction = useCallback((action?: string) => {
    if (!action) return;

    switch(action) {
      case 'openTerminalSettings':
        window.dispatchEvent(new Event('tour:openTerminalSettings'));
        setIsSettingsOpen(true);
        break;
        
      case 'highlightSupervision':
        if (!isSettingsOpen) {
          window.dispatchEvent(new Event('tour:openTerminalSettings'));
          setIsSettingsOpen(true);
        }
        break;
    }
  }, [isSettingsOpen]);

  // Handle step changes
  const handleNext = () => {
    console.log(`[InteractiveTour] handleNext called - Current: Step ${currentStep + 1}, SubStep: ${currentSubStep}`);
    
    // If we have sub-steps and haven't shown them all
    if (currentStepData.hasSubSteps && currentStepData.subSteps) {
      if (currentSubStep < currentStepData.subSteps.length) {
        const nextSubStep = currentSubStep + 1;
        console.log(`[InteractiveTour] Moving to sub-step ${nextSubStep} of step ${currentStep + 1}`);
        setCurrentSubStep(nextSubStep);
        
        // Execute sub-step action if it exists
        const subStep = currentStepData.subSteps[nextSubStep - 1];
        if (subStep?.action) {
          setTimeout(() => executeStepAction(subStep.action), 100);
        }
        return;
      }
    }

    // Close settings if open when moving to next main step
    if (isSettingsOpen) {
      window.dispatchEvent(new Event('tour:closeTerminalSettings'));
      setIsSettingsOpen(false);
    }

    // Close Discover menu if open
    if (isDiscoverMenuOpen) {
      window.dispatchEvent(new Event('tour:closeDiscoverMenu'));
      setIsDiscoverMenuOpen(false);
    }

    // Move to next main step
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      const nextStepData = tourSteps[nextStep];
      console.log(`[InteractiveTour] 🚀 Moving from Step ${currentStep + 1} (${currentStepData.id}) to Step ${nextStep + 1} (${nextStepData.id})`);
      console.log(`[InteractiveTour] Next step target: "${nextStepData.target}", keepHero: ${nextStepData.keepHero}`);
      
      setCurrentStep(nextStep);
      setCurrentSubStep(0);
      onStepChange?.(tourSteps[nextStep].id);
    } else {
      console.log(`[InteractiveTour] Tour completed, cleaning up and closing`);
      // Call tour completion callback to clean up editor
      if (onTourComplete) {
        onTourComplete();
      }
      onClose();
    }
  };

  const handlePrevious = () => {
    // If we're on a sub-step, go back through sub-steps first
    if (currentSubStep > 0) {
      setCurrentSubStep(currentSubStep - 1);
      
      // Close settings if we're leaving the settings/supervision steps
      if (currentSubStep === 3 && isSettingsOpen) {
        window.dispatchEvent(new Event('tour:closeTerminalSettings'));
        setIsSettingsOpen(false);
      }
      return;
    }

    // Otherwise go to previous main step
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // If previous step has sub-steps, go to the last sub-step
      if (tourSteps[prevStep].hasSubSteps && tourSteps[prevStep].subSteps) {
        setCurrentSubStep(tourSteps[prevStep].subSteps!.length);
      } else {
        setCurrentSubStep(0);
      }
      
      onStepChange?.(tourSteps[prevStep].id);
    }
  };

  // Update highlight rectangles
  useEffect(() => {
    const updateHighlights = () => {
      // Enhanced debugging for Step 2 (PRD generator)
      if (currentStepData.id === 'prd-generator') {
        console.log(`[InteractiveTour] 🔍 STEP 2 DEBUG - PRD Generator Step`);
        const heroSection = document.querySelector('.hero-section');
        const heroContainer = document.querySelector('[data-tour="ide-interface"]');
        const prdButton = document.querySelector('[data-tour="prd-generator-button"]');
        
        console.log(`[InteractiveTour] Hero section exists:`, !!heroSection);
        console.log(`[InteractiveTour] Hero container exists:`, !!heroContainer);  
        console.log(`[InteractiveTour] PRD button exists:`, !!prdButton);
        
        if (heroSection) {
          console.log(`[InteractiveTour] Hero section display:`, (heroSection as HTMLElement).style.display || 'default');
          console.log(`[InteractiveTour] Hero section visibility:`, (heroSection as HTMLElement).style.visibility || 'default');
        }
      }
      
      // Main highlight - Add extensive logging for Step 2 debugging
      const targetSelector = `[data-tour="${currentStepData.target}"]`;
      console.log(`[InteractiveTour] Step ${currentStep + 1} (${currentStepData.id}): Looking for target "${targetSelector}"`);
      
      // Enhanced element finding with fallback selectors for Step 2
      let mainTarget = document.querySelector(targetSelector);
      
      // Special handling for PRD generator button with fallback selectors
      if (!mainTarget && currentStepData.id === 'prd-generator') {
        console.log(`[InteractiveTour] 🔍 PRD button not found with primary selector, trying fallbacks...`);
        const fallbackSelectors = [
          '[data-tour="prd-generator"]',
          '.prd-generator-button',  
          'button[class*="prd"]',
          '[class*="generator"]',
          'button:contains("PRD")',
          'button:contains("Generator")'
        ];
        
        for (const fallbackSelector of fallbackSelectors) {
          mainTarget = document.querySelector(fallbackSelector);
          if (mainTarget) {
            console.log(`[InteractiveTour] ✓ Found PRD button with fallback selector: ${fallbackSelector}`);
            break;
          }
        }
        
        // If still not found, log detailed DOM structure
        if (!mainTarget) {
          console.error(`[InteractiveTour] 🚨 CRITICAL: PRD generator button not found with any selector`);
          const heroContent = document.querySelector('.hero-section')?.innerHTML;
          console.log(`[InteractiveTour] Hero section content:`, heroContent?.substring(0, 500));
        }
      }
      
      if (mainTarget) {
        console.log(`[InteractiveTour] ✓ Found main target for step ${currentStep + 1}:`, mainTarget);
        const rect = mainTarget.getBoundingClientRect();
        console.log(`[InteractiveTour] Target position:`, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
        setHighlightRect(rect);
      } else {
        console.error(`[InteractiveTour] ✗ Could NOT find main target "${targetSelector}" for step ${currentStep + 1}`);
        // Log all available data-tour elements for debugging
        const allTourElements = document.querySelectorAll('[data-tour]');
        console.log(`[InteractiveTour] Available data-tour elements:`, Array.from(allTourElements).map(el => el.getAttribute('data-tour')));
        setHighlightRect(null);
      }

      // For Discover menu (Step 7), also highlight the menu if it's open
      if (currentStepData.id === 'discover-menu' && isDiscoverMenuOpen) {
        const menuTarget = document.querySelector('[data-tour="discover-menu"]');
        if (menuTarget) {
          console.log(`[InteractiveTour] ✓ Found discover menu target`);
          // Menu gets blue border
          setSubHighlightRect(menuTarget.getBoundingClientRect());
        } else {
          console.error(`[InteractiveTour] ✗ Could not find discover menu target`);
        }
      } else if (isOnSubStep && currentSubStepData) {
        // Sub-step highlight
        const subTargetSelector = `[data-tour="${currentSubStepData.target}"]`;
        console.log(`[InteractiveTour] Looking for sub-step target "${subTargetSelector}"`);
        const subTarget = document.querySelector(subTargetSelector);
        if (subTarget) {
          console.log(`[InteractiveTour] ✓ Found sub-step target`);
          setSubHighlightRect(subTarget.getBoundingClientRect());
        } else {
          console.error(`[InteractiveTour] ✗ Could not find sub-step target "${subTargetSelector}"`);
          setSubHighlightRect(null);
        }
      } else {
        setSubHighlightRect(null);
      }
    };

    updateHighlights();
    
    // Update on scroll/resize
    window.addEventListener('scroll', updateHighlights);
    window.addEventListener('resize', updateHighlights);
    
    // Update periodically to catch layout changes
    const interval = setInterval(updateHighlights, 100);
    
    return () => {
      window.removeEventListener('scroll', updateHighlights);
      window.removeEventListener('resize', updateHighlights);
      clearInterval(interval);
    };
  }, [currentStep, currentSubStep, currentStepData, currentSubStepData, isOnSubStep, isDiscoverMenuOpen]);

  // Position tooltip based on step configuration
  useEffect(() => {
    const updateTooltipPosition = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get position from sub-step or main step
      const position = currentSubStepData?.tooltipPosition || currentStepData.position;
      
      switch(position) {
        case 'center':
          setTooltipPosition({
            x: viewportWidth / 2,
            y: viewportHeight / 2
          });
          break;
          
        case 'middle-top':
          // Position to the left side for File Explorer
          if (highlightRect) {
            setTooltipPosition({
              x: highlightRect.right + 150, // Position to the right of the explorer
              y: highlightRect.top + 50 // Align with top of explorer
            });
          } else {
            setTooltipPosition({
              x: viewportWidth * 0.3, // Left side of screen
              y: 200 // Near top
            });
          }
          break;
          
        case 'center-monaco':
          // Center in Monaco editor area (middle of screen, slightly up)
          setTooltipPosition({
            x: viewportWidth / 2,
            y: viewportHeight * 0.35
          });
          break;
          
        case 'right-terminal':
          // Right side of terminal area
          setTooltipPosition({
            x: viewportWidth * 0.75,
            y: viewportHeight * 0.65
          });
          break;
          
        case 'center-terminal':
          // Center of terminal area
          setTooltipPosition({
            x: viewportWidth / 2,
            y: viewportHeight * 0.65
          });
          break;
          
        default: // 'auto'
          const targetRect = isOnSubStep && subHighlightRect ? subHighlightRect : highlightRect;
          if (targetRect) {
            let x = targetRect.left + targetRect.width / 2;
            let y = targetRect.top - 100;
            
            if (y < 150) {
              y = targetRect.bottom + 20;
            }
            
            const tooltipWidth = 400;
            const tooltipHeight = 200;
            
            if (x + tooltipWidth / 2 > viewportWidth - 20) {
              x = viewportWidth - tooltipWidth / 2 - 20;
            }
            if (x - tooltipWidth / 2 < 20) {
              x = tooltipWidth / 2 + 20;
            }
            
            if (y + tooltipHeight > viewportHeight - 20) {
              y = viewportHeight - tooltipHeight - 20;
            }
            
            setTooltipPosition({ x, y });
          }
      }
    };

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    
    return () => window.removeEventListener('resize', updateTooltipPosition);
  }, [currentStepData.position, currentSubStepData, highlightRect, subHighlightRect, isOnSubStep]);

  // Hero section visibility is now managed by the IDE page's showHero state
  // This effect just provides debugging information
  useEffect(() => {
    const heroSection = document.querySelector('.hero-section') as HTMLElement;
    console.log(`[InteractiveTour] Step ${currentStep + 1}: Hero management is handled by IDE page state`);
    
    if (heroSection) {
      console.log(`[InteractiveTour] Hero section status:`, {
        exists: true,
        display: heroSection.style.display || 'default',
        visibility: heroSection.style.visibility || 'default',
        opacity: heroSection.style.opacity || 'default'
      });
    } else {
      console.log(`[InteractiveTour] Hero section not found - this is expected for steps 3+ where showHero=false`);
    }
  }, [currentStep]);

  // Calculate step display
  const totalSteps = tourSteps.length;
  const stepDisplay = currentStepData.hasSubSteps && currentSubStep > 0 && currentStepData.subSteps
    ? `Step ${currentStep + 1}.${currentSubStep} of ${totalSteps}`
    : `Step ${currentStep + 1} of ${totalSteps}`;

  // Determine border colors
  const mainBorderColor = currentStepData.highlightColor === 'orange' ? '#FB923C' : '#00D9FF';
  const subBorderColor = currentSubStepData?.borderColor === 'orange' ? '#FB923C' : '#00D9FF';

  return (
    <>
      {/* Backdrop with cutout for highlighted area */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998 }}
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Cut out the main highlighted area */}
            {highlightRect && (
              <rect
                x={highlightRect.x - 4}
                y={highlightRect.y - 4}
                width={highlightRect.width + 8}
                height={highlightRect.height + 8}
                fill="black"
                rx="8"
              />
            )}
            {/* Cut out sub-highlight area if exists */}
            {subHighlightRect && (
              <rect
                x={subHighlightRect.x - 4}
                y={subHighlightRect.y - 4}
                width={subHighlightRect.width + 8}
                height={subHighlightRect.height + 8}
                fill="black"
                rx="8"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay with cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="black"
          fillOpacity="0.7"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Main highlight border */}
      {highlightRect && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: highlightRect.x - 4,
            top: highlightRect.y - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            border: `3px solid ${mainBorderColor}`,
            borderRadius: '8px',
            boxShadow: currentStepData.highlightColor === 'orange' 
              ? `0 0 40px 20px ${mainBorderColor}66, 0 0 60px 30px ${mainBorderColor}44, inset 0 0 30px 10px ${mainBorderColor}33`
              : currentStepData.id === 'status-bar-features' 
                ? `0 0 80px 30px ${mainBorderColor}66, 0 0 120px 40px ${mainBorderColor}44, inset 0 0 50px 20px ${mainBorderColor}33` // Super enhanced blue glow for Status Bar
                : `0 0 20px 10px ${mainBorderColor}33, inset 0 0 20px 5px ${mainBorderColor}1A`,
            zIndex: 9999
          }}
        />
      )}

      {/* Sub-highlight border (for buttons or Discover menu) */}
      {subHighlightRect && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: subHighlightRect.x - 4,
            top: subHighlightRect.y - 4,
            width: subHighlightRect.width + 8,
            height: subHighlightRect.height + 8,
            border: `3px solid ${currentStepData.id === 'discover-menu' && isDiscoverMenuOpen ? '#00D9FF' : subBorderColor}`,
            borderRadius: '8px',
            boxShadow: subBorderColor === '#FB923C' 
              ? `0 0 40px 20px ${subBorderColor}66, 0 0 60px 30px ${subBorderColor}44, inset 0 0 30px 10px ${subBorderColor}33`
              : `0 0 20px 10px ${currentStepData.id === 'discover-menu' && isDiscoverMenuOpen ? '#00D9FF' : subBorderColor}33`,
            zIndex: 9999
          }}
        />
      )}
      
      {/* Tour Tooltip */}
      <div
        className="tour-tooltip fixed bg-bg-secondary border border-border-default rounded-lg shadow-2xl p-6 max-w-sm"
        style={{
          left: tooltipPosition.x - 200,
          top: tooltipPosition.y,
          zIndex: 10000,
          backdropFilter: 'blur(8px)',
          background: 'rgba(26, 26, 26, 0.95)',
          transform: 'translateX(50%)',
          pointerEvents: 'auto'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-bg-tertiary transition-colors"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>

        {/* Step Counter */}
        <div className="text-xs text-text-muted mb-2">
          {stepDisplay}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {isOnSubStep && currentSubStepData ? currentSubStepData.title : currentStepData.title}
        </h3>

        {/* Content */}
        <p className="text-text-secondary mb-4">
          {isOnSubStep && currentSubStepData ? currentSubStepData.content : currentStepData.content}
        </p>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0 && currentSubStep === 0}
            className="px-4 py-2 text-sm bg-bg-tertiary text-text-secondary rounded-md hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm bg-coder1-cyan text-black rounded-md hover:bg-coder1-cyan/80 transition-colors"
          >
            {currentStep === tourSteps.length - 1 && 
             (!currentStepData.hasSubSteps || currentSubStep === currentStepData.subSteps?.length) 
              ? 'Finish' 
              : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}