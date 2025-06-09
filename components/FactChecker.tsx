"use client";

import Link from "next/link";
import { useState, FormEvent, useRef, useEffect } from "react";
import ClaimsListResults from "./ClaimsListResult";
import LoadingMessages from "./ui/LoadingMessages";
import PreviewBox from "./PreviewBox";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import AnimatedGradientText from "./ui/animated-gradient-text";
import ShareButtons from "./ui/ShareButtons";
import { getAssetPath } from "@/lib/utils";

// 原始声明的类型
interface Claim {
    claim: string;
    original_text: string;
}

// 成功验证后的结果类型
type FactCheckResponse = {
  claim: string;
  assessment: "True" | "False" | "Insufficient Information";
  summary: string;
  fixed_original_text: string;
  confidence_score: number;
  url_sources?: string[];
};

// 用于跟踪每条声明处理状态的类型
export interface ProcessedClaim {
  claim: string;
  original_text: string;
  status: 'pending' | 'success' | 'error';
  result?: FactCheckResponse; // 成功时有值
  error?: string; // 失败时有值
}

export default function FactChecker() {
  // 1. 正确的状态管理
  const [isGenerating, setIsGenerating] = useState(false);
  const [processedClaims, setProcessedClaims] = useState<ProcessedClaim[]>([]);
  const [articleContent, setArticleContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAllClaims, setShowAllClaims] = useState(true);
  const loadingRef = useRef<HTMLDivElement>(null);

  // --- 所有辅助函数和 useEffects (保持不变) ---
  const scrollToLoading = () => {
    loadingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isGenerating) {
      scrollToLoading();
    }
  }, [isGenerating]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '150px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [articleContent]);

  const extractClaims = async (content: string) => {
    const response = await fetch(getAssetPath('/api/extractclaims'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to extract claims.'); }
    const data = await response.json();
    // 适配 generateObject 返回的 { claims: [...] } 结构
    return data.claims || [];
  };
  
  const exaSearch = async (claim: string) => {
    console.log(`Claim recieved in exa search: ${claim}`);
    const response = await fetch(getAssetPath('/api/exasearch'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim }) });
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to fetch verification for claim.'); }
    return await response.json();
  };

  const verifyClaim = async (claim: string, original_text: string, exasources: any) => {
    const response = await fetch(getAssetPath('/api/verifyclaims'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim, original_text, exasources }) });
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to verify claim.'); }
    const data = await response.json();
    console.log("VerifyClaim response:", data.claims);
    return data.claims as FactCheckResponse;
  };
   
  // 2. 修复后的 factCheck 函数
  const factCheck = async (e: FormEvent) => {
    e.preventDefault();
    if (!articleContent) { setError("Please enter some content or try with sample blog."); return; }
    if (articleContent.length < 50) { setError("Too short. Please enter at least 50 characters."); return; }
  
    setIsGenerating(true);
    setError(null);
    setProcessedClaims([]);
  
    try {
      const claims: Claim[] = await extractClaims(articleContent);
      const initialClaims: ProcessedClaim[] = claims.map(c => ({ ...c, status: 'pending' }));
      setProcessedClaims(initialClaims);
  
      for (let i = 0; i < claims.length; i++) {
        const currentClaim = claims[i];
        try {
          const exaSources = await exaSearch(currentClaim.claim);
          if (!exaSources?.results?.length) { throw new Error("Could not find relevant sources."); }
          const sourceUrls = exaSources.results.map((result: { url: any; }) => result.url);
          const verifiedClaim = await verifyClaim(currentClaim.claim, currentClaim.original_text, exaSources.results);
          
          setProcessedClaims(prevClaims => {
            const newClaims = [...prevClaims];
            newClaims[i] = { ...currentClaim, status: 'success', result: { ...verifiedClaim, url_sources: sourceUrls } };
            return newClaims;
          });
        } catch (error) {
          console.error(`Failed to verify claim: ${currentClaim.claim}`, error);
          setProcessedClaims(prevClaims => {
            const newClaims = [...prevClaims];
            newClaims[i] = { ...currentClaim, status: 'error', error: error instanceof Error ? error.message : "An unknown error occurred" };
            return newClaims;
          });
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred during claim extraction.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sampleBlog = `The Eiffel Tower, a remarkable iron lattice structure standing proudly in Paris, was originally built as a giant sundial in 1822, intended to cast shadows across the city to mark the hours. Designed by the renowned architect Gustave Eiffel, the tower stands 330 meters tall and once housed the city's first observatory.\n\nWhile it's famously known for hosting over 7 million visitors annually, it was initially disliked by Parisians. Interestingly, the Eiffel Tower was used as to guide ships along the Seine during cloudy nights.`;

  const loadSampleContent = () => {
    setArticleContent(sampleBlog);
    setError(null);
  };

  // 3. 恢复了原始的UI结构，并移除了导致白屏的动画类
  return (
    <div className="flex flex-col min-h-screen z-0">
        {/* Badge positioned at the top */}
      <div className="w-full flex justify-center pt-10">
        <Link href="https://exa.ai/" target="_blank">
          <AnimatedGradientText>
          <img 
            src={getAssetPath('/exaicon.png')} 
            alt="exa logo" 
            className="w-5 h-5 inline-block mr-2" 
          />
            <span className="inline animate-gradient bg-gradient-to-r from-[#254bf1] via-purple-600 to-[#254bf1] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
              Built on Exa - Search Engine for AI
            </span>
            <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
          </AnimatedGradientText>
        </Link>
      </div>

      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-6xl md:max-w-4xl p-6">
        <div className="text-left">
          <h1 className="md:text-6xl text-4xl pb-5 font-medium">
            Detect LLM 
            <span className="text-brand-default"> Hallucinations </span>
          </h1>

          <p className="text-gray-800 mb-12">
            Verify your content with real web data.
          </p>
        </div>
    
        <form onSubmit={factCheck} className="space-y-6 w-full mb-10">
          <textarea
            ref={textareaRef}
            value={articleContent}
            onChange={(e) => setArticleContent(e.target.value)}
            placeholder="Enter Your Content"
            className="w-full bg-white p-3 border box-border outline-none rounded-none ring-2 ring-brand-default resize-none min-h-[150px] max-h-[250px] overflow-auto transition-[height] duration-200 ease-in-out"
          />

          <div className="pb-5">
            <button
              type="button" // Important: change to type="button" to prevent form submission
              onClick={loadSampleContent}
              disabled={isGenerating}
              className={`px-3 py-2 border-2 border-brand-default text-brand-default font-semibold rounded-none hover:bg-brand-default hover:text-white transition-all ${
                isGenerating ? 'cursor-not-allowed' : ''
              }`}
            >
              Try with a sample blog post
            </button>
          </div>

          <button
            type="submit"
            className={`w-full text-white mb-10 font-semibold px-2 py-2 rounded-none min-h-[50px] ${
              isGenerating ? 'bg-gray-400' : 'bg-brand-default ring-2 ring-brand-default'
            } transition-colors`}
            disabled={isGenerating}
          >
            {isGenerating ? 'Detecting Hallucinations...' : 'Detect Hallucinations'}
          </button>
        </form>

        {isGenerating && (
            <div ref={loadingRef} className="w-full">
              {processedClaims.length > 0 ? (
                <ClaimsListResults results={processedClaims} />
              ) : (
                <LoadingMessages isGenerating={isGenerating} />
              )}
            </div>
        )}

        {error && (
          <div className="mt-1 mb-14 p-3 bg-red-100 border border-red-400 text-red-700 rounded-none">
            {error}
          </div>
        )}

        {!isGenerating && processedClaims.length > 0 && (
        <div className="space-y-14 mt-5 mb-32">
            <PreviewBox
              content={articleContent}
              claims={
                processedClaims
                  .filter(p => p.status === 'success' && p.result)
                  .map(p => ({
                    ...p.result!,
                    original_text: p.original_text
                  }))
              }
            />
            <div className="mt-4 pt-12">
                <button
                onClick={() => setShowAllClaims(!showAllClaims)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                {showAllClaims ? (
                    <>
                    <span>Hide Claims</span>
                    <ChevronUp size={20} />
                    </>
                ) : (
                    <>
                    <span>Show All Claims</span>
                    <ChevronDown size={20} />
                    </>
                )}
                </button>

                {showAllClaims && (
                  <div>
                      <ClaimsListResults results={processedClaims} />
                  </div>
                )}
            </div>
            <ShareButtons />
        </div>
        )}
      </main>
  
      <footer className="w-full py-6 px-8 mb-6 mt-auto">
        <div className="max-w-md mx-auto">
          <p className="text-md text-center text-gray-600">
            <Link 
              href="https://dashboard.exa.ai" 
              target="_blank"
              className="underline cursor-pointer hover:text-gray-800"
            >
              Try Exa API
            </Link>
            <span className="mx-3">|</span>
            <Link 
              href="https://github.com/exa-labs/exa-hallucination-detector" 
              target="_blank"
              className="underline cursor-pointer hover:text-gray-800"
            >
              Project Code
            </Link>
            <span className="mx-3">|</span>
            <Link 
              href="https://exa.ai/demos" 
              target="_blank"
              className="underline cursor-pointer hover:text-gray-800"
            >
              See More Demo Apps
            </Link>
            <span className="mx-3">|</span>
            <Link 
              href="https://docs.exa.ai/examples/demo-hallucination-detector" 
              target="_blank"
              className="underline cursor-pointer hover:text-gray-800"
            >
              Tutorial
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
