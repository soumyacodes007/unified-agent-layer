import { Router } from 'express';
import Groq from 'groq-sdk';
import { classifyPrompt, getModelForComplexity } from '../router.js';
const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// ─── POST /v1/chat ─────────────────────────────────────────────────────────────
// OpenAI-compatible chat completions via Groq.
// Supports: model = "auto" | "llama-3.1-8b-instant" | "llama-4-scout-17b-16e-instruct" | "llama-3.3-70b-versatile"
router.post('/v1/chat', async (req, res) => {
    const { messages, model = 'auto', temperature = 0.7, max_tokens = 2048 } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages array is required and must not be empty' });
        return;
    }
    let resolvedModel = model;
    // ── Auto-routing: classify and pick the best model ──────────────────────────
    if (model === 'auto') {
        try {
            const complexity = await classifyPrompt(messages);
            resolvedModel = getModelForComplexity(complexity);
            console.log(`[llm] Auto-routed to ${resolvedModel} (complexity: ${complexity})`);
        }
        catch (err) {
            // Fallback to cheapest model if classifier fails
            resolvedModel = 'llama-3.1-8b-instant';
            console.warn('[llm] Classifier failed, falling back to llama-3.1-8b-instant:', err);
        }
    }
    try {
        const completion = await groq.chat.completions.create({
            model: resolvedModel,
            messages,
            temperature,
            max_tokens,
        });
        // Return OpenAI-compatible response with extra metadata
        res.json({
            ...completion,
            _meta: {
                routed_model: resolvedModel,
                requested_model: model,
                provider: 'groq',
            },
        });
    }
    catch (err) {
        console.error('[llm] Groq error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'LLM inference failed', details: msg });
    }
});
export default router;
