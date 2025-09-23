import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Component storage directory
const COMPONENTS_DIR = path.join(process.cwd(), 'data', 'captured-components');

// Load a specific component by ID
async function loadComponent(id: string) {
  try {
    const componentPath = path.join(COMPONENTS_DIR, `${id}.json`);
    const data = await fs.readFile(componentPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load component ${id}:`, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Component ID is required' },
        { status: 400 }
      );
    }
    
    const component = await loadComponent(id);
    
    if (!component) {
      return NextResponse.json(
        { success: false, error: 'Component not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      component
    });
  } catch (error) {
    console.error('Error retrieving component:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve component' },
      { status: 500 }
    );
  }
}