import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

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

export async function POST(request: NextRequest) {
  try {
    await initializeStorage();
    
    const body = await request.json();
    const { html, css, url, title, selector, screenshot, loadIntoEditor } = body;
    
    // Validate required fields
    if (!html || !css) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: html and css' },
        { status: 400 }
      );
    }
    
    // Generate unique ID
    const id = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();
    
    // Create component object
    const component = {
      id,
      title: title || 'Untitled Component',
      url: url || 'Unknown',
      selector: selector || 'body',
      html,
      css,
      screenshot: screenshot || null,
      timestamp,
      tags: [],
      category: 'uncategorized',
      framework: 'vanilla',
      generatedCode: null
    };
    
    // Save to disk
    const componentPath = path.join(COMPONENTS_DIR, `${id}.json`);
    await fs.writeFile(componentPath, JSON.stringify(component, null, 2));
    
    console.log(`✅ Saved component ${id}: ${component.title}`);
    
    // Prepare response
    const response: any = {
      success: true,
      id,
      message: 'Component captured successfully'
    };
    
    // If Chrome extension wants to load into editor, add redirect URL
    if (loadIntoEditor) {
      response.redirectUrl = `/ide?loadComponent=${id}`;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error saving component:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save component' },
      { status: 500 }
    );
  }
}