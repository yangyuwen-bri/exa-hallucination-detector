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

// 新增：用于跟踪每条声明处理状态的类型
export interface ProcessedClaim {
  claim: string;
  original_text: string;
  status: 'pending' | 'success' | 'error';
  result?: FactCheckResponse; // 成功时有值
  error?: string; // 失败时有值
}

export default function FactChecker() {
  const [isGenerating, setIsGenerating] = useState(false);
  // 使用新的 state 来管理所有声明的状态
  const [processedClaims, setProcessedClaims] = useState<ProcessedClaim[]>([]);
  const [articleContent, setArticleContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAllClaims, setShowAllClaims] = useState(true);

  const loadingRef = useRef<HTMLDivElement>(null);

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

  // API 调用函数 (保持不变)
  const extractClaims = async (content: string) => {
    const response = await fetch(getAssetPath('/api/extractclaims'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to extract claims.'); }
    const data = await response.json();
    return Array.isArray(data.claims) ? data.claims : JSON.parse(data.claims);
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
   
  // **重构后的 factCheck 函数**
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
    setProcessedClaims([]);
  
    try {
      // 1. 提取所有声明
      const claims: Claim[] = await extractClaims(articleContent);
  
      // 2. 初始化所有声明的状态为 'pending' 并更新UI，让用户看到即将处理的列表
      const initialClaims: ProcessedClaim[] = claims.map(c => ({
        ...c,
        status: 'pending',
      }));
      setProcessedClaims(initialClaims);
  
      // 3. 逐条处理声明
      for (let i = 0; i < claims.length; i++) {
        const currentClaim = claims[i];
        try {
          const exaSources = await exaSearch(currentClaim.claim);
          if (!exaSources?.results?.length) {
            throw new Error("Could not find relevant sources.");
          }
          const sourceUrls = exaSources.results.map((result: { url: any; }) => result.url);
          const verifiedClaim = await verifyClaim(currentClaim.claim, currentClaim.original_text, exaSources.results);
          
          // 4. 处理成功: 更新对应声明的状态为 'success'
          setProcessedClaims(prevClaims => {
            const newClaims = [...prevClaims];
            newClaims[i] = {
              ...currentClaim,
              status: 'success',
              result: { ...verifiedClaim, url_sources: sourceUrls },
            };
            return newClaims;
          });
  
        } catch (error) {
          // 5. 处理失败: 更新对应声明的状态为 'error'
          console.error(`Failed to verify claim: ${currentClaim.claim}`, error);
          setProcessedClaims(prevClaims => {
            const newClaims = [...prevClaims];
            newClaims[i] = {
              ...currentClaim,
              status: 'error',
              error: error instanceof Error ? error.message : "An unknown error occurred",
            };
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

  // JSX 部分保持不变，但传递给子组件的 props 需要调整
  return (
    <div className="flex flex-col min-h-screen z-0">
      {/* ... JSX for header ... */}
      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-6xl md:max-w-4xl p-6">
        {/* ... JSX for form ... */}

        {isGenerating && (
            <div ref={loadingRef} className="w-full">
              {/* 在加载时，可以先不显示 LoadingMessages，而是直接显示 pending 状态的 ClaimsListResults */}
              {processedClaims.length > 0 ? (
                <ClaimsListResults results={processedClaims} />
              ) : (
                <LoadingMessages isGenerating={isGenerating} />
              )}
            </div>
        )}

        {error && (
          <div className="mt-1 mb-14 p-3 bg-red-100 border border-red-400 animate-fade-up text-red-700 rounded-none">
            {error}
          </div>
        )}

        {/* 只要有处理过的声明，就显示结果区 */}
        {!isGenerating && processedClaims.length > 0 && (
          <div className="space-y-14 mt-5 mb-32">
              {/* PreviewBox 可能也需要修改以处理不同状态的 claims */}
              <PreviewBox
                  content={articleContent}
                  claims={
                      processedClaims
                         .filter(p => p.status === 'success' && p.result) // 1. 只筛选出成功的声明
                               .map(p => ({
                                   ...p.result!, // 展开所有 result 内部的属性
                                   original_text: p.original_text // 手动将 original_text 添加回来
                                   }))
                  }
              />
              <div className="mt-4 pt-12 opacity-0 animate-fade-up [animation-delay:800ms]">
                  <button
                    onClick={() => setShowAllClaims(!showAllClaims)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    {/* ... JSX for show/hide button ... */}
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
      {/* ... JSX for footer ... */}
    </div>
  );
}
