/**
 * API endpoint to check MCP installation status
 * Returns installation status and health information for a specific MCP template
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Load template data to get MCP configurations
async function loadTemplateData() {
  try {
    const templatesPath = path.join(process.cwd(), '../src/data/coderone-templates');
    const mcpIntegrationsPath = path.join(templatesPath, 'mcp-integrations.json');
    
    const mcpData = JSON.parse(await fs.readFile(mcpIntegrationsPath, 'utf8'));
    return mcpData.templates.map((template: any) => ({
      ...template,
      category: mcpData.category,
      categorySlug: mcpData.categorySlug
    }));
  } catch (error) {
    console.error('Error loading template data:', error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { templateId } = params;
    
    // Load template data
    const templates = await loadTemplateData();
    const template = templates.find((t: any) => t.id === templateId);
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }

    let installStatus = {
      templateId,
      templateName: template.name,
      isInstalled: false,
      isConfigured: false,
      needsEnvironmentVars: false,
      missingEnvVars: [] as string[],
      status: 'not_installed',
      statusMessage: 'Not installed'
    };

    // Check if template has MCP configuration
    if (!template.mcpConfig) {
      installStatus.status = 'no_mcp_config';
      installStatus.statusMessage = 'Template does not support MCP installation';
      return NextResponse.json({
        success: true,
        ...installStatus
      });
    }

    const homedir = os.homedir();
    const mcpConfigPath = path.join(homedir, '.mcp.json');

    // Check if already installed
    try {
      const configContent = await fs.readFile(mcpConfigPath, 'utf8');
      const mcpConfig = JSON.parse(configContent);
      
      if (mcpConfig.mcpServers && mcpConfig.mcpServers[templateId]) {
        installStatus.isInstalled = true;
        
        // Check if environment variables are configured
        const serverConfig = mcpConfig.mcpServers[templateId];
        const templateEnv = template.mcpConfig.env || {};
        const configuredEnv = serverConfig.env || {};
        
        const missingEnvVars: string[] = [];
        for (const [key, value] of Object.entries(templateEnv)) {
          if (typeof value === 'string' && (value.includes('YOUR_') || !configuredEnv[key] || configuredEnv[key].includes('YOUR_'))) {
            missingEnvVars.push(key);
          }
        }
        
        if (missingEnvVars.length > 0) {
          installStatus.needsEnvironmentVars = true;
          installStatus.missingEnvVars = missingEnvVars;
          installStatus.status = 'needs_config';
          installStatus.statusMessage = `Installed but needs configuration: ${missingEnvVars.join(', ')}`;
        } else {
          installStatus.isConfigured = true;
          installStatus.status = 'installed';
          installStatus.statusMessage = 'Installed and configured';
        }
      }
    } catch (error) {
      // MCP config file doesn't exist or is invalid
      installStatus.status = 'not_installed';
      installStatus.statusMessage = 'Not installed';
    }

    // Check if environment variables are required for installation
    if (!installStatus.isInstalled) {
      const templateEnv = template.mcpConfig.env || {};
      const requiredEnvVars = Object.keys(templateEnv).filter(key => {
        const value = templateEnv[key];
        return typeof value === 'string' && value.includes('YOUR_');
      });
      
      if (requiredEnvVars.length > 0) {
        installStatus.needsEnvironmentVars = true;
        installStatus.missingEnvVars = requiredEnvVars;
        installStatus.status = 'needs_setup';
        installStatus.statusMessage = `Requires setup: ${requiredEnvVars.join(', ')}`;
      } else {
        installStatus.status = 'ready_to_install';
        installStatus.statusMessage = 'Ready for one-click installation';
      }
    }

    return NextResponse.json({
      success: true,
      ...installStatus
    });

  } catch (error) {
    console.error('Error checking install status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check installation status: ' + (error as Error).message
    }, { status: 500 });
  }
}