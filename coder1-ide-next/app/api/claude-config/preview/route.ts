import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { 
  templateLoader,
  configParser,
  permissionAnalyzer,
  costCalculator 
} from '@/lib/claude-config';
import type { ConfigType } from '@/lib/claude-config/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const configId = searchParams.get('configId');
    
    if (!templateId && !configId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide either templateId or configId parameter'
        },
        { status: 400 }
      );
    }
    
    let content: string;
    let type: ConfigType;
    let name: string;
    let description: string;
    
    if (templateId) {
      // Load template
      const result = await templateLoader.loadTemplate(templateId);
      content = result.content;
      type = result.template.type;
      name = result.template.name;
      description = result.template.description;
    } else {
      // Load user config (implementation would go here)
      // For now, return error
      return NextResponse.json(
        {
          success: false,
          error: 'Config preview not yet implemented'
        },
        { status: 501 }
      );
    }
    
    // Parse config to extract metadata
    const parseResult = configParser.parseConfig(content, type);
    
    // Analyze permissions
    const permissionAnalysis = permissionAnalyzer.analyzePermissions(parseResult.permissions);
    const riskScore = permissionAnalyzer.calculateRiskScore(parseResult.permissions);
    const riskLevel = permissionAnalyzer.getRiskLevel(riskScore);
    
    // Calculate cost estimate
    const costEstimate = costCalculator.estimateConfigCost(type, parseResult.permissions);
    
    return NextResponse.json({
      success: true,
      preview: {
        id: templateId || configId,
        name,
        description,
        type,
        content,
        capabilities: parseResult.capabilities,
        permissions: parseResult.permissions,
        tags: parseResult.tags,
        permissionAnalysis,
        riskScore,
        riskLevel,
        costEstimate
      }
    });
    
  } catch (error) {
    console.error('[Claude Config API] Failed to generate preview:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
