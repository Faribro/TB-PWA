import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEYS = [
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;

function getNextApiKey(): string | null {
  if (GEMINI_API_KEYS.length === 0) return null;
  const key = GEMINI_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key || null;
}

function createGoogleAI() {
  const apiKey = getNextApiKey();
  if (!apiKey) throw new Error('No Gemini API keys available');
  return createGoogleGenerativeAI({ apiKey });
}

// Simple semantic search using keyword matching and scoring
function findRelevantChunks(question: string, chunks: string[], topK = 5): string[] {
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const scored = chunks.map(chunk => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    
    // Score based on keyword matches
    questionWords.forEach(word => {
      const matches = (chunkLower.match(new RegExp(word, 'g')) || []).length;
      score += matches * 10;
    });
    
    // Bonus for exact phrase match
    if (chunkLower.includes(question.toLowerCase())) {
      score += 100;
    }
    
    return { chunk, score };
  });
  
  // Sort by score and return top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.chunk);
}

export async function POST(req: NextRequest) {
  try {
    const { question, docId } = await req.json();

    if (!question || !docId) {
      return NextResponse.json(
        { error: 'Missing question or docId' },
        { status: 400 }
      );
    }

    // Retrieve document from memory
    if (typeof global === 'undefined' || !(global as any).pdfDocuments) {
      return NextResponse.json(
        { error: 'No documents uploaded yet' },
        { status: 404 }
      );
    }

    const doc = (global as any).pdfDocuments.get(docId);
    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Find relevant chunks
    const relevantChunks = findRelevantChunks(question, doc.chunks, 5);
    const context = relevantChunks.join('\n\n---\n\n');

    const google = createGoogleAI();

    const SYSTEM_PROMPT = `You are GENIE, a warm and intelligent document assistant for the TB programme.

PERSONALITY:
- Speak naturally like a knowledgeable colleague, not a robot
- Use "Sir" naturally when appropriate
- Keep answers concise (2-3 sentences max)
- If the answer isn't in the document, say "This topic isn't covered in this document, Sir."
- Never make up information - only use what's in the document excerpts

RESPONSE STYLE:
- Conversational and warm
- Direct and actionable
- Reference specific sections when helpful`;

    const prompt = `DOCUMENT EXCERPTS FROM "${doc.title}":
${context}

USER QUESTION: ${question}

Answer based ONLY on the document excerpts above. Be conversational and helpful.`;

    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      system: SYSTEM_PROMPT,
      prompt: prompt,
    });

    return NextResponse.json({
      success: true,
      answer: text,
      docTitle: doc.title,
      chunksUsed: relevantChunks.length,
    });

  } catch (error: any) {
    console.error('PDF chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process question', details: error.message },
      { status: 500 }
    );
  }
}
