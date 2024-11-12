// app/api/verifyclaims/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from "@ai-sdk/anthropic"
// import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {

    const { claim, original_text, exasources } = await req.json();

    if (!claim || !original_text || !exasources) {
      return NextResponse.json({ error: 'Claim and sources are required' }, { status: 400 });
    }

    console.log("Received claim:", claim);
    console.log("Received exasources:", exasources);

    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
    //   model: openai('gpt-4o'),
      prompt: 
    `You are an expert fact-checker. Given a claim and a set of sources, determine whether the claim is true or false based on the text from sources (or if there is insufficient information).
    
    For your analysis, consider all the sources collectively.

    Here is the Original part of the text: ${original_text}

    Here is the claim: ${claim}

    And here are the sources: ${exasources}

    Provide your answer as a JSON object with the following structure:
    {
        "claim": "...",
        "assessment": "True" or "False" or "Insufficient Information",
        "summary": "Why is this claim correct and if it isn't correct, then what's correct. In a single line.",
        "url_sources": [list of relevant urls from the above sources that support the decision],
        "fixed_original_text": "If the assessment is False then correct the original text (keeping everything as it is and just fix the fact in the part of the text)",
        "confidence_score": a percentage number between 0 and 100 (100 means fully confident that the decision you have made is correct, 0 means you are completely unsure),
    }
    
    Output the result as valid JSON, strictly adhering to the defined schema. Ensure there are no markdown codes or additional elements included in the output. Do not add anything else. Return only plain JSON.`,
    });

    return NextResponse.json({ claims: text });
  } catch (error) {
    return NextResponse.json({ error: `Failed to extract claims | ${error}` }, { status: 500 });
  }
}
