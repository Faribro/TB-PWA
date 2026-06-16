import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse-fork';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await pdfParse(buffer);

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const chunks = chunkText(parsed.text, 500);

    if (typeof global !== 'undefined') {
      if (!(global as any).pdfDocuments) {
        (global as any).pdfDocuments = new Map();
      }
      (global as any).pdfDocuments.set(docId, {
        id: docId,
        title: formData.get('title') || file.name,
        author: formData.get('author') || 'Unknown',
        content: parsed.text,
        chunks: chunks,
        pages: parsed.numpages,
        uploadedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      docId,
      title: file.name,
      pages: parsed.numpages,
      chunks: chunks.length,
      preview: parsed.text.substring(0, 200) + '...',
    });

  } catch (error: any) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF', details: error.message },
      { status: 500 }
    );
  }
}

function chunkText(text: string, wordsPerChunk = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  
  return chunks;
}

export async function GET() {
  if (typeof global !== 'undefined' && (global as any).pdfDocuments) {
    const docs = Array.from((global as any).pdfDocuments.values()).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      author: doc.author,
      pages: doc.pages,
      chunks: doc.chunks.length,
      uploadedAt: doc.uploadedAt,
    }));
    return NextResponse.json({ documents: docs });
  }
  return NextResponse.json({ documents: [] });
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    if (typeof global !== 'undefined' && (global as any).pdfDocuments) {
      const deleted = (global as any).pdfDocuments.delete(docId);
      
      if (deleted) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'No documents found' }, { status: 404 });
  } catch (error: any) {
    console.error('PDF delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete PDF', details: error.message },
      { status: 500 }
    );
  }
}
