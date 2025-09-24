/**
 * Component Formatter Utility
 * Formats captured components into complete HTML documents for preview
 */

interface ComponentData {
  id: string;
  title: string;
  html: string;
  css: string;
  url?: string;
  timestamp?: string;
}

/**
 * Format a captured component into a complete HTML document
 * suitable for the Monaco editor and preview panel
 */
export function formatComponentForEditor(component: ComponentData): string {
  const { title, html, css, url } = component;
  
  // Create a complete HTML document with embedded styles
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    ${url ? `<!-- Source: ${escapeHtml(url)} -->` : ''}
    <style>
        /* Reset styles for isolated preview */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            padding: 20px;
        }
        
        /* Component styles */
        ${css}
    </style>
</head>
<body>
    <!-- Captured Component -->
    ${html}
</body>
</html>`;
}

/**
 * Format component for React export
 */
export function formatComponentForReact(component: ComponentData): string {
  const { title, html, css } = component;
  const componentName = toPascalCase(title);
  
  return `import React from 'react';
import './Component.css';

const ${componentName} = () => {
    return (
        <>
            ${convertHtmlToJsx(html)}
        </>
    );
};

export default ${componentName};

/* Component.css */
${css}`;
}

/**
 * Format component for Vue export
 */
export function formatComponentForVue(component: ComponentData): string {
  const { title, html, css } = component;
  
  return `<template>
    ${html}
</template>

<script>
export default {
    name: '${toPascalCase(title)}'
}
</script>

<style scoped>
${css}
</style>`;
}

/**
 * Helper function to escape HTML for safe display
 */
function escapeHtml(text: string): string {
  // Always use the safe string replacement approach
  // to avoid server-side rendering issues
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert string to PascalCase for component names
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, chr => chr.toUpperCase());
}

/**
 * Basic HTML to JSX conversion (simplified)
 */
function convertHtmlToJsx(html: string): string {
  return html
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<(\w+)([^>]*?)\/>/g, '<$1$2 />')  // Self-closing tags
    .replace(/style="([^"]*)"/g, (_, styles) => {
      // Convert inline styles to React format (basic conversion)
      const styleObj = styles
        .split(';')
        .filter((s: string) => s.trim())
        .map((s: string) => {
          const [prop, value] = s.split(':').map((x: string) => x.trim());
          const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
          return `${camelProp}: '${value}'`;
        })
        .join(', ');
      return `style={{${styleObj}}}`;
    });
}

/**
 * Load a component from the filesystem and format it for the editor
 */
export async function loadComponentForEditor(componentId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/components-beta/component/${componentId}`);
    const data = await response.json();
    
    if (data.success && data.component) {
      return formatComponentForEditor(data.component);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load component:', error);
    return null;
  }
}