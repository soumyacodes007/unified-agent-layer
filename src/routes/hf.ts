import { Router, type Request, type Response } from 'express';
import { InferenceClient } from '@huggingface/inference';

const router = Router();

// ─── POST /v1/hf ─────────────────────────────────────────────────────────────
// Runs inference on any HuggingFace model via the Serverless Inference API.
// Supports: text-classification, summarization, NER, fill-mask, Q&A, and more.
// Example: POST /v1/hf with body { "model": "distilbert-base-uncased-finetuned-sst-2-english", "inputs": "..." }
router.post('/v1/hf', async (req: Request, res: Response) => {
  const { model: modelId, inputs, parameters = {} } = req.body;

  if (!modelId) {
    res.status(400).json({ error: 'model field is required in the request body.' });
    return;
  }
  if (inputs === undefined || inputs === null) {
    res.status(400).json({ error: 'inputs field is required in the request body.' });
    return;
  }

  const hf = new InferenceClient(process.env.HF_ACCESS_TOKEN);

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
  } catch (err: unknown) {
    console.error(`[hf] HuggingFace error for model ${modelId}:`, err);
    const msg = err instanceof Error ? err.message : String(err);

    // Give helpful error if model doesn't exist or isn't supported
    if (msg.includes('404') || msg.includes('not found')) {
      res.status(404).json({ error: `Model '${modelId}' not found on HuggingFace. Check the model ID at https://huggingface.co/models`, details: msg });
      return;
    }
    if (msg.includes('loading')) {
      res.status(503).json({ error: `Model '${modelId}' is currently loading on HuggingFace servers. Try again in 20-30 seconds.`, details: msg });
      return;
    }

    res.status(502).json({ error: 'HuggingFace inference failed', model: modelId, details: msg });
  }
});

export default router;
