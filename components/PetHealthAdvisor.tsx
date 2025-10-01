
import React, { useState } from 'react';
import { getPetHealthAdvice } from '../services/geminiService';
import { searchPerplexity, SearchResult } from '../services/perplexityService';
import Spinner from './Spinner';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { supabase } from '../src/integrations/supabase/client';
import { useAuth } from '../src/contexts/AuthContext';
marked.setOptions({ gfm: true });

const PetHealthAdvisor: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [useDeepSearch, setUseDeepSearch] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const { user } = useAuth();

  const handleGetAdvice = async () => {
    if (!question) {
      setError('Please enter a question about your pet.');
      return;
    }
    setError('');
    setLoading(true);
    setResult('');
    setSearchResults(null);
    
    try {
          if (useDeepSearch) {
        // Attempt enhanced search with Perplexity
        try {
          const searchResult = await searchPerplexity(question);
          setSearchResults(searchResult);
          
          // Enhance the question with search context for Gemini
              if (searchResult.answer_md) {
                setResult(searchResult.answer_md);
              } else {
                const enhancedQuestion = `Based on the following research context and question about pet health:

Question: ${question}

Research Context: ${searchResult.content}

Please provide a comprehensive, caring response that combines this research with your veterinary knowledge. Include practical advice and maintain a warm, supportive tone.`;
                const response = await getPetHealthAdvice(enhancedQuestion);
                setResult(response.advice);
              }
        } catch (searchError) {
          // Graceful fallback to standard mode on search failure
          console.warn('Enhanced search failed, falling back to standard mode:', searchError);
          setError(`增强搜索失败：${searchError instanceof Error ? searchError.message : '未知错误'}，已切换到标准模式。`);
          
          // Continue with standard Gemini response
          const response = await getPetHealthAdvice(question);
          setResult(response.advice);
          
          // Save to database
          if (user) {
            await supabase.from('health_consultations').insert({
              user_id: user.id,
              question,
              advice: response.advice,
              citations: []
            });
          }
          
          // Clear error after a delay to show it was resolved
          setTimeout(() => setError(''), 3000);
        }
      } else {
        // Use standard Gemini response
        const response = await getPetHealthAdvice(question);
        setResult(response.advice);
        
        // Save to database
        if (user) {
          await supabase.from('health_consultations').insert({
            user_id: user.id,
            question,
            advice: response.advice,
            citations: []
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 p-6 rounded-3xl" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <span className="text-3xl">💊</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-400 rounded-full flex items-center justify-center border-4 border-white">
                <span className="text-sm">❤️</span>
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3">
            🌿 Pet Health Advisor 🌿
          </h2>
          <p className="text-teal-600 max-w-2xl mx-auto leading-relaxed text-lg">
            💕 Ask our caring AI assistant about your pet's health and wellness. Get gentle, helpful advice! 💕
          </p>
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>

        {/* Question Input Section */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-green-200">
          <div className="mb-6">
            <label htmlFor="question" className="flex items-center text-lg font-bold text-green-700 mb-4">
              <span className="mr-3 text-2xl">🤔</span>
              What's on your mind about your pet's health?
            </label>
            <div className="relative">
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                placeholder="🐶 e.g., What are some good exercises for an older golden retriever? Is it normal for my cat to sleep 16 hours a day?"
                className="w-full px-4 py-4 bg-white/80 border-2 border-green-200 rounded-2xl shadow-lg placeholder-green-400 focus:outline-none focus:ring-4 focus:ring-green-300/50 focus:border-teal-400 text-sm backdrop-blur-sm resize-none"
                style={{ fontFamily: "'Averia Serif Libre', serif" }}
              />
              {/* Character count indicator */}
              <div className="absolute bottom-3 right-3 text-xs text-green-500 bg-white/80 px-2 py-1 rounded-full flex items-center space-x-2">
                <button
                  onClick={() => setUseDeepSearch(!useDeepSearch)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                    useDeepSearch ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  deep research
                </button>
                <span>{question.length} chars</span>
              </div>
            </div>
          </div>
          
          {/* Quick suggestion chips */}
          <div className="mb-6">
            <p className="text-sm text-teal-600 mb-3 font-semibold">💡 Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Nutrition tips for puppies',
                'Senior cat care advice',
                'Exercise routines for dogs',
                'Grooming best practices',
                'Behavioral concerns'
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(suggestion)}
                  className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-full text-xs transition-colors border border-green-300"
                  style={{ fontFamily: "'Averia Serif Libre', serif" }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGetAdvice}
            disabled={!question || loading}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-xl border-2 border-white/30"
            style={{ fontFamily: "'Averia Serif Libre', serif" }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                🔍 Getting Caring Advice...
              </span>
            ) : (
              '🌿 Get Loving Health Advice 🌿'
            )}
          </button>
        </div>

        {loading && (
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border-2 border-green-200 shadow-lg">
            <Spinner text={useDeepSearch ? "🔍 正在深度搜索最新信息并分析..." : "👩‍⚕️ Our caring AI is thinking about your pet's wellness..."} />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-4">😿</span>
              <div>
                <h4 className="font-bold mb-1">Oops! Something went wrong</h4>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-2xl shadow-xl border-2 border-green-200">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl">{useDeepSearch ? '🔍' : '👩‍⚕️'}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-700">
                  {useDeepSearch ? '深度搜索建议' : 'Caring Health Advice'}
                </h3>
                <p className="text-teal-600 text-sm">
                  {useDeepSearch ? '基于最新研究的综合建议' : 'From our AI veterinary assistant'}
                </p>
              </div>
            </div>
            <div className="bg-white/80 p-6 rounded-xl border border-green-200 shadow-inner">
              <div className="prose prose-green max-w-none text-gray-700" 
                   style={{ fontFamily: "'Averia Serif Libre', serif" }}
                   dangerouslySetInnerHTML={{ 
                     __html: DOMPurify.sanitize(marked.parse(result) as string, {
                       ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'sup', 'section', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                       ALLOWED_ATTR: ['href', 'rel', 'target']
                     })
                   }} 
              />
            </div>
            
            {/* Search Citations (when enhanced search is used) */}
            {useDeepSearch && searchResults && searchResults.citations && searchResults.citations.length > 0 && (
              <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <div className="flex items-start">
                  <span className="text-purple-600 mr-3 text-lg flex-shrink-0">📚</span>
                  <div className="flex-1">
                    <p className="font-semibold mb-2 text-purple-700">参考资料来源：</p>
                    <div className="grid gap-2">
                      {searchResults.citations.slice(0, 10).map((citation, index) => (
                        <a
                          key={index}
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-xs text-purple-600 hover:text-purple-800 underline break-all line-clamp-1"
                        >
                          {index + 1}. {citation}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Disclaimer */}
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <div className="flex items-start">
                <span className="text-yellow-600 mr-3 text-lg flex-shrink-0">⚠️</span>
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Important Reminder:</p>
                  <p>This advice is for general information only. Always consult with a qualified veterinarian for your pet's specific health concerns.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetHealthAdvisor;
