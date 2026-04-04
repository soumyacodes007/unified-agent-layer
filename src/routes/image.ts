import { Router, type Request, type Response } from 'express';
import { fal } from '@fal-ai/client';

const router = Router();

// Fal model IDs map
const FAL_MODELS: Record<string, string> = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev':     'fal-ai/flux/dev',
  'flux-pro':     'fal-ai/flux-pro',
};

// ─── POST /v1/image ────────────────────────────────────────────────────────────
// Generates an image from a text prompt using fal.ai Flux models.
// Returns image URL and dimensions.
router.post('/v1/image', async (req: Request, res: Response) => {
  const {
    prompt,
    model = 'flux-schnell',
    width = 1024,
    height = 1024,
    num_inference_steps,
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({ error: 'prompt field is required and must be a non-empty string' });
    return;
  }

  const falModelId = FAL_MODELS[model];
  if (!falModelId) {
    res.status(400).json({
      error: `Unknown model: ${model}. Supported: ${Object.keys(FAL_MODELS).join(', ')}`,
    });
    return;
  }

  // Configure fal.ai with API key
  fal.config({ credentials: process.env.FAL_KEY });

  try {
    const input: Record<string, unknown> = { prompt, image_size: { width, height } };
    if (num_inference_steps) input.num_inference_steps = num_inference_steps;

    const result = await fal.subscribe(falModelId, { input });

    // fal.ai returns images array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = (result as any)?.data?.images ?? (result as any)?.images ?? [];
    const firstImage = images[0];

    res.json({
      url: firstImage?.url ?? null,
      width: firstImage?.width ?? width,
      height: firstImage?.height ?? height,
      model: falModelId,
      provider: 'fal.ai',
      prompt,
    });
  } catch (err: unknown) {
    console.error('[image] fal.ai error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'Image generation failed', details: msg });
  }
});

export default router;
