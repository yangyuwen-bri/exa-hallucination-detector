// app/api/exasearch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY as string);

export async function POST(req: NextRequest) {
  try {
    const { claim } = await req.json();
    if (!claim) {
      return NextResponse.json({ error: 'Claim is required' }, { status: 400 });
    }

    // Use Exa to search for content related to the claim
    const result = await exa.searchAndContents(
      `Query: ${claim} \nHere is a web page to help verify this claim:`,
      {
        type: "auto",
        numResults: 5,
        livecrawl: 'fallback',
        text: true,
      }
    );

    // Extract only url and text from each result
    const simplifiedResults = result.results.map((item: any) => ({
      url: item.url,
      text: item.text
    }));

    return NextResponse.json({ results: simplifiedResults });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 });
  }
}