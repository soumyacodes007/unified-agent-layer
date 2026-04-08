import { Router } from 'express';
import { createClient } from '@deepgram/sdk';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';
const router = Router();
// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectTts(server) {
    return paymentMiddleware({
        'POST /v1/tts': {
            accepts: {
                scheme: 'exact',
                network: ALGORAND_TESTNET_CAIP2,
                payTo: config.x402.avmAddress,
                price: '$0.01',
            },
            description: 'Ultra-low latency TTS via Deepgram Aura',
        },
    }, server);
}
// ─── POST /tts ─────────────────────────────────────────────────────────────
router.post('/tts', async (req, res) => {
    const { text, voice = 'aura-asteria-en', format = 'mp3' } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({ error: 'text field is required and must be a non-empty string' });
        return;
    }
    // Deepgram Aura models: aura-asteria-en, aura-luna-en, aura-stella-en, etc.
    // "aura-2-en-us" might not be available on all projects.
    const modelId = voice.includes('aura') ? voice : 'aura-asteria-en';
    const normalizedFormat = typeof format === 'string' ? format.toLowerCase() : 'mp3';
    if (!['mp3', 'wav'].includes(normalizedFormat)) {
        res.status(400).json({ error: 'format must be either "mp3" or "wav"' });
        return;
    }
    const deepgram = createClient(config.providers.deepgram.apiKey);
    try {
        const response = await deepgram.speak.request({ text }, {
            model: modelId,
            encoding: normalizedFormat === 'mp3' ? 'mp3' : 'linear16',
            container: normalizedFormat === 'mp3' ? 'mp3' : 'wav',
        });
        const stream = await response.getStream();
        if (!stream)
            throw new Error('Could not get audio stream from Deepgram');
        // Convert stream to Buffer (robust way for Node.js)
        const reader = stream.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value)
                chunks.push(value);
        }
        const buffer = Buffer.concat(chunks);
        // If the buffer is extremely small, it might be a JSON error from the provider
        if (buffer.length < 500) {
            const textResponse = buffer.toString();
            if (textResponse.includes('err_code')) {
                const err = JSON.parse(textResponse);
                res.status(403).json({
                    error: 'Upstream Provider Error',
                    message: err.err_msg || 'Deepgram permsission error',
                    code: err.err_code,
                    hint: 'The requested voice model may not be accessible with your API key.'
                });
                return;
            }
        }
        res.set({
            'Content-Type': normalizedFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav',
            'Content-Disposition': `attachment; filename="speech.${normalizedFormat}"`,
        });
        res.send(buffer);
    }
    catch (err) {
        console.error('[tts] Deepgram error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'Text-to-speech failed', details: msg });
    }
});
export default router;
