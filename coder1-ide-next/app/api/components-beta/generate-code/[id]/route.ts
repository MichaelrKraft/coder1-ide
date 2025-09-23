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

// Save component updates
async function saveComponent(id: string, component: any) {
  try {
    const componentPath = path.join(COMPONENTS_DIR, `${id}.json`);
    await fs.writeFile(componentPath, JSON.stringify(component, null, 2));
    return true;
  } catch (error) {
    console.error(`Failed to save component ${id}:`, error);
    return false;
  }
}

// Generate framework-specific code
function generateFrameworkCode(component: any, framework: string): string {
  if (framework === 'react') {
    return `import React from 'react';
import './Component.css';

const CapturedComponent = () => {
    return (
        <div className="captured-component">
            ${component.html || ''}
        </div>
    );
};

export default CapturedComponent;

/* CSS (Component.css) */
${component.css || ''}
`;
  } else if (framework === 'vue') {
    return `<template>
    <div class="captured-component">
        ${component.html || ''}
    </div>
</template>

<script>
export default {
    name: 'CapturedComponent'
}
</script>

<style scoped>
${component.css || ''}
</style>
`;
  } else {
    // Vanilla HTML/CSS/JS
    return `<!-- HTML -->
${component.html || ''}

<!-- CSS -->
<style>
${component.css || ''}
</style>
`;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { framework = 'react' } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Component ID is required' },
        { status: 400 }
      );
    }
    
    // Validate framework
    const validFrameworks = ['react', 'vue', 'vanilla'];
    if (!validFrameworks.includes(framework)) {
      return NextResponse.json(
        { success: false, error: 'Invalid framework. Supported: react, vue, vanilla' },
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
    
    // Generate code for the requested framework
    const generatedCode = generateFrameworkCode(component, framework);
    
    // Save generated code to component
    if (!component.generatedCode) {
      component.generatedCode = {};
    }
    component.generatedCode[framework] = generatedCode;
    
    // Persist update
    const saved = await saveComponent(id, component);
    
    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Failed to save generated code' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      code: generatedCode,
      framework
    });
  } catch (error) {
    console.error('Error generating code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate code' },
      { status: 500 }
    );
  }
}