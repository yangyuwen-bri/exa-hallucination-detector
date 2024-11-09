import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ClaimsListResult {
  claim: string;
  assessment: string;
  summary: string;
  confidence_score: number;
  urlsources?: string[];
}

interface ClaimsListResultsProps {
  results: ClaimsListResult[];
}

const ClaimsListResults: React.FC<ClaimsListResultsProps> = ({ results }) => {
  const getStatusBadge = (assessment: string) => {
    const isTrue = assessment.toLowerCase().includes('true');
    return (
      <span 
        className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
          isTrue 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
        <span className="mr-2">{isTrue ? '✅' : '❌'}</span>
        {isTrue ? 'Potentially True' : 'Potentially False'}
      </span>
    );
  };

  return (
    <div className="mt-20 w-full bg-white p-6 border rounded-lg shadow-sm space-y-16">
      {results.map((result, index) => (
        <div key={index} className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-900">{result.claim}</h3>
          
          <div className="flex items-center space-x-3">
            {getStatusBadge(result.assessment)}
            <span className="text-gray-600 text-sm">
              {result.confidence_score}% Confident
            </span>
          </div>
          
          <p className="text-gray-700 mt-2">{result.summary}</p>
          
          <div className="mt-4">
            <div className="flex items-center space-x-2 text-gray-700 mb-2">
              <ChevronRight size={20} />
              <span className="font-medium">Sources</span>
            </div>
            
            <ul className="space-y-2 pl-6">
              {result.urlsources && result.urlsources.length > 0 ? (
                result.urlsources.map((source, idx) => (
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
        </div>
      ))}
    </div>
  );
};

export default ClaimsListResults;