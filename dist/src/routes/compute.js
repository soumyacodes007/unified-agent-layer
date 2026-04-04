import { Router } from 'express';
import { paymentMiddleware } from '@x402-avm/express';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { config } from '../config.js';
const router = Router();
// ─── Payment Protection ───────────────────────────────────────────────────────
export function protectCompute(server) {
    return paymentMiddleware({
        'POST /v1/compute': {
            accepts: {
                scheme: 'exact',
                network: ALGORAND_TESTNET_CAIP2,
                payTo: config.x402.avmAddress,
                price: '$0.01',
            },
            description: 'Isolated code execution in 70+ languages (Piston)',
        },
    }, server);
}
// ─── POST /compute ────────────────────────────────────────────────────────────
router.post('/compute', async (req, res) => {
    const { language, code, stdin = '', args = [] } = req.body;
    if (!language || typeof language !== 'string') {
        res.status(400).json({ error: 'language field is required' });
        return;
    }
    if (!code || typeof code !== 'string') {
        res.status(400).json({ error: 'code field is required' });
        return;
    }
    const primaryUrl = config.compute.pistonUrl;
    const fallbackUrl = config.compute.pistonFallbackUrl;
    try {
        let response;
        try {
            // Try local primary Piston
            response = await fetch(`${primaryUrl}/api/v2/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, version: '*', files: [{ content: code }], stdin, args }),
            });
            if (!response.ok)
                throw new Error(`Primary Piston returned ${response.status}`);
        }
        catch (e) {
            console.warn('[compute] Primary Piston failed, trying fallback...');
            response = await fetch(`${fallbackUrl}/api/v2/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, version: '*', files: [{ content: code }], stdin, args }),
            });
        }
        const data = await response.json();
        res.json({
            run: data.run,
            language: data.language,
            version: data.version,
            provider: response.url.includes('emkc.org') ? 'public-piston' : 'private-piston',
        });
    }
    catch (err) {
        console.error('[compute] Execution error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(502).json({ error: 'Code execution failed', details: msg });
    }
});
export default router;
