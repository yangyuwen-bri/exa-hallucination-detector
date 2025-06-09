import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ProcessedClaim } from './FactChecker'; // 从 FactChecker 导入类型

interface ClaimsListResultsProps {
  results: ProcessedClaim[];
}

const ClaimsListResults: React.FC<ClaimsListResultsProps> = ({ results }) => {
  
  const getStatusBadge = (assessment: string) => {
    const isTrue = assessment.toLowerCase().includes('true');
    return (
      <span 
        className={`inline-flex items-center px-3 py-1 rounded-none text-sm font-medium ${
          isTrue 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
        <span className="mr-2">{isTrue ? '✅' : '❌'}</span>
        {isTrue ? 'Supported' : 'Refuted'}
      </span>
    );
  };

  return (
    <div className="mt-6 w-full bg-white p-6 border rounded-none shadow-sm space-y-16">
      {results.map((item, index) => (
        <div key={index} className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-900">{item.claim}</h3>
          
          {/* 根据 status 显示不同内容 */}
          {item.status === 'pending' && (
            <div className="flex items-center space-x-2 text-gray-500">
              <span className="animate-spin text-lg">⏳</span>
              <span>验证中...</span>
            </div>
          )}

          {item.status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-none">
              <p className="font-semibold text-red-800">❌ 验证失败</p>
              <p className="text-red-700 mt-1 text-sm">{item.error}</p>
            </div>
          )}
          
          {item.status === 'success' && item.result && (
            <>
              {/* 这里是之前展示成功结果的逻辑 */}
              {item.result.assessment.toLowerCase() !== 'insufficient information' ? (
                <>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(item.result.assessment)}
                    <span className="text-gray-600 text-sm">
                      {item.result.confidence_score}% Confident
                    </span>
                  </div>
                  <p className="text-gray-700 mt-2">{item.result.summary}</p>
                </>
              ) : (
                <div className="text-gray-600 italic">信息不足，无法验证。</div>
              )}

              <div className="mt-4">
                <div className="flex items-center space-x-2 text-gray-700 mb-2">
                  <ChevronRight size={20} />
                  <span className="font-medium">Sources</span>
                </div>
                
                <ul className="space-y-2 pl-6">
                  {item.result.url_sources && item.result.url_sources.length > 0 ? (
                    item.result.url_sources.map((source: string, idx: number) => (
                      <li key={idx}>
                        <a 
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-all"
                        >
                          {source}
                        </a>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">No sources available</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default ClaimsListResults;
