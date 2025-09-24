/**
 * API endpoint for MCP installation
 * Installs MCP by adding configuration to ~/.mcp.json
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

export async function POST(request: NextRequest) {
  try {
    const { templateId } = await request.json();
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'Template ID is required'
      }, { status: 400 });
    }

    // Load template data to get MCP configuration
    const templates = await loadTemplateData();
    const template = templates.find((t: any) => t.id === templateId);
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }

    // Check if template has MCP configuration
    if (!template.mcpConfig) {
      return NextResponse.json({
        success: false,
        error: 'Template does not have MCP configuration'
      }, { status: 400 });
    }

    // Validate MCP configuration
    const { command, args, env } = template.mcpConfig;
    if (!command || !Array.isArray(args)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid MCP configuration format'
      }, { status: 400 });
    }

    const homedir = os.homedir();
    const mcpConfigPath = path.join(homedir, '.mcp.json');

    // Read existing MCP configuration
    let mcpConfig = { mcpServers: {} };
    
    try {
      const existingConfig = await fs.readFile(mcpConfigPath, 'utf8');
      mcpConfig = JSON.parse(existingConfig);
      
      // Ensure mcpServers exists
      if (!mcpConfig.mcpServers) {
        mcpConfig.mcpServers = {};
      }
    } catch (error) {
      // File doesn't exist or is invalid, use default
      console.log('Creating new MCP config file');
    }

    // Check if MCP is already installed
    if (mcpConfig.mcpServers[templateId]) {
      return NextResponse.json({
        success: true,
        message: `MCP "${template.name}" is already installed`,
        alreadyInstalled: true,
        template: {
          id: template.id,
          name: template.name
        }
      });
    }

    // Prepare MCP configuration for ~/.mcp.json
    const mcpServerConfig = {
      name: template.name,
      command: command,
      args: args,
      env: env || {}
    };

    // Add new MCP configuration
    mcpConfig.mcpServers[templateId] = mcpServerConfig;

    // Create backup of existing config
    try {
      await fs.access(mcpConfigPath);
      const backupPath = `${mcpConfigPath}.backup-${Date.now()}`;
      await fs.copyFile(mcpConfigPath, backupPath);
      console.log(`Created backup: ${backupPath}`);
    } catch (backupError) {
      console.warn('Could not create backup:', (backupError as Error).message);
    }

    // Write updated configuration
    await fs.writeFile(
      mcpConfigPath, 
      JSON.stringify(mcpConfig, null, 2),
      'utf8'
    );

    console.log(`✅ MCP "${template.name}" installed successfully`);

    return NextResponse.json({
      success: true,
      message: `MCP "${template.name}" installed successfully`,
      requiresRestart: true,
      template: {
        id: template.id,
        name: template.name,
        command: template.mcpConfig.command
      },
      configPath: mcpConfigPath
    });

  } catch (error) {
    console.error('Error installing MCP:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to install MCP: ' + (error as Error).message
    }, { status: 500 });
  }
}