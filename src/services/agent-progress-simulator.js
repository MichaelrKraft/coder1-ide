/**
 * Agent Progress Simulator - Two-Tier Dashboard Version
 * Creates realistic mock progress animations for visual appeal (top tier)
 * while actual work streams from Claude Task Bridge (bottom tier)
 * 
 * This provides an engaging visual experience with real tracking data,
 * leveraging Claude Code Max subscription for zero API costs.
 */

class AgentProgressSimulator {
  constructor() {
    this.activeSimulations = new Map();
    this.loopingAnimations = new Map();
    this.progressPatterns = {
      // Realistic progress patterns that loop independently
      'frontend-engineer': [
        { phase: 'Analyzing UI requirements', duration: 3000, progress: 15 },
        { phase: 'Setting up components', duration: 4000, progress: 30 },
        { phase: 'Building user interface', duration: 8000, progress: 60 },
        { phase: 'Adding styles and polish', duration: 6000, progress: 80 },
        { phase: 'Testing interactions', duration: 4000, progress: 95 },
        { phase: 'Finalizing UI', duration: 2000, progress: 100 }
      ],
      'backend-engineer': [
        { phase: 'Reviewing requirements', duration: 2500, progress: 10 },
        { phase: 'Designing architecture', duration: 4500, progress: 25 },
        { phase: 'Setting up database', duration: 5000, progress: 40 },
        { phase: 'Building API endpoints', duration: 9000, progress: 70 },
        { phase: 'Adding validation', duration: 5000, progress: 85 },
        { phase: 'Writing documentation', duration: 3000, progress: 100 }
      ],
      'qa-testing': [
        { phase: 'Analyzing test requirements', duration: 2000, progress: 10 },
        { phase: 'Creating test scenarios', duration: 3500, progress: 25 },
        { phase: 'Writing test cases', duration: 6000, progress: 50 },
        { phase: 'Running automated tests', duration: 7000, progress: 75 },
        { phase: 'Validating results', duration: 4000, progress: 90 },
        { phase: 'Generating reports', duration: 2500, progress: 100 }
      ],
      'devops-engineer': [
        { phase: 'Checking infrastructure', duration: 3000, progress: 15 },
        { phase: 'Configuring pipeline', duration: 5000, progress: 35 },
        { phase: 'Setting up CI/CD', duration: 7000, progress: 60 },
        { phase: 'Optimizing build', duration: 4500, progress: 80 },
        { phase: 'Deployment checks', duration: 3500, progress: 95 },
        { phase: 'Finalizing setup', duration: 2000, progress: 100 }
      ],
      'security-analyst': [
        { phase: 'Scanning for vulnerabilities', duration: 5000, progress: 20 },
        { phase: 'Analyzing dependencies', duration: 4000, progress: 40 },
        { phase: 'Checking authentication', duration: 4500, progress: 60 },
        { phase: 'Testing security headers', duration: 3000, progress: 75 },
        { phase: 'Reviewing permissions', duration: 3500, progress: 90 },
        { phase: 'Security report', duration: 2000, progress: 100 }
      ],
      'ux-designer': [
        { phase: 'Researching user needs', duration: 3000, progress: 15 },
        { phase: 'Creating wireframes', duration: 6000, progress: 35 },
        { phase: 'Designing mockups', duration: 8000, progress: 65 },
        { phase: 'Building prototypes', duration: 5000, progress: 85 },
        { phase: 'Refining experience', duration: 3000, progress: 100 }
      ]
    };
    
    // Add some variance to make it look more realistic
    this.varianceFactors = {
      speedVariance: 0.3,  // ±30% speed variation
      pauseChance: 0.1,    // 10% chance of brief pause
      microUpdateChance: 0.15 // 15% chance of micro-updates
    };
  }

  /**
   * Start looping visual animations for the top tier dashboard
   * These run independently of the actual Claude Task work
   */
  startLoopingAnimations(agents, onProgress) {
    agents.forEach((agent, index) => {
      // Stagger starts for natural feel
      const startDelay = index * (500 + Math.random() * 1000);
      
      setTimeout(() => {
        this.startAgentLoop(agent, onProgress);
      }, startDelay);
    });
    
    return {
      // Method to stop all animations when Task completes
      stopAll: () => this.stopAllAnimations(),
      // Method to show completion state
      showCompletion: () => this.showCompletionState(agents, onProgress)
    };
  }

  /**
   * Start a single agent's looping animation
   */
  startAgentLoop(agent, onProgress) {
    const pattern = this.progressPatterns[agent.type] || this.progressPatterns['backend-engineer'];
    let currentPhaseIndex = 0;
    let currentProgress = 0;
    let isRunning = true;
    
    const animate = () => {
      if (!isRunning) return;
      
      const phase = pattern[currentPhaseIndex];
      const targetProgress = phase.progress;
      
      // Smooth progress animation
      const progressStep = () => {
        if (!isRunning) return;
        
        if (currentProgress < targetProgress) {
          // Smooth increments
          currentProgress = Math.min(currentProgress + (Math.random() * 2 + 0.5), targetProgress);
          
          onProgress({
            agentId: agent.id,
            agentName: agent.name,
            status: 'in_progress',
            progress: Math.round(currentProgress),
            phase: phase.phase + (Math.random() > 0.5 ? '...' : '')
          });
          
          setTimeout(progressStep, 50 + Math.random() * 100);
        } else {
          // Move to next phase or loop back
          currentPhaseIndex = (currentPhaseIndex + 1) % pattern.length;
          if (currentPhaseIndex === 0) {
            currentProgress = 0; // Reset for loop
            // Add a pause before restarting
            setTimeout(animate, 2000 + Math.random() * 1000);
          } else {
            setTimeout(animate, 200 + Math.random() * 300);
          }
        }
      };
      
      progressStep();
    };
    
    // Store the animation control
    this.loopingAnimations.set(agent.id, {
      stop: () => { isRunning = false; }
    });
    
    // Start the animation
    animate();
  }

  /**
   * Stop all looping animations
   */
  stopAllAnimations() {
    this.loopingAnimations.forEach(animation => {
      if (animation.stop) animation.stop();
    });
    this.loopingAnimations.clear();
  }

  /**
   * Show completion state for all agents
   */
  showCompletionState(agents, onProgress) {
    agents.forEach(agent => {
      onProgress({
        agentId: agent.id,
        agentName: agent.name,
        status: 'completed',
        progress: 100,
        phase: '✅ Task completed'
      });
    });
  }

  /**
   * Legacy method - kept for compatibility
   * Start a simulated progress animation for multiple agents
   * while actual work is done through Claude Task Bridge
   */
  async simulateTeamProgress(agents, taskDescription, onProgress) {
    const simulations = [];
    
    // Start individual agent simulations with staggered starts
    for (const [index, agent] of agents.entries()) {
      // Stagger starts by 500-1500ms for realism
      const startDelay = index * (500 + Math.random() * 1000);
      
      setTimeout(() => {
        const simulation = this.simulateAgentProgress(
          agent.id,
          agent.name,
          agent.type,
          (update) => {
            onProgress({
              agentId: agent.id,
              ...update
            });
          }
        );
        simulations.push(simulation);
      }, startDelay);
    }
    
    // Return control handle for the simulations
    return {
      simulations,
      // Method to sync with actual Task Bridge completion
      syncWithTaskBridge: async (taskBridgePromise) => {
        try {
          // Wait for actual Claude Task Bridge work
          const result = await taskBridgePromise;
          
          // Ensure all simulations complete smoothly
          await Promise.all(simulations);
          
          // Brief celebration animation
          this.celebrateCompletion(agents, onProgress);
          
          return result;
        } catch (error) {
          // On error, show failure state in simulations
          this.showErrorState(agents, onProgress);
          throw error;
        }
      }
    };
  }

  /**
   * Simulate individual agent progress with realistic patterns
   */
  simulateAgentProgress(agentId, agentName, agentType, onUpdate) {
    return new Promise((resolve) => {
      const pattern = this.progressPatterns[agentType] || this.progressPatterns['backend-engineer'];
      const adjustedPattern = this.addRealisticVariance(pattern);
      
      let currentPhaseIndex = 0;
      let currentProgress = 0;
      
      const updateProgress = () => {
        if (currentPhaseIndex >= adjustedPattern.length) {
          // Agent completed
          onUpdate({
            status: 'completed',
            progress: 100,
            phase: 'Task completed successfully',
            agentName
          });
          this.activeSimulations.delete(agentId);
          resolve();
          return;
        }
        
        const phase = adjustedPattern[currentPhaseIndex];
        
        // Smooth progress interpolation
        const progressStep = () => {
          if (currentProgress < phase.progress) {
            // Micro-updates for smooth animation
            const increment = Math.random() * 2 + 0.5;
            currentProgress = Math.min(currentProgress + increment, phase.progress);
            
            onUpdate({
              status: 'in_progress',
              progress: Math.round(currentProgress),
              phase: phase.phase,
              agentName,
              // Add some dynamic sub-status for realism
              subStatus: this.generateSubStatus(phase.phase, currentProgress)
            });
            
            // Random micro-delays for realism
            const delay = 50 + Math.random() * 150;
            setTimeout(progressStep, delay);
          } else {
            // Move to next phase
            currentPhaseIndex++;
            setTimeout(updateProgress, 500 + Math.random() * 1000);
          }
        };
        
        // Occasional pause for realism
        if (Math.random() < this.varianceFactors.pauseChance) {
          onUpdate({
            status: 'thinking',
            progress: currentProgress,
            phase: phase.phase,
            agentName,
            subStatus: 'Analyzing...'
          });
          setTimeout(progressStep, 1000 + Math.random() * 1500);
        } else {
          progressStep();
        }
      };
      
      // Start the simulation
      this.activeSimulations.set(agentId, { agentName, resolve });
      
      // Initial startup delay
      onUpdate({
        status: 'starting',
        progress: 0,
        phase: 'Initializing agent...',
        agentName
      });
      
      setTimeout(updateProgress, 800 + Math.random() * 700);
    });
  }

  /**
   * Add realistic variance to progress patterns
   */
  addRealisticVariance(pattern) {
    return pattern.map(phase => {
      const speedMultiplier = 1 + (Math.random() - 0.5) * this.varianceFactors.speedVariance;
      return {
        ...phase,
        duration: Math.round(phase.duration * speedMultiplier)
      };
    });
  }

  /**
   * Generate dynamic sub-status messages for realism
   */
  generateSubStatus(phase, progress) {
    const subStatuses = {
      'Creating React components': [
        'Setting up component structure...',
        'Adding props and state...',
        'Implementing event handlers...',
        'Optimizing render performance...'
      ],
      'Implementing API endpoints': [
        'Defining route handlers...',
        'Adding request validation...',
        'Implementing business logic...',
        'Setting up response formatting...'
      ],
      'Running automated tests': [
        'Executing unit tests...',
        'Running integration tests...',
        'Checking code coverage...',
        'Validating test results...'
      ]
    };
    
    const options = subStatuses[phase] || ['Processing...', 'Analyzing...', 'Working...'];
    const index = Math.floor((progress % 100) / (100 / options.length));
    return options[Math.min(index, options.length - 1)];
  }

  /**
   * Show celebration animation when all agents complete
   */
  celebrateCompletion(agents, onProgress) {
    agents.forEach(agent => {
      onProgress({
        agentId: agent.id,
        status: 'completed',
        progress: 100,
        phase: '✅ Task completed successfully!',
        agentName: agent.name,
        celebration: true
      });
    });
  }

  /**
   * Show error state in simulations
   */
  showErrorState(agents, onProgress) {
    agents.forEach(agent => {
      onProgress({
        agentId: agent.id,
        status: 'error',
        progress: this.activeSimulations.get(agent.id)?.progress || 0,
        phase: '❌ Task encountered an error',
        agentName: agent.name,
        error: true
      });
    });
  }

  /**
   * Cancel all active simulations
   */
  cancelAll() {
    this.activeSimulations.forEach(sim => {
      if (sim.resolve) {
        sim.resolve();
      }
    });
    this.activeSimulations.clear();
  }
}

module.exports = AgentProgressSimulator;