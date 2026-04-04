import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { x402ResourceServer } from '@x402-avm/express';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/server';
import { HTTPFacilitatorClient } from '@x402-avm/core/server';
import { bazaarResourceServerExtension } from '@x402-avm/extensions';
// -- Routes & Protectors --
import llmRouter, { protectChat } from './routes/llm.js';
import sttRouter, { protectStt } from './routes/stt.js';
import ttsRouter, { protectTts } from './routes/tts.js';
import imageRouter, { protectImage } from './routes/image.js';
import storageRouter, { protectStorage } from './routes/storage.js';
import computeRouter, { protectCompute } from './routes/compute.js';
import hfRouter, { protectHf } from './routes/hf.js';
import searchRouter, { protectSearch } from './routes/search.js';
import weatherRouter, { protectWeather } from './routes/weather.js';
import { config } from './config.js';
const { port, host } = config.server;
const AVM_ADDRESS = config.x402.avmAddress;
const FACILITATOR_URL = config.x402.facilitatorUrl;
if (!AVM_ADDRESS) {
    console.error('❌ AVM_ADDRESS is required in .env');
    process.exit(1);
}
// ─── x402-avm Setup ──────────────────────────────────────────────────────────
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);
server.registerExtension(bazaarResourceServerExtension);
// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
// Diagnostic Logger (Crucial for Railway testing)
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('json spaces', 2);
// ─── Atomic Route Mounting ────────────────────────────────────────────────────
// We mount each router under /v1 and apply the specific protection for that route.
// This is much more robust for Express 5 and Railway routing than global matching.
app.use('/v1', protectChat(server), llmRouter);
app.use('/v1', protectStt(server), sttRouter);
app.use('/v1', protectTts(server), ttsRouter);
app.use('/v1', protectImage(server), imageRouter);
app.use('/v1', protectStorage(server), storageRouter);
app.use('/v1', protectCompute(server), computeRouter);
app.use('/v1', protectHf(server), hfRouter);
app.use('/v1', protectSearch(server), searchRouter);
app.use('/v1', protectWeather(server), weatherRouter);
// ─── Public Endpoints ─────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        name: 'Agent API — Unified AI Layer',
        description: 'x402-gated AI API on Algorand. USDC micropayments per request.',
        version: '1.0.0',
        network: 'algorand:testnet',
        facilitator: FACILITATOR_URL,
        payTo: AVM_ADDRESS,
        endpoints: {
            'POST /v1/chat': '$0.005 — LLM chat completions (Groq)',
            'POST /v1/stt': '$0.010 — Speech-to-text',
            'POST /v1/tts': '$0.010 — Text-to-speech',
            'POST /v1/image': '$0.050 — Image generation',
            'POST /v1/storage': '$0.020 — IPFS storage',
            'POST /v1/compute': '$0.010 — Code execution',
            'POST /v1/hf': '$0.030 — HuggingFace inference',
            'POST /v1/search': '$0.030 — Web search',
            'GET  /v1/weather': '$0.010 — Weather data + forecast',
        },
    });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// ─── Start ────────────────────────────────────────────────────────────────────
const baseUrl = config.server.serviceUrl ?? `http://localhost:${port}`;
app.listen(port, host, () => {
    console.log('\n🚀 Agent API — Unified AI Layer');
    console.log(`   URL:         ${baseUrl}`);
    console.log(`   Facilitator: ${FACILITATOR_URL}`);
    console.log(`   Pay To:      ${AVM_ADDRESS}`);
    console.log(`   Network:     algorand:testnet (CAIP-2)`);
    console.log(`\n   Routes: /v1/chat | /v1/stt | /v1/tts | /v1/image | /v1/storage | /v1/compute | /v1/hf | /v1/search | /v1/weather\n`);
});
export default app;
