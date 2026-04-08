# API Documentation — Unified AI Layer

This project provides a unified, x402-gated AI API layer on Algorand. All requests (except public endpoints) require USDC micropayments per request.

## Authentication & Payments
All API endpoints use the **x402 payment protocol**. 
- **Network**: Algorand Testnet (`algorand:testnet`)
- **Payment Method**: USDC (Micropayments)
- **Status Code**: `402 Payment Required` is returned if payment is missing or invalid.

---

## Public Endpoints

### API Overview
`GET /`
Returns basic metadata about the API, supported endpoints, and the receiving Algorand address.

### Health Check
`GET /health`
Returns system status and uptime.

---

## Protected Endpoints (v1)

### LLM Chat Completions
`POST /v1/chat`
**Price**: $0.005
OpenAI-compatible chat completions with Groq auto-routing or explicit model selection.

**Request Body**:
```json
{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "model": "auto",
  "temperature": 0.7,
  "max_completion_tokens": 2048
}
```
**Supported Models**: `auto`, `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `meta-llama/llama-4-scout-17b-16e-instruct`, `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3-32b`, `groq/compound`, `groq/compound-mini`, `openai/gpt-oss-safeguard-20b`, `meta-llama/llama-prompt-guard-2-22m`, `meta-llama/llama-prompt-guard-2-86m`.

**Groq-Specific Optional Fields**:
- `reasoning_effort`: `low`, `medium`, `high` for GPT-OSS models; `none`, `default` for Qwen 3.
- `include_reasoning`: Boolean toggle for returning reasoning when the selected model supports it.
- `reasoning_format`: `parsed`, `raw`, or `hidden` for Qwen 3.
- `tools`, `tool_choice`, `response_format`: Passed through for Groq models that support tool use or structured outputs.

### List Chat Models
`GET /v1/chat/models`
Returns the Groq-backed chat model registry exposed by this API, including capabilities and limits.

---

### Speech-to-Text (STT)
`POST /v1/stt`
**Price**: $0.010
High-accuracy audio transcription (Deepgram Nova-3).

**Request**: `multipart/form-data`
- `audio`: Audio file (mp3, wav, ogg, flac). Max 25MB.

---

### Text-to-Speech (TTS)
`POST /v1/tts`
**Price**: $0.010
Ultra-low latency TTS (Deepgram Aura-2). Returns raw MP3 audio.

**Request Body**:
```json
{
  "text": "The quick brown fox jumps over the lazy dog.",
  "voice": "aura-2-en-us"
}
```

---

### Image Generation
`POST /v1/image`
**Price**: $0.050
AI image generation via Flux.1 [schnell] on fal.ai.

**Request Body**:
```json
{
  "prompt": "A futuristic city at sunset, synthwave style",
  "model": "flux-schnell",
  "width": 1024,
  "height": 1024
}
```

---

### IPFS Storage
`POST /v1/storage`
**Price**: $0.020
Permanent decentralized IPFS storage via Pinata.

**Request**: `multipart/form-data`
- `file`: Any file. Max 100MB.

---

### Code Execution (Compute)
`POST /v1/compute`
**Price**: $0.010
Isolated code execution in 70+ languages via self-hosted Piston.

**Request Body**:
```json
{
  "language": "python",
  "code": "print('Hello from Python!')",
  "stdin": "",
  "args": []
}
```

---

### HuggingFace Inference
`POST /v1/hf`
**Price**: $0.030
Inference on any HuggingFace Serverless model.

**Request Body**:
```json
{
  "model": "gpt2",
  "inputs": "The meaning of life is",
  "parameters": {}
}
```

---

### Web Search
`POST /v1/search`
**Price**: $0.030
Real-time web search via Tavily (LLM-ready output).

**Request Body**:
```json
{
  "query": "Who won the World Series in 2024?",
  "search_depth": "basic",
  "max_results": 5
}
```

---

### HyperLocal Weather
`GET /v1/weather`
**Price**: $0.010
Bazaar-discoverable weather agent providing real-time data and 5-day forecasts.

**Query Parameters**:
- `city`: City name (default: Mumbai)
- `units`: `metric` (default) or `imperial`
