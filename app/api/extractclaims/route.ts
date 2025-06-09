// app/api/extractclaims/route.ts (最终优化版)
import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from 'ai'; // 1. 引入 generateObject
import { z } from 'zod';             // 2. 引入 zod 用于定义数据结构

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // 3. 定义我们期望从模型获得的 JSON 对象的结构
    const claimsSchema = z.object({
      claims: z.array(z.object({
        claim: z.string().describe("提取出的可验证声明"),
        original_text: z.string().describe("包含该声明的原始文本部分"),
      }))
    });

    // 4. 使用 generateObject 替代 generateText
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: claimsSchema, // 告诉模型需要遵循这个结构
      prompt: 
      `你是一位从文本中提取声明的专家。
      你的任务是识别并列出给定文本中所有真实的或错误的声明。每一条声明都应该是可以被验证的陈述句。
      
      如果输入内容很长，请挑选主要的声明。不要重复同一个声明。

      内容如下: ${content}
      `,
    });

    // 5. 直接返回结果对象，不再需要 JSON.parse()
    // 'object' 已经是一个经过验证的、格式正确的 JavaScript 对象
    return NextResponse.json(object); 

  } catch (error) {
    console.error('Extract claims API error:', error);
    return NextResponse.json({ error: `Failed to extract claims | ${error}` }, { status: 500 });
  }
}
