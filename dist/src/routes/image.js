import { Router } from 'express';
import { fal } from '@fal-ai/client';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';
const router = Router();
// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectImage(server) {
    return paymentMiddleware({
        'POST /v1/image': {
            accepts: {
                scheme: 'exact',
                network: ALGORAND_TESTNET_CAIP2,
                payTo: config.x402.avmAddress,
                price: '$0.05',
            },
            description: 'AI image generation via Flux.1 [schnell] on fal.ai',
        },
    }, server);
}
// Fal model IDs map
const FAL_MODELS = {
    'flux-schnell': 'fal-ai/flux/schnell',
    'flux-dev': 'fal-ai/flux/dev',
    'flux-pro': 'fal-ai/flux-pro',
};
// ─── POST /v1/image ────────────────────────────────────────────────────────────
// Generates an image from a text prompt using fal.ai Flux models.
router.post('/image', async (req, res) => {
    const { prompt, model = 'flux-schnell', width = 1024, height = 1024, num_inference_steps, } = req.body;
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
    if (config.providers.fal.key) {
        fal.config({ credentials: config.providers.fal.key });
    }
    try {
        const input = { prompt, image_size: { width, height } };
        if (num_inference_steps)
            input.num_inference_steps = num_inference_steps;
        const result = await fal.subscribe(falModelId, { input });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const images = result?.data?.images ?? result?.images ?? [];
        const firstImage = images[0];
        res.json({
            url: firstImage?.url ?? null,
            width: firstImage?.width ?? width,
            height: firstImage?.height ?? height,
            model: falModelId,
            provider: 'fal.ai',
            prompt,
        });
    }
    catch (err) {
        console.error('[image] fal.ai error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'Image generation failed', details: msg });
    }
});
export default router;
