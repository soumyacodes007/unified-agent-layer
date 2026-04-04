import { Router, type Request, type Response } from 'express';
import { createClient } from '@deepgram/sdk';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';

const router = Router();

// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectTts(server: any) {
  return paymentMiddleware(
    {
      'POST /v1/tts': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: config.x402.avmAddress,
          price: '$0.01',
        },
        description: 'Ultra-low latency TTS via Deepgram Aura-2',
      },
    },
    server
  );
}

// ─── POST /tts ─────────────────────────────────────────────────────────────
router.post('/tts', async (req: Request, res: Response) => {
  const { text, voice = 'aura-asteria-en' } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'text field is required and must be a non-empty string' });
    return;
  }

  const deepgram = createClient(config.providers.deepgram.apiKey);

  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: voice,
        encoding: 'linear16',
        container: 'wav',
      }
    );

    const stream = await response.getStream();
    if (!stream) throw new Error('Could not get audio stream from Deepgram');

    // Convert stream to Buffer (robust way if getBuffer is missing in TS types)
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'attachment; filename="speech.wav"',
    });

    res.send(buffer);
  } catch (err: unknown) {
    console.error('[tts] Deepgram error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'Text-to-speech failed', details: msg });
  }
});

export default router;
