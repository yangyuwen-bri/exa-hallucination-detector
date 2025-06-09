// app/api/extractclaims/route.ts (增强容错版)
import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from 'ai';

// This function can run for a maximum of 60 seconds
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt: 
      `You are an expert at extracting claims from text.
      Your task is to identify and list all claims present, true or false, in the given text. Each claim should be a verifiable statement.
      
      If the input content is very lengthy, then pick the major claims.
      Don't repeat the same claim.

      For each claim, also provide the original part of the sentence from which the claim is derived.
      Present the claims as a JSON array of objects. Each object should have two keys:
      - "claim": the extracted claim in a single verifiable statement.
      - "original_text": the portion of the original text that supports or contains the claim.
      
      Do not include any additional text or commentary.

      Here is the content: ${content}

      Return the output strictly as a JSON array of objects following this schema:
      [
        {
          "claim": "extracted claim here",
          "original_text": "original text portion here"
        },
        ...
      ]

      Output the result as valid JSON, strictly adhering to the defined schema. Ensure there are no markdown codes or additional elements included in the output. Do not add anything else. Return only JSON.
      `,
    });

    // --- 新增的、更健壮的解析逻辑 ---
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      // 如果直接解析失败，说明 LLM 可能返回了不标准的 JSON 或其他文本
      console.error("Failed to parse LLM output directly:", text);
      throw new Error(`Failed to parse LLM output as JSON. Raw text: ${text}`);
    }

    let claimsArray;

    // 检查解析后的数据是否是 { claims: ... } 的结构
    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData) && 'claims' in parsedData) {
      const claimsValue = parsedData.claims;
      
      if (Array.isArray(claimsValue)) {
        // 情况1: claims 的值已经是数组 (最理想情况)
        claimsArray = claimsValue;
      } else if (typeof claimsValue === 'string') {
        // 情况2: claims 的值是一个字符串，需要再次解析
        try {
          claimsArray = JSON.parse(claimsValue);
        } catch (e) {
          throw new Error(`The 'claims' property was a string but could not be parsed into an array. String value: ${claimsValue}`);
        }
      } else {
        throw new Error("The 'claims' property is not in a recognized format (array or parsable string).");
      }
    } else if (Array.isArray(parsedData)) {
      // 情况3: LLM 直接返回了数组，而不是包含 claims 键的对象
      claimsArray = parsedData;
    } else {
      throw new Error("LLM output was not in the expected format (object with a 'claims' property or an array).");
    }
    
    // 最终确保我们得到的是一个数组
    if (!Array.isArray(claimsArray)) {
      throw new Error(`Final processed data is not an array. Original LLM output: ${text}`);
    }

    // 始终以 { claims: [...] } 的格式返回给前端
    return NextResponse.json({ claims: claimsArray });

  } catch (error) {
    // 保持外层错误捕获不变
    return NextResponse.json({ error: `Failed to extract claims | ${error}` }, { status: 500 });
  }
}
