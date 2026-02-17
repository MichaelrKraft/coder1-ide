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
  position?: 'center' | 'auto' | 'middle-top' | 'center-monaco' | 'right-terminal' | 'center-terminal' | 'right-preview' | 'left-preview';
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
    title: 'Welcome to Coder1 IDE 🚀',
    content: 'Your AI-powered development environment designed for Claude Code. Let\'s take a quick tour!',
    target: 'ide-interface',
    position: 'center',
    highlightColor: 'turquoise',
    keepHero: true
  },
  {
    id: 'prd-generator',
    title: 'Smart PRD Generator',
    content: 'AI-powered PRD documentation. Describe your idea, get comprehensive requirements instantly. 📝',
    target: 'prd-generator-button',
    position: 'right-preview',
    highlightColor: 'turquoise',
    keepHero: true
  },
  {
    id: 'file-explorer',
    title: 'File Explorer',
    content: 'Your project files and sessions, beautifully organized. Click any file to start editing. 📁',
    target: 'file-explorer',
    position: 'middle-top',
    highlightColor: 'turquoise'
  },
  {
    id: 'code-editor',
    title: 'Monaco Code Editor',
    content: 'Full VSCode editing power: syntax highlighting, IntelliSense, and all your favorite shortcuts. ✨',
    target: 'monaco-editor',
    position: 'center-monaco',
    highlightColor: 'turquoise',
    addCode: true
  },
  {
    id: 'terminal-features',
    title: 'AI-Powered Terminal',
    content: 'Your AI-powered terminal with voice input 🎤, supervision 👁️, and smart settings ⚙️. Try typing "claude" to get started! ✨',
    target: 'terminal',
    position: 'center-monaco',
    highlightColor: 'turquoise'
  },
  {
    id: 'johnny5-assistant',
    title: 'Johnny5 AI Assistant',
    content: 'Meet Johnny5, your autonomous AI employee that works while you sleep. Assign tasks, track progress, and wake up to completed work. Your own developer who never stops.',
    target: 'johnny5-panel',
    position: 'left-preview',
    highlightColor: 'orange' // Orange glow for Johnny5 - the wow factor
  },
  {
    id: 'status-bar-features',
    title: 'Status Bar Tools',
    content: 'Save checkpoints 💾, view your timeline 📅, and generate session summaries 📝 for perfect handoffs. Your development history, always accessible.',
    target: 'status-bar',
    position: 'center-terminal',
    highlightColor: 'turquoise'
  },
  {
    id: 'discover-menu',
    title: 'Discover Commands',
    content: 'Powerful slash commands: /build, /test, /deploy, and 100+ more. Type / to explore! ⚡',
    target: 'discover-button',
    position: 'center-terminal',
    highlightColor: 'orange'
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
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  // Progress tracking
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const currentStepData = tourSteps[currentStep];
  const isOnSubStep = currentStepData.hasSubSteps && currentSubStep > 0;
  const currentSubStepData = isOnSubStep ? currentStepData.subSteps?.[currentSubStep - 1] : null;
  
  // Allow tour to be re-run manually even if previously completed
  // (Auto-start prevention is handled in IDE page, not here)
  
  // Persist progress to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const progress = {
        currentStep,
        completedSteps,
        lastUpdated: Date.now()
      };
      localStorage.setItem('coder1-onboarding-progress', JSON.stringify(progress));
    }
  }, [currentStep, completedSteps]);
  
  // Add ESC key handler for quick dismissal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismissTour();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dontShowAgain]);
  
  // Dispatch tour:start event when tour mounts
  useEffect(() => {
    window.dispatchEvent(new Event('tour:start'));
    document.body.setAttribute('data-tour-active', 'true');
    
    return () => {
      window.dispatchEvent(new Event('tour:end'));
      document.body.removeAttribute('data-tour-active');
    };
  }, []);
  
  // Handle dismissing the tour
  const handleDismissTour = () => {
    if (dontShowAgain) {
      localStorage.setItem('coder1-tour-status', 'dismissed');
      localStorage.setItem('coder1-tour-timestamp', new Date().toISOString());
    }
    onClose();
  };

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
        window.dispatchEvent(new Event('tour:openDiscoverPanel'));
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
            
            console.log(`[InteractiveTour] 📝 Found discover panel (${strategyUsed})`);
            
            // DO NOT clear existing content - this breaks the React component!
            // discoverPanel.innerHTML = '';
            
            // Skip mock content injection to preserve React functionality
            /*
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
            */
            console.log(`[InteractiveTour] ✅ Discover panel ready for tour (React component preserved)`);
            
            // Don't force styling - let React control the component
            // (discoverPanel as HTMLElement).style.display = 'block';
            // (discoverPanel as HTMLElement).style.visibility = 'visible';
            // (discoverPanel as HTMLElement).style.opacity = '1';
            
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

  // Expand right panel when on Johnny5 step to ensure visibility
  useEffect(() => {
    if (currentStepData.id === 'johnny5-assistant') {
      // Dispatch event to expand right panel if collapsed
      window.dispatchEvent(new Event('expandRightPanel'));
    }
  }, [currentStepData.id]);

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
  const handleTourComplete = () => {
    // Calculate total tour time
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 60000);
    const totalSeconds = Math.round((totalTime % 60000) / 1000);
    
    console.log(`[InteractiveTour] 🎉 Tour completed in ${totalMinutes}m ${totalSeconds}s`);
    console.log(`[InteractiveTour] 📊 Completed steps: ${completedSteps.length + 1}/${tourSteps.length}`);
    
    // Add bridge setup instructions to editor
    const bridgeInstructions = `# 🌉 Welcome to Coder1 IDE, Alpha Tester!

## Next Step: Connect Your Claude Code Bridge

To use Claude Code within the IDE, you need to connect the bridge:

### Option 1: Quick Setup (Recommended)
1. Click the blue "🌉 Connect Bridge" button in the bottom status bar
2. Follow the popup instructions to:
   - Install the bridge CLI on your local machine
   - Enter the 6-digit pairing code
   - Connect your local Claude CLI to the web IDE

### Option 2: Manual Setup
If you prefer to set up manually:

\`\`\`bash
# On YOUR local computer (not in this web terminal):
# 1. Install the bridge
curl -sL https://coder1.ai/install-bridge.sh | bash

# 2. Start the bridge and enter the pairing code
coder1-bridge start
\`\`\`

### Important Notes:
- The bridge runs on YOUR computer, not in the web browser
- It connects your local Claude CLI to this web IDE
- Once connected, you can type \`claude\` in the terminal and it will work!

### Need Help?
- Read the full guide: Click "Documentation" in the Menu dropdown
- The bridge is safe: All code runs locally on your machine
- Questions? Check the alpha tester docs

---

**Ready to start coding?** Click "🌉 Connect Bridge" in the status bar below! 🚀
`;
    
    // Inject instructions into Monaco editor
    window.dispatchEvent(new CustomEvent('tour:addCode', { 
      detail: { code: bridgeInstructions } 
    }));
    
    // Also try to set it directly if Monaco is available
    const monacoContainer = document.querySelector('[data-tour="monaco-editor"]');
    if (monacoContainer) {
      const codeDisplay = document.createElement('div');
      codeDisplay.className = 'p-4 text-sm font-mono bg-[#1a1b26] overflow-auto h-full';
      codeDisplay.style.whiteSpace = 'pre-wrap';
      codeDisplay.style.color = '#a9b1d6';
      codeDisplay.innerHTML = `<pre style="margin: 0;">${bridgeInstructions}</pre>`;
      monacoContainer.innerHTML = '';
      monacoContainer.appendChild(codeDisplay);
    }
    
    // Mark tour as completed
    localStorage.setItem('coder1-tour-status', 'completed');
    localStorage.setItem('coder1-tour-timestamp', new Date().toISOString());
    localStorage.setItem('coder1-tour-completion-time', totalTime.toString());
    
    // Assign alpha tester number if not already assigned
    if (!localStorage.getItem('coder1-alpha-tester-number')) {
      // Get current counter (starts at 1 for first user)
      const counterStr = localStorage.getItem('coder1-alpha-tester-counter');
      const currentCounter = counterStr ? parseInt(counterStr, 10) : 0;
      const nextNumber = currentCounter + 1;
      
      // Assign number to this user
      localStorage.setItem('coder1-alpha-tester-number', nextNumber.toString());
      
      // Increment counter for next user
      localStorage.setItem('coder1-alpha-tester-counter', nextNumber.toString());
      
      console.log(`🎯 Alpha tester #${nextNumber} badge assigned!`);
      
      // Show celebration toast
      if (typeof window !== 'undefined') {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-coder1-cyan text-black px-6 py-3 rounded-lg shadow-glow-cyan-intense z-50 transition-all duration-300';
        toast.innerHTML = `🎉 Congrats! You're Alpha Tester #${nextNumber}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => document.body.removeChild(toast), 300);
        }, 4000);
      }
    }
    
    // Call the original complete handler
    if (onTourComplete) {
      onTourComplete();
    }
    
    onClose();
  };
  
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

    // Track step completion before moving to next
    const stepTime = Date.now() - stepStartTime;
    console.log(`[InteractiveTour] ⏱️ Step ${currentStep + 1} completed in ${Math.round(stepTime / 1000)}s`);
    
    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    
    // Move to next main step
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      const nextStepData = tourSteps[nextStep];
      console.log(`[InteractiveTour] 🚀 Moving from Step ${currentStep + 1} (${currentStepData.id}) to Step ${nextStep + 1} (${nextStepData.id})`);
      console.log(`[InteractiveTour] Next step target: "${nextStepData.target}", keepHero: ${nextStepData.keepHero}`);
      
      // Reset step timer for next step
      setStepStartTime(Date.now());
      
      setCurrentStep(nextStep);
      setCurrentSubStep(0);
      onStepChange?.(tourSteps[nextStep].id);
    } else {
      console.log(`[InteractiveTour] Tour completed, cleaning up and closing`);
      
      // Clear Monaco editor content via event
      window.dispatchEvent(new Event('tour:clearCode'));
      
      // Close discover menu if open - dispatch multiple times to ensure it's received
      if (isDiscoverMenuOpen) {
        console.log('[InteractiveTour] Closing discover panel on tour completion');
        window.dispatchEvent(new Event('tour:closeDiscoverPanel'));
        // Dispatch again after a short delay to ensure it's processed
        setTimeout(() => {
          window.dispatchEvent(new Event('tour:closeDiscoverPanel'));
        }, 100);
        setIsDiscoverMenuOpen(false);
      }
      
      // Use our new tour completion handler that saves state
      handleTourComplete();
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
          '[class*="generator"]'
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
          
        case 'above-terminal':
          // Above the terminal header
          setTooltipPosition({
            x: viewportWidth / 2,
            y: viewportHeight * 0.45 // Position above terminal header
          });
          break;
          
        case 'right-preview':
          // Position in the right preview panel area for Smart PRD Generator
          setTooltipPosition({
            x: viewportWidth * 0.65, // Right side but with margin to prevent cutoff
            y: viewportHeight * 0.25 // Upper portion of the screen
          });
          break;

        case 'left-preview':
          // Position on the left side of the screen (for Johnny5 panel highlighting)
          setTooltipPosition({
            x: viewportWidth * 0.25, // Left side with margin
            y: viewportHeight * 0.35 // Middle-upper portion of the screen
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
        className="tour-tooltip fixed bg-bg-secondary border border-orange-400 rounded-lg shadow-2xl p-6 max-w-sm"
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
          onClick={handleDismissTour}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-bg-tertiary transition-colors"
          title="Dismiss tour (ESC)"
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

        {/* Don't show again checkbox */}
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="dont-show-tour"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-border-default bg-bg-secondary text-coder1-cyan focus:ring-1 focus:ring-coder1-cyan"
          />
          <label htmlFor="dont-show-tour" className="text-xs text-text-muted cursor-pointer select-none hover:text-text-secondary">
            Don&apos;t show this tour again
          </label>
        </div>

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