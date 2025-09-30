import { NextRequest, NextResponse } from 'next/server';

// Dynamic import for server-side only
let pdfParse: any;
if (typeof window === 'undefined') {
  try {
    pdfParse = require('pdf-parse');
  } catch (e) {
    console.warn('pdf-parse not available for PDF text extraction API');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if pdf-parse is available
    if (!pdfParse) {
      return NextResponse.json({
        success: false,
        error: 'PDF processing not available - pdf-parse library not found',
        text: 'PDF processing service is not available. Please manually copy and paste the text content.'
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Check if it's a PDF file
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({
        success: false,
        error: 'File is not a PDF'
      }, { status: 400 });
    }

    console.log(`📄 Server processing PDF: ${file.name} (${Math.round(file.size / 1024)}KB)`);

    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // Extract text using pdf-parse (server-side only)
      const pdfData = await pdfParse(buffer);
      
      if (pdfData.text && pdfData.text.trim().length > 0) {
        console.log(`✅ Server extracted ${pdfData.text.length} characters from ${file.name}`);
        
        return NextResponse.json({
          success: true,
          text: pdfData.text.trim(),
          pages: pdfData.numpages || 1,
          method: 'text-extraction',
          filename: file.name,
          size: file.size
        });
      } else {
        console.log(`⚠️ No extractable text found in ${file.name}`);
        
        return NextResponse.json({
          success: false,
          error: 'No extractable text found',
          text: `PDF file "${file.name}" contains no extractable text. This might be a scanned document or image-based PDF.`,
          pages: pdfData.numpages || 1,
          method: 'text-extraction'
        });
      }
      
    } catch (parseError) {
      console.error(`❌ PDF parsing failed for ${file.name}:`, parseError);
      
      return NextResponse.json({
        success: false,
        error: `PDF parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        text: `PDF file "${file.name}" could not be parsed. The file might be corrupted, password-protected, or in an unsupported format.`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ PDF extraction API error:', error);
    
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      text: 'PDF processing failed due to a server error. Please try again or manually copy the text content.'
    }, { status: 500 });
  }
}