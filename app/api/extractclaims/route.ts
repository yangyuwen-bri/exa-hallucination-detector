// app/api/extractclaims/route.ts (最终完美版)
import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // 1. 使用带有详细描述的 Zod Schema
    const claimsSchema = z.object({
      claims: z.array(z.object({
        claim: z.string().describe("The extracted verifiable statement."),
        original_text: z.string().describe("The portion of the original text that contains the claim."),
      })).describe("An array of all claims extracted from the text."),
    });

    // 2. 使用 generateObject 保证输出可靠性
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: claimsSchema, 
      // 3. 使用原始的、详细的英文 Prompt 来保证任务质量
      prompt: 
      `You are an expert at extracting claims from text.
      Your task is to identify and list all claims present, true or false, in the given text. Each claim should be a verifiable statement.
      
      If the input content is very lengthy, then pick the major claims.
      Don't repeat the same claim.

      For each claim, also provide the original part of the sentence from which the claim is derived.
      Present the claims as a JSON object that strictly follows the provided schema.
      
      Here is the content: ${content}
      `,
    });

    return NextResponse.json(object); 

  } catch (error) {
    console.error('Extract claims API error:', error);
    return NextResponse.json({ error: `Failed to extract claims | ${error}` }, { status: 500 });
  }
}
