import { Router, type Request, type Response } from 'express';
import { tavily } from '@tavily/core';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';

const router = Router();

// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectSearch(server: any) {
  return paymentMiddleware(
    {
      'POST /v1/search': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: config.x402.avmAddress,
          price: '$0.03',
        },
        description: 'Real-time web search via Tavily (LLM-ready output)',
      },
    },
    server
  );
}

// Lazy init — prevents crash at startup when TAVILY_API_KEY is missing
let _tv: ReturnType<typeof tavily> | null = null;
function getTavily() {
  if (!_tv) _tv = tavily({ apiKey: config.providers.tavily.apiKey });
  return _tv;
}

// ─── POST /search ─────────────────────────────────────────────────────────────
router.post('/search', async (req: Request, res: Response) => {
  const { query, search_depth = 'basic', max_results = 5, include_raw_content = false } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    res.status(400).json({ error: '`query` (string) is required' });
    return;
  }

  if (!config.providers.tavily.apiKey) {
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
      results: (result.results ?? []).map((r) => ({
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
