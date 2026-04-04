import { Router, type Request, type Response } from 'express';
import { createClient } from '@deepgram/sdk';

const router = Router();

// ─── POST /v1/tts ─────────────────────────────────────────────────────────────
// Converts text to speech using Deepgram Aura-2.
// Returns raw MP3 audio binary (Content-Type: audio/mpeg).
router.post('/v1/tts', async (req: Request, res: Response) => {
  const { text, voice = 'aura-2-en-us' } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'text field is required and must be a non-empty string' });
    return;
  }

  if (text.length > 5000) {
    res.status(400).json({ error: 'text must be 5000 characters or fewer' });
    return;
  }

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: voice,
        encoding: 'mp3',
      }
    );

    const stream = await response.getStream();
    if (!stream) {
      throw new Error('No audio stream returned from Deepgram');
    }

    // Pipe the audio stream directly to the HTTP response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Voice-Model', voice);
    res.setHeader('X-Provider', 'deepgram');

    const reader = stream.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      await pump();
    };
    await pump();

  } catch (err: unknown) {
    console.error('[tts] Deepgram error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'Text-to-speech failed', details: msg });
  }
});

export default router;
