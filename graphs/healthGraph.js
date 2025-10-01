import { START, END, StateGraph } from '@langchain/langgraph';

export function buildHealthGraph({ ai, runPerplexitySearch, validateAndSanitizeUrl }) {
  const state = {
    question: null,
    queries: [],
    results: [],
    needMore: false,
    answer_md: '',
    citations: [],
  };

  // Simple retry helper with exponential backoff to mitigate transient network errors
  const withRetry = async (fn, maxRetries = 2) => {
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt === maxRetries) throw lastErr;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastErr;
  };

  const generate_queries = async (s) => {
    const schema = {
      type: 'object',
      properties: { queries: { type: 'array', items: { type: 'string' } } },
      required: ['queries']
    };
    const resp = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 2 concise English web queries to research this veterinary health question. Return JSON {"queries": string[]}.
Question: ${s.question}`,
      config: { responseMimeType: 'application/json', responseSchema: schema }
    }));
    let qs = [];
    try { qs = JSON.parse(resp.text || '{}').queries || []; } catch {}
    return { ...s, queries: Array.from(new Set([s.question, ...qs].map(x => String(x).trim()).filter(Boolean))).slice(0,3) };
  };

  const web_search = async (s) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    const all = [];
    for (const q of s.queries) {
      const data = await runPerplexitySearch(q, apiKey);
      for (const r of (data.results || [])) all.push({ ...r, sourceQuery: q });
    }
    return { ...s, results: all };
  };

  const reflection = async (s) => {
    const snippets = s.results.map(r => `${r.title}\n${r.snippet}`).join('\n\n');
    const schema = { type:'object', properties:{ needMore:{type:'boolean'}, queries:{ type:'array', items:{type:'string'} } }, required:['needMore'] };
    const resp = await withRetry(() => ai.models.generateContent({
      model:'gemini-2.5-flash',
      contents:`Reflect if more research is required. Return JSON {"needMore":boolean, "queries": string[]}.
Question: ${s.question}
Snippets:
${snippets}`,
      config:{ responseMimeType:'application/json', responseSchema: schema }
    }));
    let needMore=false, qs=[]; try { const o=JSON.parse(resp.text||'{}'); needMore=!!o.needMore; qs=o.queries||[]; } catch{}
    if (!needMore) return { ...s, needMore:false };
    const apiKey = process.env.PERPLEXITY_API_KEY;
    const nextQs = Array.from(new Set(qs.map(x=>String(x).trim()).filter(Boolean))).slice(0,2);
    const extra = [];
    for (const q of nextQs) {
      const data = await runPerplexitySearch(q, apiKey);
      for (const r of (data.results || [])) extra.push({ ...r, sourceQuery: q });
    }
    return { ...s, results: [...s.results, ...extra], needMore:false };
  };

  const synthesis = async (s) => {
    const citations = Array.from(new Set(s.results.map(r => validateAndSanitizeUrl(r.url)).filter(Boolean)));
    const limitedCitations = citations.slice(0,10);
    // Trim context to avoid overly large payloads
    const MAX_RESULTS = 24;
    const MAX_SNIPPET = 512;
    const compiled = s.results.slice(0, MAX_RESULTS).map(r => `${r.title}\n${String(r.snippet||'').slice(0, MAX_SNIPPET)}`).join('\n\n');
    const resp = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents:`You are a caring pet-health assistant. Based on ALL of the following research snippets, write a concise Chinese answer with sections: 可能原因/家庭照护/何时就医/温馨提示. Embed inline numbered citations using markdown footnotes like [^1] that match the provided URLs. Always add a strong non-medical-diagnosis disclaimer.
Question: ${s.question}
Snippets:
${compiled}
Citations (use up to 10, map to the footnotes):
${limitedCitations.map((url, idx) => `[^${idx+1}]: ${url}`).join('\n')}`
    }));
    return { ...s, answer_md: resp.text || compiled, citations: limitedCitations };
  };

  const g = new StateGraph({ channels: state })
    .addNode('generate_queries', generate_queries)
    .addNode('web_search', web_search)
    .addNode('reflection', reflection)
    .addNode('synthesis', synthesis)
    .addEdge(START, 'generate_queries')
    .addEdge('generate_queries', 'web_search')
    .addEdge('web_search', 'reflection')
    .addEdge('reflection', 'synthesis')
    .addEdge('synthesis', END);

  return g.compile();
}


