// ─── Pricing Map ─────────────────────────────────────────────────────────────
// Defines the x402 price for each route. All prices are in USD string format.
// The price field is used by the paymentMiddleware to generate the 402 challenge.

export const PRICING = {
  // LLM Inference (Groq)
  'POST /v1/chat': '$0.02',           // "auto" model - router picks cheapest viable

  // Speech-to-Text (Deepgram Nova-3)
  'POST /v1/stt': '$0.05',            // Per audio file/request

  // Text-to-Speech (Deepgram Aura-2)
  'POST /v1/tts': '$0.02',            // Per text-to-speech request

  // Image Generation (fal.ai Flux)
  'POST /v1/image': '$0.05',          // flux-schnell default; flux-pro charges more

  // Storage (Pinata IPFS)
  'POST /v1/storage': '$0.01',        // Per file upload to IPFS

  // Compute (Piston - self-hosted Docker)
  'POST /v1/compute': '$0.10',        // Per code execution job

  // HuggingFace (any model via dynamic route)
  'POST /v1/hf/:model': '$0.03',      // Per inference request to any HF model
} as const;

// ─── Model-Specific Prices for Explicit LLM Selection ────────────────────────
// When an agent specifies a model explicitly, the 402 price adjusts accordingly.
export const LLM_PRICES: Record<string, string> = {
  'auto':                         '$0.02',  // Router decides (Cheap Llama by default)
  'llama-3.1-8b-instant':         '$0.01',  // Fastest, cheapest
  'llama-4-scout-17b-16e-instruct': '$0.03',  // Balanced
  'llama-3.3-70b-versatile':      '$0.05',  // Smartest
};

// ─── Image Model Prices ───────────────────────────────────────────────────────
export const IMAGE_PRICES: Record<string, string> = {
  'flux-schnell': '$0.05',   // fal-ai/flux/schnell — fast, good quality
  'flux-dev':     '$0.10',   // fal-ai/flux/dev — better quality
  'flux-pro':     '$0.15',   // fal-ai/flux-pro — best quality
};
