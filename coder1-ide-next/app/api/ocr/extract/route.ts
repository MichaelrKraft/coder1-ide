import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(request: Request) {
  try {
    const { base64, mimeType } = await request.json();

    if (!base64 || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: base64, mimeType' },
        { status: 400 }
      );
    }

    console.log('🔤 Starting OCR extraction...');

    // Create data URL for Tesseract
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Perform OCR
    const result = await Tesseract.recognize(
      dataUrl,
      'eng', // English language
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    console.log(`✅ OCR complete: ${text.length} characters, ${Math.round(confidence)}% confidence`);

    return NextResponse.json({
      success: true,
      text,
      confidence,
      wordCount: result.data.words?.length || 0
    });

  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    return NextResponse.json(
      { error: 'OCR extraction failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
