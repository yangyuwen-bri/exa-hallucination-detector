"use client";

import Link from "next/link";
import { useState, FormEvent, useRef, useEffect } from "react";
import ClaimsListResults from "./ClaimsListResult";
import LoadingMessages from "./ui/LoadingMessages";
import ArticleDisplay from "./PreviewBox";
import PreviewBox from "./PreviewBox";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Claim {
    claim: string;
    original_text: string;
}

export default function FactChecker() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState<any[]>([]);
  const [articleContent, setArticleContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAllClaims, setShowAllClaims] = useState(false);

  // Function to adjust textarea height
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '150px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
    }
  };

  // Adjust height when content changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [articleContent]);

  // Extract claims function
  const extractClaims = async (content: string) => {
    const response = await fetch('/api/extractclaims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to extract claims.');
    }
  
    const data = await response.json();
    return Array.isArray(data.claims) ? data.claims : JSON.parse(data.claims);
  };
  
  // ExaSearch function
  const exaSearch = async (claim: string) => {
    console.log(`Claim recieved in exa search: ${claim}`);

    const response = await fetch('/api/exasearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claim }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch verification for claim.');
    }

    const data = await response.json();
    return data.results;
  };

  // Verify claims function
  const verifyClaim = async (claim: string, original_text: string, exasources: any) => {
    const response = await fetch('/api/verifyclaims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claim, original_text, exasources }),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify claim.');
    }
  
    const data = await response.json();
    console.log("VerifyClaim raw response:", data.claims);
  
    const rawText = data.claims.replace(/```json\n|```/g, '');
    const parsedData = JSON.parse(rawText);
  
    console.log("Parsed verifyClaim response:", parsedData);
  
    return parsedData;
  };
   
  // Fact check function
  const factCheck = async (e: FormEvent) => {
    e.preventDefault();
  
    if (!articleContent) {
      setError("Please enter some content or try with sample blog.");
      return;
    }

    if (articleContent.length < 50) {
      setError("Too short. Please enter at least 50 characters.");
      return;
    }
  
    setIsGenerating(true);
    setError(null);
    setFactCheckResults([]);
  
    try {
      const claims = await extractClaims(articleContent);
      const finalResults = await Promise.all(
        claims.map(async ({ claim, original_text }: Claim) => {
          try {
            const exaSources = await exaSearch(claim);
            const verifiedClaim = await verifyClaim(claim, original_text, exaSources);
            return { ...verifiedClaim, original_text };
          } catch (error) {
            console.error(`Failed to verify claim: ${claim}`, error);
            return null;
          }
        })
      );
  
      setFactCheckResults(finalResults.filter(result => result !== null));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      setFactCheckResults([]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Sample blog content
  const sampleBlog = `The Eiffel Tower, a remarkable iron lattice structure standing proudly in Paris, was originally built as a giant sundial in 1822, intended to cast shadows across the city to mark the hours. Designed by the renowned architect Gustave Eiffel, the tower stands 324 meters tall and once housed the city's first observatory.\n\nWhile it's famously known for hosting over 7 million visitors annually, it was initially disliked by Parisians. Interestingly, the Eiffel Tower was briefly used as a lighthouse to guide ships along the Seine during cloudy nights.`;

  // Load sample content function
  const loadSampleContent = () => {
    setArticleContent(sampleBlog);
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-screen z-0">
      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl p-6 mx-auto">
        <div className="text-left">
          <h1 className="md:text-6xl text-4xl pb-5 font-medium opacity-0 animate-fade-up [animation-delay:200ms]">
            Fact Check Your
            <span className="text-brand-default"> Blogs & Articles </span>
            Instantly
          </h1>

          <p className="text-gray-800 mb-12 opacity-0 animate-fade-up [animation-delay:400ms]">
            We verify all your facts with real sources, so you can publish your blogs and articles with confidence.
          </p>
        </div>
    
        <form onSubmit={factCheck} className="space-y-4 w-full mb-14">
          <textarea
            ref={textareaRef}
            value={articleContent}
            onChange={(e) => setArticleContent(e.target.value)}
            placeholder="Enter Your Blog or Article Content"
            className="w-full bg-white p-3 border box-border outline-none rounded-none ring-2 ring-brand-default resize-none min-h-[150px] max-h-[250px] overflow-auto opacity-0 animate-fade-up [animation-delay:600ms] transition-[height] duration-200 ease-in-out"
          />

          <div className="pb-5 opacity-0 animate-fade-up [animation-delay:800ms]">
            <button
              onClick={loadSampleContent}
              className="text-brand-default hover:underline cursor-pointer"
            >
              Try with a sample blog
            </button>
          </div>

          <button
            type="submit"
            className={`w-full bg-brand-default text-white font-semibold px-2 py-2 rounded-none transition-opacity opacity-0 animate-fade-up [animation-delay:1000ms] min-h-[50px] ring-2 ring-brand-default ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isGenerating}
          >
            {isGenerating ? 'Fact Checking...' : 'Fact Check Now'}
          </button>
        </form>

        {isGenerating && <LoadingMessages isGenerating={isGenerating} />}

        {error && (
          <div className="mt-4 mb-14 p-3 bg-red-100 border border-red-400 text-red-700 rounded-none">
            {error}
          </div>
        )}

        {factCheckResults.length > 0 && (
        <div className="space-y-14 mb-32">
            <PreviewBox
            content={articleContent}
            claims={factCheckResults}
            />
            <div className="mt-8">
                <button
                onClick={() => setShowAllClaims(!showAllClaims)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                {showAllClaims ? (
                    <>
                    <span>Show Less Claims</span>
                    <ChevronUp size={20} />
                    </>
                ) : (
                    <>
                    <span>Show All Claims</span>
                    <ChevronDown size={20} />
                    </>
                )}
                </button>

                {/* Claims List */}
                {showAllClaims && (
                <div>
                    <ClaimsListResults results={factCheckResults} />
                </div>
                )}
            </div>
        </div>
        )}


      </main>
  
      <footer className="w-full py-6 mb-6 mt-auto opacity-0 animate-fade-up [animation-delay:1200ms]">
        <div className="max-w-md mx-auto">
          <p className="text-sm text-center text-gray-600">
            this opensource project is built on {" "}
            <Link 
              href="https://exa.ai" 
              target="_blank"
              className="font-bold hover:underline cursor-pointer"
            >
              Exa - the search engine for AIs
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}