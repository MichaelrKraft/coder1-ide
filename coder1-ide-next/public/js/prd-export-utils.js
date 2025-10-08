/**
 * PRD Export Utilities
 * 
 * Provides PDF and JSON export functionality for generated PRDs
 * Integrates with existing smart-prd-generator.js
 */

/**
 * Export PRD as PDF
 * @param {string} prdContent - Markdown content of the PRD
 * @param {string} [filename] - Optional custom filename
 */
function exportAsPDF(prdContent, filename = null) {
  try {
    // Check if jsPDF is loaded
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error('jsPDF library not loaded');
      alert('PDF export library not available. Please refresh the page.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // PDF configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);
    
    // Convert markdown to plain text (simple conversion)
    let plainText = prdContent
      .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code backticks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links
    
    // Split text into lines that fit page width
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(plainText, maxWidth);
    
    let y = margin;
    
    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Product Requirements Document', margin, y);
    y += 10;
    
    // Add timestamp
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 10;
    
    // Add content
    doc.setFontSize(10);
    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });
    
    // Generate filename
    const finalFilename = filename || `PRD_${Date.now()}.pdf`;
    
    // Save PDF
    doc.save(finalFilename);
    
    console.log('PDF exported successfully:', finalFilename);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Failed to export PDF. Please try again.');
  }
}

/**
 * Export PRD as JSON
 * @param {string} prdContent - Markdown content of the PRD
 * @param {Object} answers - User's answers to questionnaire
 * @param {Array} selectedPatterns - Selected startup patterns
 * @param {string} selectedMode - 'quick' or 'professional'
 * @param {string} [filename] - Optional custom filename
 */
function exportAsJSON(prdContent, answers = {}, selectedPatterns = [], selectedMode = null, filename = null) {
  try {
    // Create comprehensive JSON structure
    const data = {
      version: '2.0',
      generator: 'Coder1 Smart PRD Generator',
      generatedAt: new Date().toISOString(),
      mode: selectedMode || 'unknown',
      selectedPatterns: selectedPatterns,
      answers: answers,
      prd: {
        markdown: prdContent,
        format: 'markdown'
      },
      metadata: {
        exportFormat: 'json',
        wordCount: prdContent.split(/\s+/).length,
        charCount: prdContent.length,
        sectionCount: (prdContent.match(/^##\s+/gm) || []).length
      }
    };
    
    // Convert to JSON with pretty printing
    const jsonString = JSON.stringify(data, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `PRD_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('JSON exported successfully:', a.download);
    
  } catch (error) {
    console.error('Error exporting JSON:', error);
    alert('Failed to export JSON. Please try again.');
  }
}

/**
 * Export PRD as Markdown (existing functionality wrapper)
 * @param {string} prdContent - Markdown content of the PRD
 * @param {string} [filename] - Optional custom filename
 */
function exportAsMarkdown(prdContent, filename = null) {
  try {
    const blob = new Blob([prdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `PRD_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Markdown exported successfully:', a.download);
    
  } catch (error) {
    console.error('Error exporting Markdown:', error);
    alert('Failed to export Markdown. Please try again.');
  }
}

// Make functions globally available
window.PRDExportUtils = {
  exportAsPDF,
  exportAsJSON,
  exportAsMarkdown
};
