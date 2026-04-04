import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { paymentMiddleware, x402ResourceServer } from '@x402-avm/express';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/server';
import { HTTPFacilitatorClient } from '@x402-avm/core/server';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import llmRouter from './routes/llm.js';
import sttRouter from './routes/stt.js';
import ttsRouter from './routes/tts.js';
import imageRouter from './routes/image.js';
import storageRouter from './routes/storage.js';
import computeRouter from './routes/compute.js';
import hfRouter from './routes/hf.js';
import searchRouter from './routes/search.js';
// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4030', 10);
const AVM_ADDRESS = process.env.AVM_ADDRESS ?? '';
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'https://facilitator.goplausible.xyz';
if (!AVM_ADDRESS) {
    console.error('❌ AVM_ADDRESS is required in .env (your Algorand address to receive payments)');
    process.exit(1);
}
// ─── x402-avm Facilitator Client (GoPlausible) ───────────────────────────────
const facilitatorClient = new HTTPFacilitatorClient({
    url: FACILITATOR_URL,
});
// ─── x402-avm Resource Server Setup ──────────────────────────────────────────
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);
// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('json spaces', 2);
// ─── x402 Payment Middleware (Algorand Testnet) ───────────────────────────────
// All AI endpoints require a PAYMENT-SIGNATURE header from the agent.
// Agents pay in ALGO on Algorand Testnet before getting a response.
app.use(paymentMiddleware({
    // ── LLM Inference ──────────────────────────────────────────────────────
    'POST /v1/chat': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.02',
        },
        description: 'Unified LLM Inference with intelligent auto-routing (Groq)',
    },
    // ── Speech-to-Text ────────────────────────────────────────────────────
    'POST /v1/stt': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.05',
        },
        description: 'Speech-to-Text transcription via Deepgram Nova-3',
    },
    // ── Text-to-Speech ────────────────────────────────────────────────────
    'POST /v1/tts': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.02',
        },
        description: 'Text-to-Speech synthesis via Deepgram Aura-2',
    },
    // ── Image Generation ──────────────────────────────────────────────────
    'POST /v1/image': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.05',
        },
        description: 'Image generation via fal.ai Flux models',
    },
    // ── IPFS Storage ──────────────────────────────────────────────────────
    'POST /v1/storage': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.01',
        },
        description: 'Decentralized file storage via Pinata IPFS',
    },
    // ── Sandboxed Code Execution ──────────────────────────────────────────
    'POST /v1/compute': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.10',
        },
        description: 'Sandboxed code execution via self-hosted Piston (50+ languages)',
    },
    // ── HuggingFace Inference ─────────────────────────────────────────────
    'POST /v1/hf': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.03',
        },
        description: 'Inference on any HuggingFace model via Serverless API',
    },
    // ── Web Search ────────────────────────────────────────────────────────
    'POST /v1/search': {
        accepts: {
            scheme: 'exact',
            network: ALGORAND_TESTNET_CAIP2,
            payTo: AVM_ADDRESS,
            price: '$0.03',
        },
        description: 'Real-time web search returning LLM-ready content (Tavily)',
    },
}, server));
// ─── Routes ───────────────────────────────────────────────────────────────────
// (These only execute after successful x402 payment verification)
app.use(llmRouter);
app.use(sttRouter);
app.use(ttsRouter);
app.use(imageRouter);
app.use(storageRouter);
app.use(computeRouter);
app.use(hfRouter);
app.use(searchRouter);
// ─── Free Endpoint: API Info ──────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        name: 'Agent API — Unified AI Layer',
        description: 'x402-gated unified AI API on Algorand. Pay per request using ALGO on Algorand Testnet.',
        version: '1.0.0',
        network: 'algorand:testnet',
        chain: 'Algorand (AVM)',
        facilitator: FACILITATOR_URL,
        payTo: AVM_ADDRESS,
        endpoints: {
            'POST /v1/chat': { price: '$0.02', description: 'LLM inference (Groq, auto-routed or explicit model)' },
            'POST /v1/stt': { price: '$0.05', description: 'Speech-to-Text (Deepgram Nova-3)' },
            'POST /v1/tts': { price: '$0.02', description: 'Text-to-Speech (Deepgram Aura-2)' },
            'POST /v1/image': { price: '$0.05', description: 'Image generation (fal.ai Flux)' },
            'POST /v1/storage': { price: '$0.01', description: 'IPFS file storage (Pinata)' },
            'POST /v1/compute': { price: '$0.10', description: 'Sandboxed code execution (Piston)' },
            'POST /v1/hf/:model_id': { price: '$0.03', description: 'HuggingFace serverless inference (any model)' },
            'POST /v1/search': { price: '$0.03', description: 'Real-time web search — LLM-ready results (Tavily)' },
        },
    });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// ─── Start ────────────────────────────────────────────────────────────────────
const baseUrl = process.env.SERVICE_URL ?? `http://localhost:${PORT}`;
app.listen(PORT, () => {
    console.log('\n🚀 Agent API — Unified AI Layer (Algorand Edition)');
    console.log(`   URL:         ${baseUrl}`);
    console.log(`   Facilitator: ${FACILITATOR_URL}`);
    console.log(`   Pay To:      ${AVM_ADDRESS}`);
    console.log(`   Network:     algorand:testnet (CAIP-2)\n`);
    console.log('   Routes (x402 gated — pay with ALGO):');
    console.log(`   POST /v1/chat    → LLM Inference (Groq, auto-router)     $0.02`);
    console.log(`   POST /v1/stt     → Speech-to-Text (Deepgram Nova-3)      $0.05`);
    console.log(`   POST /v1/tts     → Text-to-Speech (Deepgram Aura-2)      $0.02`);
    console.log(`   POST /v1/image   → Image Generation (fal.ai Flux)        $0.05`);
    console.log(`   POST /v1/storage → IPFS Storage (Pinata)                 $0.01`);
    console.log(`   POST /v1/compute → Code Execution (Piston)               $0.10`);
    console.log(`   POST /v1/hf/:id  → HuggingFace Inference (any model)     $0.03`);
    console.log(`   POST /v1/search  → Web Search (Tavily, LLM-ready)        $0.03`);
    console.log('\n   💡 Stop managing API keys. One wallet, all AI tools.\n');
});
export default app;
