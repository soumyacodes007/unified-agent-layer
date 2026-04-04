import { Router, type Request, type Response } from 'express';
import Groq from 'groq-sdk';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';
import { classifyPrompt, getModelForComplexity } from '../router.js';

const router = Router();

// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectChat(server: any) {
  return paymentMiddleware(
    {
      'POST /v1/chat': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: config.x402.avmAddress,
          price: '$0.005',
        },
        description: 'OpenAI-compatible chat completions with autonomous model routing (Groq)',
      },
    },
    server
  );
}

// Lazy init — prevents crash at startup if GROQ_API_KEY is missing/mock
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    const apiKey = config.providers.groq.apiKey;
    if (!apiKey) throw new Error('GROQ_API_KEY is missing');
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

// ─── POST /v1/chat ─────────────────────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response) => {
  const { messages, model = 'auto', temperature = 0.7, max_tokens = 2048 } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required and must not be empty' });
    return;
  }

  try {
    let targetModel = model;
    if (model === 'auto') {
      const complexity = await classifyPrompt(messages);
      targetModel = getModelForComplexity(complexity);
    }

    const completion = await getGroq().chat.completions.create({
      messages,
      model: targetModel,
      temperature,
      max_tokens,
    });

    res.json({
      model: targetModel,
      choices: completion.choices,
      usage: completion.usage,
      provider: 'groq',
    });
  } catch (err: unknown) {
    console.error('[llm] Groq error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'LLM completion failed', details: msg });
  }
});

export default router;
