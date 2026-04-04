import { Router, type Request, type Response } from 'express';
import { tavily } from '@tavily/core';

const router = Router();
// Lazy init — prevents crash at startup when TAVILY_API_KEY is missing
let _tv: ReturnType<typeof tavily> | null = null;
function getTavily() {
  if (!_tv) _tv = tavily({ apiKey: process.env.TAVILY_API_KEY ?? '' });
  return _tv;
}

// ─── POST /v1/search ───────────────────────────────────────────────────────────
// Real-time web search powered by Tavily. Returns LLM-ready structured results.
// search_depth: 'basic' (fast) | 'advanced' (deeper, more accurate)
// max_results:  number of results to return (1–10, default 5)
router.post('/v1/search', async (req: Request, res: Response) => {
  const {
    query,
    search_depth = 'basic',
    max_results = 5,
    include_raw_content = false,
  } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    res.status(400).json({ error: '`query` (string) is required' });
    return;
  }

  if (!process.env.TAVILY_API_KEY) {
    res.status(503).json({ error: 'Search service unavailable: TAVILY_API_KEY not configured' });
    return;
  }

  try {
    const result = await getTavily().search(query, {
      searchDepth: search_depth as 'basic' | 'advanced',
      maxResults: Math.min(Math.max(1, Number(max_results) || 5), 10),
      includeRawContent: include_raw_content,
    });

    res.json({
      query: result.query,
      answer: result.answer ?? null,
      results: result.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        published_date: r.publishedDate ?? null,
      })),
      _meta: {
        search_depth,
        result_count: result.results.length,
        provider: 'tavily',
      },
    });
  } catch (err: unknown) {
    console.error('[search] Tavily error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'Search failed', details: msg });
  }
});

export default router;
