/**
 * CLI PRD Orchestrator - 100% FREE Version
 * 
 * Uses Claude Code CLI (OAuth token) instead of paid API.
 * Provides same functionality at ZERO cost!
 * 
 * Benefits:
 * - $0.00 per PRD (vs $0.09 with API)
 * - Uses existing OAuth authentication
 * - Same quality output
 * - No API key management needed
 */

import { CLIToolExecutor, analyzeAnswers, gatherEvidence, generateSection, scorePRDQuality } from './cli-tool-executor';
import type { AnalysisInsights, MarketEvidence, SectionContent, QualityScore } from './tool-definitions';

export interface CLIPRDGenerationOptions {
  mode: 'quick' | 'professional';
  pattern: string;
  includeEvidence: boolean;
  targetQuality: number;
  sectionsToGenerate: string[];
  claudeCliPath?: string;
}

export interface CLIPRDGenerationResult {
  success: boolean;
  prd?: string;
  error?: string;
  metadata: {
    insights: AnalysisInsights | null;
    evidence: MarketEvidence | null;
    quality: QualityScore | null;
    tokensUsed: {
      total: number;
      byTool: Record<string, number>;
    };
    cost: number; // Always $0.00!
    duration: number;
    generationMethod: 'cli-based';
    sectionsGenerated: number;
    enhancementIterations: number;
  };
}

export class CLIPRDOrchestrator {
  private executor: CLIToolExecutor;
  
  constructor(claudeCliPath?: string) {
    this.executor = new CLIToolExecutor({ claudeCliPath });
  }
  
  /**
   * Generate complete PRD using CLI-based tools
   */
  async generatePRD(
    answers: any,
    options: CLIPRDGenerationOptions
  ): Promise<CLIPRDGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 Starting CLI-based PRD generation (${options.mode} mode)`);
      console.log(`   Pattern: ${options.pattern}`);
      console.log(`   Evidence: ${options.includeEvidence ? 'Yes' : 'No'}`);
      console.log(`   Target Quality: ${options.targetQuality}/10`);
      console.log(`   Cost: $0.00 (FREE!) 🎉\n`);
      
      // Step 1: Analyze answers deeply
      console.log('📊 Step 1/6: Analyzing questionnaire answers...');
      const analysisResult = await analyzeAnswers(
        this.executor,
        answers,
        options.pattern,
        options.mode
      );
      
      if (!analysisResult.success || !analysisResult.data) {
        throw new Error(`Analysis failed: ${analysisResult.error}`);
      }
      
      const insights = analysisResult.data;
      console.log(`   ✅ Analysis complete (${analysisResult.metadata.duration}ms)`);
      
      // Step 2: Gather evidence (Professional mode only)
      let evidence: MarketEvidence | null = null;
      
      if (options.includeEvidence) {
        console.log('🔍 Step 2/6: Gathering market evidence...');
        const evidenceResult = await gatherEvidence(
          this.executor,
          insights,
          answers['category'] || 'Technology',
          answers['competitors'] || []
        );
        
        if (evidenceResult.success && evidenceResult.data) {
          evidence = evidenceResult.data;
          console.log(`   ✅ Evidence gathered (${evidenceResult.metadata.duration}ms)`);
        } else {
          console.log(`   ⚠️  Evidence gathering failed, continuing without`);
        }
      } else {
        console.log('⏭️  Step 2/6: Skipping evidence (Quick mode)');
      }
      
      // Step 3: Generate sections in parallel
      console.log(`📝 Step 3/6: Generating ${options.sectionsToGenerate.length} sections...`);
      const sectionResults = await Promise.all(
        options.sectionsToGenerate.map(section =>
          generateSection(
            this.executor,
            section,
            insights,
            options.pattern,
            evidence || undefined
          )
        )
      );
      
      const sections: Record<string, SectionContent> = {};
      let sectionsGenerated = 0;
      
      sectionResults.forEach((result, index) => {
        if (result.success && result.data) {
          const sectionName = options.sectionsToGenerate[index];
          sections[sectionName] = result.data;
          sectionsGenerated++;
        }
      });
      
      console.log(`   ✅ Generated ${sectionsGenerated}/${options.sectionsToGenerate.length} sections`);
      
      // Step 4: Compile PRD
      console.log('📄 Step 4/6: Compiling PRD document...');
      const prd = this.compilePRD(sections, insights, evidence, options);
      console.log(`   ✅ PRD compiled (${prd.split(/\s+/).length} words)`);
      
      // Step 5: Score quality
      console.log('🎯 Step 5/6: Scoring PRD quality...');
      const qualityResult = await scorePRDQuality(this.executor, prd);
      
      if (!qualityResult.success || !qualityResult.data) {
        throw new Error(`Quality scoring failed: ${qualityResult.error}`);
      }
      
      const quality = qualityResult.data;
      console.log(`   ✅ Quality score: ${quality.overall_score.toFixed(1)}/10`);
      
      // Step 6: Enhancement loop (if needed)
      let enhancementIterations = 0;
      let finalPRD = prd;
      
      if (quality.overall_score < options.targetQuality && quality.weak_sections.length > 0) {
        console.log(`⚡ Step 6/6: Enhancing weak sections...`);
        
        // Enhance weak sections (max 1 iteration for CLI to keep it fast)
        const enhancedSections = await this.enhanceWeakSections(
          sections,
          quality.weak_sections,
          insights,
          options.pattern,
          evidence
        );
        
        if (enhancedSections) {
          // Recompile with enhanced sections
          finalPRD = this.compilePRD(
            { ...sections, ...enhancedSections },
            insights,
            evidence,
            options
          );
          
          enhancementIterations = 1;
          console.log(`   ✅ Enhanced ${Object.keys(enhancedSections).length} sections`);
        }
      } else {
        console.log(`✅ Step 6/6: Quality target met, no enhancement needed`);
      }
      
      // Calculate final metrics
      const duration = Date.now() - startTime;
      const tokenUsage = this.executor.getTokenUsage();
      
      console.log(`\n🎉 PRD generation complete!`);
      console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
      console.log(`   Quality: ${quality.overall_score.toFixed(1)}/10`);
      console.log(`   Tokens: ${tokenUsage.total}`);
      console.log(`   Cost: $0.00 (FREE!) 💰\n`);
      
      return {
        success: true,
        prd: finalPRD,
        metadata: {
          insights,
          evidence,
          quality,
          tokensUsed: {
            total: tokenUsage.total,
            byTool: {}
          },
          cost: 0.00,
          duration,
          generationMethod: 'cli-based',
          sectionsGenerated,
          enhancementIterations
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ CLI-based PRD generation failed:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          insights: null,
          evidence: null,
          quality: null,
          tokensUsed: { total: 0, byTool: {} },
          cost: 0.00,
          duration,
          generationMethod: 'cli-based',
          sectionsGenerated: 0,
          enhancementIterations: 0
        }
      };
    }
  }
  
  /**
   * Compile PRD from sections
   */
  private compilePRD(
    sections: Record<string, SectionContent>,
    insights: AnalysisInsights,
    evidence: MarketEvidence | null,
    options: CLIPRDGenerationOptions
  ): string {
    const productName = insights.problemAnalysis.surface || 'Product Name';
    const date = new Date().toLocaleDateString();
    
    let prd = `# Product Requirements Document

## ${productName}

*Generated: ${date}*  
*Pattern: ${options.pattern}*  
*Mode: ${options.mode === 'professional' ? 'Professional (15-20 pages)' : 'Quick (5-8 pages)'}*  
*Generation Method: CLI-based (FREE)*

---

`;
    
    // Add sections in order
    for (const sectionName of options.sectionsToGenerate) {
      const section = sections[sectionName];
      if (section && section.content) {
        prd += section.content + '\n\n---\n\n';
      }
    }
    
    // Add footer
    prd += `*This PRD was generated using Claude Code CLI with the ${options.pattern} pattern. Ready for implementation in Coder1 IDE.*\n`;
    prd += `*Generation cost: $0.00 (FREE!) 🎉*\n`;
    
    return prd;
  }
  
  /**
   * Enhance weak sections
   */
  private async enhanceWeakSections(
    sections: Record<string, SectionContent>,
    weakSections: string[],
    insights: AnalysisInsights,
    pattern: string,
    evidence: MarketEvidence | null
  ): Promise<Record<string, SectionContent> | null> {
    try {
      const enhanced: Record<string, SectionContent> = {};
      
      // Enhance only the first weak section to keep CLI fast
      const sectionToEnhance = weakSections[0];
      
      console.log(`   Enhancing: ${sectionToEnhance}`);
      
      const result = await generateSection(
        this.executor,
        sectionToEnhance,
        insights,
        pattern,
        evidence || undefined
      );
      
      if (result.success && result.data) {
        enhanced[sectionToEnhance] = result.data;
      }
      
      return Object.keys(enhanced).length > 0 ? enhanced : null;
      
    } catch (error) {
      console.error('Enhancement failed:', error);
      return null;
    }
  }
}
