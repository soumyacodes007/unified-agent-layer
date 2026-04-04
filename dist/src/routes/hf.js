import { Router } from 'express';
import { InferenceClient } from '@huggingface/inference';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';
const router = Router();
// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectHf(server) {
    return paymentMiddleware({
        'POST /v1/hf': {
            accepts: {
                scheme: 'exact',
                network: ALGORAND_TESTNET_CAIP2,
                payTo: config.x402.avmAddress,
                price: '$0.03',
            },
            description: 'Inference on any HuggingFace Serverless model',
        },
    }, server);
}
// ─── POST /hf ────────────────────────────────────────────────────────────────
router.post('/hf', async (req, res) => {
    const { model: modelId, inputs, parameters = {} } = req.body;
    if (!modelId) {
        res.status(400).json({ error: 'model field is required' });
        return;
    }
    if (inputs === undefined || inputs === null) {
        res.status(400).json({ error: 'inputs field is required' });
        return;
    }
    const hf = new InferenceClient(config.providers.hf.accessToken);
    try {
        const result = await hf.request({
            model: modelId,
            inputs,
            parameters,
        });
        res.json({
            result,
            model: modelId,
            provider: 'huggingface',
        });
    }
    catch (err) {
        console.error(`[hf] HuggingFace error for model ${modelId}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('404') || msg.includes('not found')) {
            res.status(404).json({ error: `Model '${modelId}' not found.`, details: msg });
            return;
        }
        if (msg.includes('loading')) {
            res.status(503).json({ error: `Model '${modelId}' is currently loading.`, details: msg });
            return;
        }
        res.status(502).json({ error: 'HuggingFace inference failed', model: modelId, details: msg });
    }
});
export default router;
