interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  lastUpdated?: string;
}

export interface SearchResult {
  answer_md?: string;
  content?: string;
  citations: string[];
  searchResults?: SearchResultItem[];
  debug?: { queries: string[]; used_results: Array<{ title: string; url: string }>; };
}

export const searchPerplexity = async (query: string): Promise<SearchResult> => {
  try {
    const SUPABASE_URL = 'https://betukaetgtzkfhxhwqma.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHVrYWV0Z3R6a2ZoeGh3cW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjcyMDcsImV4cCI6MjA3NDkwMzIwN30.npgKZO6tsj84kCMnCPCul-Gg3nXB_dZXEY8dSzeWFUU';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('搜索请求过于频繁，请稍后再试。将使用标准模式为您提供建议。');
      }
      
      if (errorData.fallback) {
        throw new Error('增强搜索暂时不可用，将使用标准模式为您提供建议。');
      }
      
      throw new Error(`搜索服务错误: ${response.status}`);
    }

    const data = await response.json();
    if (!data.answer_md && !data.content) {
      throw new Error('搜索服务未返回有效结果');
    }
    return {
      answer_md: data.answer_md,
      content: data.content,
      citations: data.citations || [],
      searchResults: data.searchResults,
      debug: data.debug,
    };
  } catch (error) {
    console.error('Perplexity search error:', error);
    // Throw a user-friendly error that suggests fallback
    throw new Error(error instanceof Error ? error.message : '搜索服务暂时不可用，将使用标准模式。');
  }
};