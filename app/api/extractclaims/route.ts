// app/api/extractclaims/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Run the prompt to extract claims
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: 
    `You are an expert at extracting claims from text.
    Your task is to identify and list all claims present, true or false, in the given text. Each claim should be a single, verifiable statement.
    Consider various forms of claims, including assertions, statistics, and quotes.
    Present the claims as a JSON array of strings, and do not include any additional text.
    
    Here is the content: ${content}
    
    Give me the JSON array of strings of the claims.`,
    });

    return NextResponse.json({ claims: text });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to extract claims' }, { status: 500 });
  }
}
