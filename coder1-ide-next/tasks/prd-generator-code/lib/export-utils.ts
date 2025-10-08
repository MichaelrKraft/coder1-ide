import jsPDF from 'jspdf';

/**
 * Export PRD as Markdown file
 */
export function exportAsMarkdown(prdContent: string, filename: string = 'prd.md') {
  const blob = new Blob([prdContent], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Export PRD as JSON file
 */
export function exportAsJSON(prdContent: string, answers: Record<string, string>, filename: string = 'prd.json') {
  const prdData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    answers,
    prd: prdContent,
    sections: parsePRDSections(prdContent)
  };

  const blob = new Blob([JSON.stringify(prdData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Export PRD as PDF file
 */
export function exportAsPDF(prdContent: string, filename: string = 'prd.pdf') {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // PDF styling
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxLineWidth = pageWidth - (margin * 2);
  
  let yPosition = margin;
  const lineHeight = 7;
  const fontSize = 11;
  const titleFontSize = 16;
  const sectionFontSize = 14;

  // Add title
  pdf.setFontSize(titleFontSize);
  pdf.setFont(undefined, 'bold');
  pdf.text('Product Requirements Document', margin, yPosition);
  yPosition += lineHeight * 2;

  // Add generation date
  pdf.setFontSize(fontSize - 1);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(100);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += lineHeight * 2;
  pdf.setTextColor(0);

  // Parse and add content
  const lines = prdContent.split('\n');
  
  for (const line of lines) {
    // Check if we need a new page
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    if (line.startsWith('# ')) {
      // Main title
      yPosition += lineHeight;
      pdf.setFontSize(titleFontSize);
      pdf.setFont(undefined, 'bold');
      const text = line.replace(/^#\s*/, '');
      pdf.text(text, margin, yPosition);
      yPosition += lineHeight * 1.5;
    } else if (line.startsWith('## ')) {
      // Section header
      yPosition += lineHeight;
      pdf.setFontSize(sectionFontSize);
      pdf.setFont(undefined, 'bold');
      const text = line.replace(/^##\s*/, '');
      pdf.text(text, margin, yPosition);
      yPosition += lineHeight * 1.2;
    } else if (line.startsWith('### ')) {
      // Subsection header
      yPosition += lineHeight * 0.5;
      pdf.setFontSize(fontSize + 1);
      pdf.setFont(undefined, 'bold');
      const text = line.replace(/^###\s*/, '');
      pdf.text(text, margin, yPosition);
      yPosition += lineHeight;
    } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
      // Bullet point
      pdf.setFontSize(fontSize);
      pdf.setFont(undefined, 'normal');
      const text = line.trim().replace(/^[-*]\s*/, '• ');
      const splitText = pdf.splitTextToSize(text, maxLineWidth - 5);
      pdf.text(splitText, margin + 5, yPosition);
      yPosition += lineHeight * splitText.length;
    } else if (line.trim()) {
      // Regular paragraph
      pdf.setFontSize(fontSize);
      pdf.setFont(undefined, 'normal');
      const splitText = pdf.splitTextToSize(line, maxLineWidth);
      pdf.text(splitText, margin, yPosition);
      yPosition += lineHeight * splitText.length;
    } else {
      // Empty line
      yPosition += lineHeight * 0.3;
    }
  }

  // Save the PDF
  pdf.save(filename);
}

/**
 * Helper: Parse PRD into sections
 */
function parsePRDSections(prdContent: string) {
  const sections = prdContent.split('\n## ').filter(s => s.trim());
  
  return sections.map(section => {
    const [title, ...content] = section.split('\n');
    return {
      title: title.replace(/^#\s*/, '').trim(),
      content: content.join('\n').trim()
    };
  });
}

/**
 * Helper: Download blob as file
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Coder1 IDE handoff URL
 */
export function generateCoder1HandoffURL(prdContent: string, answers: Record<string, string>): string {
  const coder1URL = process.env.NEXT_PUBLIC_CODER1_IDE_URL || 'https://coder1.dev/ide';
  
  // Encode PRD data
  const prdData = {
    source: 'prd-generator',
    timestamp: Date.now(),
    answers,
    prd: prdContent
  };

  // Base64 encode the PRD data
  const encoded = btoa(JSON.stringify(prdData));
  
  // Return URL with encoded PRD
  return `${coder1URL}?prd=${encodeURIComponent(encoded)}`;
}
