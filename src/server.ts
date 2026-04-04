import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { paymentMiddleware, x402ResourceServer } from '@x402-avm/express';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/server';
import { HTTPFacilitatorClient } from '@x402-avm/core/server';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';
import { declareDiscoveryExtension, bazaarResourceServerExtension } from '@x402-avm/extensions';

import llmRouter from './routes/llm.js';
import sttRouter from './routes/stt.js';
import ttsRouter from './routes/tts.js';
import imageRouter from './routes/image.js';
import storageRouter from './routes/storage.js';
import computeRouter from './routes/compute.js';
import hfRouter from './routes/hf.js';
import searchRouter from './routes/search.js';
import weatherRouter from './routes/weather.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4030', 10);
const AVM_ADDRESS = process.env.AVM_ADDRESS ?? '';
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'https://facilitator.goplausible.xyz';

if (!AVM_ADDRESS) {
  console.error('❌ AVM_ADDRESS is required in .env');
  process.exit(1);
}

// ─── x402-avm Facilitator Client (GoPlausible) ───────────────────────────────
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

// ─── x402-avm Resource Server ─────────────────────────────────────────────────
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);
server.registerExtension(bazaarResourceServerExtension); // enables Bazaar auto-cataloging

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('json spaces', 2);

// ─── x402 Payment Middleware ──────────────────────────────────────────────────
// All routes listed here require USDC payment before the handler runs.
app.use(
  paymentMiddleware(
    {
      // ── LLM Chat Completions ─────────────────────────────────────────────
      'POST /v1/chat': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.005',
        },
        description: 'OpenAI-compatible chat completions with autonomous model routing (Groq)',
      },

      // ── Speech-to-Text ───────────────────────────────────────────────────
      'POST /v1/stt': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.01',
        },
        description: 'High-accuracy audio transcription (Groq Whisper-v3 / Deepgram Nova-3)',
      },

      // ── Text-to-Speech ───────────────────────────────────────────────────
      'POST /v1/tts': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.01',
        },
        description: 'Ultra-low latency TTS via Deepgram Aura-2',
      },

      // ── Image Generation ─────────────────────────────────────────────────
      'POST /v1/image': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.05',
        },
        description: 'AI image generation via Flux.1 [schnell] on fal.ai',
      },

      // ── IPFS Storage ─────────────────────────────────────────────────────
      'POST /v1/storage/upload': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.02',
        },
        description: 'Permanent decentralized IPFS storage via Pinata',
      },

      // ── Code Execution ───────────────────────────────────────────────────
      'POST /v1/compute/run': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.01',
        },
        description: 'Isolated code execution in 70+ languages (Piston)',
      },

      // ── HuggingFace Inference ────────────────────────────────────────────
      'POST /v1/hf': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.03',
        },
        description: 'Inference on any HuggingFace Serverless model',
      },

      // ── Web Search ───────────────────────────────────────────────────────
      'POST /v1/search': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.03',
        },
        description: 'Real-time web search via Tavily (LLM-ready output)',
      },

      // ── HyperLocal Weather (Bazaar Discovery) ────────────────────────────
      'GET /v1/weather': {
        accepts: {
          scheme: 'exact',
          network: ALGORAND_TESTNET_CAIP2,
          payTo: AVM_ADDRESS,
          price: '$0.01',
        },
        description: 'HyperLocal Weather Agent — real-time weather + 5-day forecast',
        extensions: declareDiscoveryExtension({
          input: { city: 'Mumbai', units: 'metric' },
          inputSchema: {
            properties: {
              city: { type: 'string', description: 'City name (e.g. Mumbai, London, New York)' },
              units: { type: 'string', enum: ['metric', 'imperial'] },
            },
            required: ['city'],
          },
          output: {
            example: {
              city: 'Mumbai',
              current: { temperature: 32.4, humidity: 78, condition: 'Partly Cloudy', windSpeed: 18.2 },
              forecast: [{ day: 'Mon', high: 35, low: 27, condition: 'Sunny', precipChance: 10 }],
            },
          },
        }),
      },
    },
    server,
  )
);

// ─── Route Handlers ───────────────────────────────────────────────────────────
// These run ONLY after successful x402 payment verification
app.use(llmRouter);
app.use(sttRouter);
app.use(ttsRouter);
app.use(imageRouter);
app.use(storageRouter);
app.use(computeRouter);
app.use(hfRouter);
app.use(searchRouter);
app.use(weatherRouter);

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
      'POST /v1/chat':          '$0.005 — LLM chat completions (Groq)',
      'POST /v1/stt':           '$0.010 — Speech-to-text',
      'POST /v1/tts':           '$0.010 — Text-to-speech',
      'POST /v1/image':         '$0.050 — Image generation',
      'POST /v1/storage/upload':'$0.020 — IPFS storage',
      'POST /v1/compute/run':   '$0.010 — Code execution',
      'POST /v1/hf':            '$0.030 — HuggingFace inference',
      'POST /v1/search':        '$0.030 — Web search',
      'GET  /v1/weather':       '$0.010 — Weather data + forecast',
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
  console.log('\n🚀 Agent API — Unified AI Layer');
  console.log(`   URL:         ${baseUrl}`);
  console.log(`   Facilitator: ${FACILITATOR_URL}`);
  console.log(`   Pay To:      ${AVM_ADDRESS}`);
  console.log(`   Network:     algorand:testnet (CAIP-2)`);
  console.log(`\n   Routes: /v1/chat | /v1/stt | /v1/tts | /v1/image | /v1/storage/upload | /v1/compute/run | /v1/hf | /v1/search | /v1/weather\n`);
});

export default app;
