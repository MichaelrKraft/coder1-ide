import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Component storage directory
const COMPONENTS_DIR = path.join(process.cwd(), 'data', 'captured-components');

// Initialize storage directory
async function initializeStorage() {
  try {
    await fs.mkdir(COMPONENTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to initialize component storage:', error);
  }
}

// Load all components from disk
async function loadComponents() {
  await initializeStorage();
  
  try {
    const files = await fs.readdir(COMPONENTS_DIR);
    const components = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(COMPONENTS_DIR, file), 'utf-8');
          const component = JSON.parse(data);
          components.push(component);
        } catch (error) {
          console.error(`Failed to load component ${file}:`, error);
        }
      }
    }
    
    return components;
  } catch (error) {
    console.error('Failed to load components:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const components = await loadComponents();
    
    // Return minimal component data for list view
    const componentList = components.map(c => ({
      id: c.id,
      title: c.title,
      url: c.url,
      timestamp: c.timestamp,
      tags: c.tags || [],
      category: c.category || 'uncategorized',
      hasScreenshot: !!c.screenshot,
      hasGeneratedCode: !!c.generatedCode
    }));
    
    return NextResponse.json({
      success: true,
      components: componentList,
      total: componentList.length
    });
  } catch (error) {
    console.error('Error listing components:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list components' },
      { status: 500 }
    );
  }
}