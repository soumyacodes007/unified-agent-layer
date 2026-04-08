import { Router } from 'express';
import Groq from 'groq-sdk';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';
import { getAllowedReasoningEfforts, listGroqChatModels, routeGroqChatModel, supportsReasoningEffort, supportsReasoningFormat, } from '../router.js';
const router = Router();
// Payment Protection
export function protectChat(server) {
    return paymentMiddleware({
        'POST /v1/chat': {
            accepts: {
                scheme: 'exact',
                network: ALGORAND_TESTNET_CAIP2,
                payTo: config.x402.avmAddress,
                price: '$0.005',
            },
            description: 'OpenAI-compatible chat completions with Groq model routing and explicit model selection',
        },
    }, server);
}
let _groq = null;
function getGroq() {
    if (!_groq) {
        const apiKey = config.providers.groq.apiKey;
        if (!apiKey)
            throw new Error('GROQ_API_KEY is missing');
        _groq = new Groq({ apiKey });
    }
    return _groq;
}
function isJsonResponseFormat(responseFormat) {
    if (!responseFormat || typeof responseFormat !== 'object')
        return false;
    const type = responseFormat.type;
    return type === 'json_object' || type === 'json_schema';
}
function toFiniteNumber(value, fallback) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function toPositiveInt(value, fallback) {
    const parsed = Math.trunc(toFiniteNumber(value, fallback));
    return parsed > 0 ? parsed : fallback;
}
// GET /v1/chat/models
router.get('/chat/models', (_req, res) => {
    res.json({
        provider: 'groq',
        default_model: 'auto',
        models: listGroqChatModels(),
    });
});
// POST /v1/chat
router.post('/chat', async (req, res) => {
    const { messages, model = 'auto', temperature = 0.7, max_tokens, max_completion_tokens, top_p, seed, stop, response_format, tools, tool_choice, reasoning_effort, include_reasoning, reasoning_format, } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages array is required and must not be empty' });
        return;
    }
    if (typeof model !== 'string' || model.trim().length === 0) {
        res.status(400).json({ error: 'model must be a non-empty string or "auto"' });
        return;
    }
    if (include_reasoning !== undefined && typeof include_reasoning !== 'boolean') {
        res.status(400).json({ error: 'include_reasoning must be a boolean when provided' });
        return;
    }
    if (reasoning_effort !== undefined && typeof reasoning_effort !== 'string') {
        res.status(400).json({ error: 'reasoning_effort must be a string when provided' });
        return;
    }
    if (reasoning_format !== undefined && typeof reasoning_format !== 'string') {
        res.status(400).json({ error: 'reasoning_format must be a string when provided' });
        return;
    }
    if (include_reasoning !== undefined && reasoning_format !== undefined) {
        res.status(400).json({
            error: 'include_reasoning and reasoning_format cannot be used together',
        });
        return;
    }
    try {
        const routing = routeGroqChatModel(messages, model.trim());
        const targetModel = routing.model.id;
        if (reasoning_effort !== undefined) {
            if (!supportsReasoningEffort(targetModel)) {
                res.status(400).json({
                    error: `Model '${targetModel}' does not support reasoning_effort`,
                });
                return;
            }
            const allowed = getAllowedReasoningEfforts(targetModel);
            if (!allowed.includes(reasoning_effort)) {
                res.status(400).json({
                    error: `reasoning_effort '${reasoning_effort}' is invalid for model '${targetModel}'`,
                    allowed,
                });
                return;
            }
        }
        if (reasoning_format !== undefined) {
            if (!supportsReasoningFormat(targetModel)) {
                res.status(400).json({
                    error: `Model '${targetModel}' does not support reasoning_format`,
                });
                return;
            }
            const allowedFormats = ['parsed', 'raw', 'hidden'];
            if (!allowedFormats.includes(reasoning_format)) {
                res.status(400).json({
                    error: `reasoning_format '${reasoning_format}' is invalid`,
                    allowed: allowedFormats,
                });
                return;
            }
            if (reasoning_format === 'raw' && (tools !== undefined || tool_choice !== undefined || isJsonResponseFormat(response_format))) {
                res.status(400).json({
                    error: 'reasoning_format="raw" cannot be combined with tools or JSON response formats',
                });
                return;
            }
        }
        const requestedMaxCompletionTokens = toPositiveInt(max_completion_tokens ?? max_tokens, 2048);
        const effectiveMaxCompletionTokens = Math.min(requestedMaxCompletionTokens, routing.model.maxCompletionTokens);
        const completionRequest = {
            messages,
            model: targetModel,
            temperature: toFiniteNumber(temperature, 0.7),
            max_completion_tokens: effectiveMaxCompletionTokens,
        };
        if (top_p !== undefined)
            completionRequest.top_p = toFiniteNumber(top_p, 1);
        if (seed !== undefined)
            completionRequest.seed = toPositiveInt(seed, 0);
        if (stop !== undefined)
            completionRequest.stop = stop;
        if (response_format !== undefined)
            completionRequest.response_format = response_format;
        if (tools !== undefined)
            completionRequest.tools = tools;
        if (tool_choice !== undefined)
            completionRequest.tool_choice = tool_choice;
        if (reasoning_effort !== undefined)
            completionRequest.reasoning_effort = reasoning_effort;
        if (include_reasoning !== undefined)
            completionRequest.include_reasoning = include_reasoning;
        if (reasoning_format !== undefined)
            completionRequest.reasoning_format = reasoning_format;
        const completion = await getGroq().chat.completions.create(completionRequest);
        res.json({
            model: targetModel,
            requested_model: model,
            routing: {
                mode: routing.mode,
                normalized_model: routing.normalizedModel,
                reason: routing.reason,
            },
            choices: completion.choices,
            usage: completion.usage,
            provider: 'groq',
        });
    }
    catch (err) {
        console.error('[llm] Groq error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'LLM completion failed', details: msg });
    }
});
export default router;
