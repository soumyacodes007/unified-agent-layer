import { Router, type Request, type Response } from 'express';
import { createClient } from '@deepgram/sdk';
import multer from 'multer';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectStt(server: any) {
  return paymentMiddleware(
    {
      'POST /v1/stt': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: config.x402.avmAddress,
          price: '$0.01',
        },
        description: 'High-accuracy audio transcription (Deepgram Nova-3)',
      },
    },
    server
  );
}

// ─── POST /stt ────────────────────────────────────────────────────────────────
router.post('/stt', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Audio file is required. Send as multipart/form-data field: audio' });
    return;
  }

  const deepgram = createClient(config.providers.deepgram.apiKey);

  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      req.file.buffer,
      {
        model: 'nova-3',
        smart_format: true,
        mimetype: req.file.mimetype || 'audio/mpeg',
      }
    );

    if (error) throw error;

    const channel = result?.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    res.json({
      transcript: alternative?.transcript ?? '',
      confidence: alternative?.confidence ?? 0,
      duration: result?.metadata?.duration,
      model: 'nova-3',
      provider: 'deepgram',
    });
  } catch (err: unknown) {
    console.error('[stt] Deepgram error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'Speech-to-text failed', details: msg });
  }
});

export default router;
