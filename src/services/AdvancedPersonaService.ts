export interface PersonaCapability {
  name: string;
  description: string;
  proficiency: number;
  domains: string[];
}

export interface PersonaMemory {
  workspaceId: string;
  experiences: Experience[];
  patterns: Pattern[];
  preferences: PersonaPreferences;
  performance: PersonaPerformance;
}

export interface Experience {
  id: string;
  timestamp: Date;
  type: 'success' | 'failure' | 'learning';
  description: string;
  context: any;
  outcome: string;
  confidence: number;
}

export interface Pattern {
  id: string;
  name: string;
  frequency: number;
  successRate: number;
  contexts: string[];
  recommendations: string[];
}

export interface PersonaPerformance {
  totalDecisions: number;
  successfulDecisions: number;
  averageConfidence: number;
  domainExpertise: Map<string, number>;
  improvementAreas: string[];
}

export interface PersonaPreferences {
  codeStyle: string;
  testingApproach: string;
  securityLevel: 'standard' | 'enhanced' | 'paranoid';
  performancePriority: 'speed' | 'memory' | 'balanced';
  communicationStyle: 'concise' | 'detailed' | 'technical';
}

export interface PersonaConsultation {
  id: string;
  workspaceId: string;
  scenario: string;
  participatingPersonas: string[];
  opinions: PersonaOpinion[];
  consensus: ConsensusResult;
  finalDecision: string;
  confidence: number;
  timestamp: Date;
}

export interface PersonaOpinion {
  personaId: string;
  opinion: string;
  reasoning: string;
  confidence: number;
  vote: 'approve' | 'reject' | 'modify';
  suggestions: string[];
}

export interface ConsensusResult {
  agreement: number;
  majorityVote: 'approve' | 'reject' | 'modify';
  conflictAreas: string[];
  synthesizedApproach: string;
}

export class AdvancedPersonaService {
  private personaMemories: Map<string, PersonaMemory> = new Map();
  private consultationHistory: Map<string, PersonaConsultation[]> = new Map();
  private personaCapabilities: Map<string, PersonaCapability[]> = new Map();

  async initializePersonaMemory(personaId: string, workspaceId: string): Promise<void> {
    const memory: PersonaMemory = {
      workspaceId,
      experiences: [],
      patterns: [],
      preferences: this.getDefaultPreferences(),
      performance: {
        totalDecisions: 0,
        successfulDecisions: 0,
        averageConfidence: 0,
        domainExpertise: new Map(),
        improvementAreas: []
      }
    };

    this.personaMemories.set(`${personaId}-${workspaceId}`, memory);
    console.log(`🧠 Initialized memory for persona ${personaId} in workspace ${workspaceId}`);
  }

  async recordExperience(personaId: string, workspaceId: string, experience: Omit<Experience, 'id' | 'timestamp'>): Promise<void> {
    const memoryKey = `${personaId}-${workspaceId}`;
    const memory = this.personaMemories.get(memoryKey);
    
    if (!memory) {
      await this.initializePersonaMemory(personaId, workspaceId);
      return this.recordExperience(personaId, workspaceId, experience);
    }

    const fullExperience: Experience = {
      ...experience,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    memory.experiences.push(fullExperience);
    memory.performance.totalDecisions++;
    
    if (experience.type === 'success') {
      memory.performance.successfulDecisions++;
    }

    await this.updatePersonaPatterns(personaId, workspaceId, fullExperience);
    console.log(`📝 Recorded experience for persona ${personaId}: ${experience.type}`);
  }

  async consultMultiplePersonas(workspaceId: string, scenario: string, personaIds: string[]): Promise<PersonaConsultation> {
    console.log(`🤝 Starting multi-persona consultation for scenario: ${scenario}`);
    
    const opinions: PersonaOpinion[] = [];
    
    for (const personaId of personaIds) {
      const opinion = await this.getPersonaOpinion(personaId, workspaceId, scenario);
      opinions.push(opinion);
    }

    const consensus = this.calculateConsensus(opinions);
    
    const consultation: PersonaConsultation = {
      id: `consultation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workspaceId,
      scenario,
      participatingPersonas: personaIds,
      opinions,
      consensus,
      finalDecision: this.synthesizeFinalDecision(opinions, consensus),
      confidence: this.calculateConsultationConfidence(opinions, consensus),
      timestamp: new Date()
    };

    if (!this.consultationHistory.has(workspaceId)) {
      this.consultationHistory.set(workspaceId, []);
    }
    this.consultationHistory.get(workspaceId)!.push(consultation);

    return consultation;
  }

  async getPersonaRecommendations(personaId: string, workspaceId: string, context: any): Promise<string[]> {
    const memoryKey = `${personaId}-${workspaceId}`;
    const memory = this.personaMemories.get(memoryKey);
    
    if (!memory) {
      return ['Initialize persona memory for better recommendations'];
    }

    const recommendations: string[] = [];
    
    const relevantPatterns = memory.patterns.filter(p => 
      p.contexts.some(c => JSON.stringify(context).includes(c))
    );

    relevantPatterns.forEach(pattern => {
      if (pattern.successRate > 0.8) {
        recommendations.push(...pattern.recommendations);
      }
    });

    const recentFailures = memory.experiences
      .filter(e => e.type === 'failure')
      .slice(-5);

    recentFailures.forEach(failure => {
      recommendations.push(`Avoid: ${failure.description}`);
    });

    return [...new Set(recommendations)].slice(0, 10);
  }

  async adaptPersonaPreferences(personaId: string, workspaceId: string, feedback: any): Promise<void> {
    const memoryKey = `${personaId}-${workspaceId}`;
    const memory = this.personaMemories.get(memoryKey);
    
    if (!memory) return;

    if (feedback.codeStyleFeedback) {
      memory.preferences.codeStyle = feedback.codeStyleFeedback;
    }
    
    if (feedback.securityFeedback) {
      memory.preferences.securityLevel = feedback.securityFeedback;
    }

    console.log(`🔧 Adapted preferences for persona ${personaId} based on feedback`);
  }

  getPersonaPerformance(personaId: string, workspaceId: string): PersonaPerformance | null {
    const memoryKey = `${personaId}-${workspaceId}`;
    const memory = this.personaMemories.get(memoryKey);
    return memory?.performance || null;
  }

  getConsultationHistory(workspaceId: string): PersonaConsultation[] {
    return this.consultationHistory.get(workspaceId) || [];
  }

  private async getPersonaOpinion(personaId: string, workspaceId: string, scenario: string): Promise<PersonaOpinion> {
    const memoryKey = `${personaId}-${workspaceId}`;
    const memory = this.personaMemories.get(memoryKey);
    
    const relevantExperiences = memory?.experiences.filter(e => 
      e.description.toLowerCase().includes(scenario.toLowerCase().split(' ')[0])
    ) || [];

    const confidence = relevantExperiences.length > 0 
      ? relevantExperiences.reduce((sum, e) => sum + e.confidence, 0) / relevantExperiences.length
      : 50;

    return {
      personaId,
      opinion: this.generatePersonaOpinion(personaId, scenario, relevantExperiences),
      reasoning: this.generatePersonaReasoning(personaId, scenario, relevantExperiences),
      confidence,
      vote: confidence > 70 ? 'approve' : confidence < 40 ? 'reject' : 'modify',
      suggestions: this.generatePersonaSuggestions(personaId, scenario)
    };
  }

  private calculateConsensus(opinions: PersonaOpinion[]): ConsensusResult {
    const votes = opinions.map(o => o.vote);
    const approveCount = votes.filter(v => v === 'approve').length;
    const rejectCount = votes.filter(v => v === 'reject').length;
    const modifyCount = votes.filter(v => v === 'modify').length;

    const total = opinions.length;
    const agreement = Math.max(approveCount, rejectCount, modifyCount) / total;

    let majorityVote: 'approve' | 'reject' | 'modify' = 'modify';
    if (approveCount > rejectCount && approveCount > modifyCount) majorityVote = 'approve';
    else if (rejectCount > approveCount && rejectCount > modifyCount) majorityVote = 'reject';

    return {
      agreement,
      majorityVote,
      conflictAreas: this.identifyConflictAreas(opinions),
      synthesizedApproach: this.synthesizeApproach(opinions)
    };
  }

  private synthesizeFinalDecision(opinions: PersonaOpinion[], consensus: ConsensusResult): string {
    if (consensus.agreement > 0.8) {
      return `Strong consensus to ${consensus.majorityVote}`;
    } else if (consensus.agreement > 0.6) {
      return `Moderate consensus to ${consensus.majorityVote} with considerations: ${consensus.conflictAreas.join(', ')}`;
    } else {
      return `No clear consensus - recommend human intervention. Synthesized approach: ${consensus.synthesizedApproach}`;
    }
  }

  private calculateConsultationConfidence(opinions: PersonaOpinion[], consensus: ConsensusResult): number {
    const avgConfidence = opinions.reduce((sum, o) => sum + o.confidence, 0) / opinions.length;
    const agreementBonus = consensus.agreement * 20;
    return Math.min(100, avgConfidence + agreementBonus);
  }

  private async updatePersonaPatterns(personaId: string, workspaceId: string, experience: Experience): Promise<void> {
    const memoryKey = `${personaId}-${workspaceId}`;
    const memory = this.personaMemories.get(memoryKey);
    if (!memory) return;

    const contextKey = JSON.stringify(experience.context).substring(0, 50);
    let pattern = memory.patterns.find(p => p.contexts.includes(contextKey));

    if (!pattern) {
      pattern = {
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Pattern for ${experience.type}`,
        frequency: 1,
        successRate: experience.type === 'success' ? 1 : 0,
        contexts: [contextKey],
        recommendations: [experience.outcome]
      };
      memory.patterns.push(pattern);
    } else {
      pattern.frequency++;
      if (experience.type === 'success') {
        pattern.successRate = (pattern.successRate * (pattern.frequency - 1) + 1) / pattern.frequency;
      } else {
        pattern.successRate = (pattern.successRate * (pattern.frequency - 1)) / pattern.frequency;
      }
    }
  }

  private getDefaultPreferences(): PersonaPreferences {
    return {
      codeStyle: 'clean',
      testingApproach: 'comprehensive',
      securityLevel: 'enhanced',
      performancePriority: 'balanced',
      communicationStyle: 'detailed'
    };
  }

  private generatePersonaOpinion(personaId: string, scenario: string, experiences: Experience[]): string {
    const baseOpinions = {
      'frontend': 'Focus on user experience and responsive design',
      'backend': 'Prioritize scalability and data integrity',
      'security': 'Implement comprehensive security measures',
      'performance': 'Optimize for speed and efficiency',
      'testing': 'Ensure thorough test coverage'
    };

    return baseOpinions[personaId as keyof typeof baseOpinions] || 'Proceed with caution and best practices';
  }

  private generatePersonaReasoning(personaId: string, scenario: string, experiences: Experience[]): string {
    if (experiences.length > 0) {
      return `Based on ${experiences.length} similar experiences, with average confidence ${
        experiences.reduce((sum, e) => sum + e.confidence, 0) / experiences.length
      }%`;
    }
    return 'Based on general best practices and persona expertise';
  }

  private generatePersonaSuggestions(personaId: string, scenario: string): string[] {
    const suggestions = {
      'frontend': ['Consider mobile responsiveness', 'Implement accessibility features', 'Optimize bundle size'],
      'backend': ['Add proper error handling', 'Implement caching', 'Consider database indexing'],
      'security': ['Validate all inputs', 'Use HTTPS', 'Implement rate limiting'],
      'performance': ['Profile before optimizing', 'Consider lazy loading', 'Minimize dependencies'],
      'testing': ['Write unit tests first', 'Add integration tests', 'Consider edge cases']
    };

    return suggestions[personaId as keyof typeof suggestions] || ['Follow best practices', 'Document changes'];
  }

  private identifyConflictAreas(opinions: PersonaOpinion[]): string[] {
    const conflicts: string[] = [];
    const votes = opinions.map(o => o.vote);
    
    if (new Set(votes).size > 1) {
      conflicts.push('Voting disagreement');
    }

    const confidenceRange = Math.max(...opinions.map(o => o.confidence)) - Math.min(...opinions.map(o => o.confidence));
    if (confidenceRange > 40) {
      conflicts.push('Confidence variance');
    }

    return conflicts;
  }

  private synthesizeApproach(opinions: PersonaOpinion[]): string {
    const allSuggestions = opinions.flatMap(o => o.suggestions);
    const uniqueSuggestions = [...new Set(allSuggestions)];
    return uniqueSuggestions.slice(0, 3).join(', ');
  }
}
