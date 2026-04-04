import { Router, type Request, type Response } from 'express';
import { createClient } from '@deepgram/sdk';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

// ─── POST /v1/stt ─────────────────────────────────────────────────────────────
// Transcribes audio using Deepgram Nova-3.
// Accepts: multipart/form-data with field 'audio' (mp3, wav, ogg, flac)
router.post('/v1/stt', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Audio file is required. Send as multipart/form-data field: audio' });
    return;
  }

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      req.file.buffer,
      {
        model: 'nova-3',
        smart_format: true,
        punctuate: true,
        diarize: false,
        mimetype: req.file.mimetype || 'audio/mpeg',
      }
    );

    if (error) {
      throw error;
    }

    const channel = result?.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    res.json({
      transcript: alternative?.transcript ?? '',
      confidence: alternative?.confidence ?? 0,
      words: alternative?.words ?? [],
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
