import 'dotenv/config';

/**
 * Unified Configuration for the Agent API.
 * Centralizes all environment variables and provides reasonable defaults.
 */
export const config = {
  server: {
    port: parseInt(process.env.PORT ?? '4030', 10),
    serviceUrl: process.env.SERVICE_URL ?? 'http://localhost:4030',
    host: '0.0.0.0', // Required for Railway/Docker compatibility
  },
  x402: {
    avmAddress: process.env.AVM_ADDRESS ?? '',
    facilitatorUrl: process.env.FACILITATOR_URL ?? 'https://facilitator.goplausible.xyz',
  },
  providers: {
    groq: {
      apiKey: process.env.GROQ_API_KEY ?? '',
    },
    deepgram: {
      apiKey: process.env.DEEPGRAM_API_KEY ?? '',
    },
    fal: {
      key: process.env.FAL_KEY ?? '',
    },
    pinata: {
      jwt: process.env.PINATA_JWT ?? '',
      gateway: process.env.PINATA_GATEWAY ?? 'gateway.pinata.cloud',
    },
    hf: {
      accessToken: process.env.HF_ACCESS_TOKEN ?? '',
    },
    tavily: {
      apiKey: process.env.TAVILY_API_KEY ?? '',
    },
  },
  compute: {
    pistonUrl: process.env.PISTON_URL ?? 'http://localhost:2000',
    pistonFallbackUrl: 'https://emkc.org/api/v2/piston',
  },
};

// Validation
if (!config.x402.avmAddress) {
  console.warn('⚠️ AVM_ADDRESS is missing in environment variables.');
}
