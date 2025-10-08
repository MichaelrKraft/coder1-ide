/**
 * Example PRDs Module
 * 
 * Manages display and interaction with example PRD documents
 */

const EXAMPLE_PRDS = [
  {
    id: 'saas-example',
    title: 'SaaS Platform Example',
    description: 'Team collaboration platform with real-time features',
    category: 'SaaS',
    file: '/examples/saas-example.md',
    tags: ['collaboration', 'real-time', 'team-management']
  },
  {
    id: 'mobile-app-example',
    title: 'Mobile App Example',
    description: 'AI-powered fitness coaching application',
    category: 'Mobile',
    file: '/examples/mobile-app-example.md',
    tags: ['mobile', 'ai', 'fitness', 'health']
  },
  {
    id: 'ecommerce-example',
    title: 'E-commerce Platform Example',
    description: 'Sustainable fashion marketplace with AI verification',
    category: 'E-commerce',
    file: '/examples/ecommerce-example.md',
    tags: ['ecommerce', 'sustainability', 'marketplace']
  }
];

/**
 * Show the example PRDs modal
 */
async function showExamplePRDs() {
  // Create modal HTML
  const modalHTML = `
    <div id="examples-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <!-- Header -->
        <div class="bg-gradient-to-r from-primary to-secondary p-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl font-bold">Example PRD Documents</h3>
              <p class="text-white/80 mt-1">Explore comprehensive PRD examples from different industries</p>
            </div>
            <button onclick="closeExamplePRDs()" class="text-white hover:text-gray-200 transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div class="grid md:grid-cols-3 gap-4">
            ${EXAMPLE_PRDS.map(example => `
              <div class="pattern-card bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-lg transition-all" onclick="viewExamplePRD('${example.id}')">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold px-3 py-1 rounded-full bg-primary text-white">
                    ${example.category}
                  </span>
                </div>
                <h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">${example.title}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">${example.description}</p>
                <div class="flex flex-wrap gap-2">
                  ${example.tags.map(tag => `
                    <span class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                      ${tag}
                    </span>
                  `).join('')}
                </div>
                <div class="mt-4 text-primary hover:text-secondary transition text-sm font-medium">
                  View Example →
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Close the example PRDs modal
 */
function closeExamplePRDs() {
  const modal = document.getElementById('examples-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * View a specific example PRD
 */
async function viewExamplePRD(exampleId) {
  const example = EXAMPLE_PRDS.find(ex => ex.id === exampleId);
  if (!example) {
    console.error('Example not found:', exampleId);
    return;
  }
  
  try {
    // Show loading state
    const loadingHTML = `
      <div id="example-viewer-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div class="p-8 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-gray-600 dark:text-gray-300">Loading example PRD...</p>
          </div>
        </div>
      </div>
    `;
    
    // Close examples modal and show viewer
    closeExamplePRDs();
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    
    // Fetch the example content
    const response = await fetch(example.file);
    const content = await response.text();
    
    // Create viewer modal
    const viewerHTML = `
      <div id="example-viewer-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
          <!-- Header -->
          <div class="bg-gradient-to-r from-primary to-secondary p-6 text-white flex-shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold">${example.title}</h3>
                <p class="text-white/80 mt-1">${example.description}</p>
              </div>
              <button onclick="closeExampleViewer()" class="text-white hover:text-gray-200 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Content -->
          <div class="p-8 overflow-y-auto flex-1">
            <div class="prose prose-lg max-w-none dark:prose-invert">
              <pre class="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200">${content}</pre>
            </div>
          </div>
          
          <!-- Footer Actions -->
          <div class="p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex gap-3 flex-shrink-0">
            <button onclick="downloadExample('${example.id}')" class="flex-1 bg-gradient-to-r from-accent to-green-400 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition">
              📄 Download This Example
            </button>
            <button onclick="closeExampleViewer(); showExamplePRDs();" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition">
              ← Back to Examples
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Replace loading with viewer
    document.getElementById('example-viewer-modal').remove();
    document.body.insertAdjacentHTML('beforeend', viewerHTML);
    
  } catch (error) {
    console.error('Error loading example:', error);
    closeExampleViewer();
    alert('Failed to load example PRD. Please try again.');
  }
}

/**
 * Close the example viewer modal
 */
function closeExampleViewer() {
  const modal = document.getElementById('example-viewer-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Download an example PRD
 */
async function downloadExample(exampleId) {
  const example = EXAMPLE_PRDS.find(ex => ex.id === exampleId);
  if (!example) return;
  
  try {
    const response = await fetch(example.file);
    const content = await response.text();
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${example.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error downloading example:', error);
    alert('Failed to download example. Please try again.');
  }
}

// Make functions globally available
window.showExamplePRDs = showExamplePRDs;
window.closeExamplePRDs = closeExamplePRDs;
window.viewExamplePRD = viewExamplePRD;
window.closeExampleViewer = closeExampleViewer;
window.downloadExample = downloadExample;
