// app/api/extractclaims/route.ts (终极防御版)
import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, TypeValidationError } from 'ai'; // 引入 AI_TypeValidationError
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const claimsSchema = z.object({
      claims: z.array(z.object({
        claim: z.string().describe("The extracted verifiable statement."),
        original_text: z.string().describe("The portion of the original text that contains the claim."),
      })).describe("An array of all claims extracted from the text."),
    });

    let object;

    try {
      // 1. 正常尝试使用 generateObject
      const result = await generateObject({
        model: anthropic('claude-3-5-haiku-20241022'),
        schema: claimsSchema, 
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
      object = result.object;

    } catch (error) {
      // 2. 捕获您遇到的这个特定的类型验证错误
      // Vercel AI SDK v3.2+ 的错误对象中会包含 value 属性
      const validationError = error as any; 
      if (validationError.name === 'AI_TypeValidationError' && validationError.value) {
        
        console.warn("AI_TypeValidationError caught. Attempting manual correction.");
        const receivedValue = validationError.value;

        // 3. 检查是否是我们预期的 "stringified array" 错误
        if (typeof receivedValue.claims === 'string') {
          console.log("Correcting stringified 'claims' array.");
          try {
            // 4. 手动修正：解析那个错误的字符串
            const claimsArray = JSON.parse(receivedValue.claims);
            // 重新构建正确的对象
            object = { claims: claimsArray };
          } catch (jsonError) {
            console.error("Manual JSON parsing also failed.", jsonError);
            throw error; // 如果手动修正也失败，则抛出原始错误
          }
        } else {
          throw error; // 如果是其他类型的验证错误，则抛出
        }
      } else {
        throw error; // 如果不是我们预期的验证错误，也直接抛出
      }
    }

    return NextResponse.json(object); 

  } catch (error) {
    console.error('Extract claims API error:', error);
    return NextResponse.json({ error: `Failed to extract claims | ${error}` }, { status: 500 });
  }
}
