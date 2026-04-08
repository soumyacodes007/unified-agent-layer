import { config } from './config.js';
import Groq from 'groq-sdk';

export type GroqReasoningEffort = 'none' | 'default' | 'low' | 'medium' | 'high';
export type GroqReasoningFormat = 'parsed' | 'raw' | 'hidden';

export interface ChatMessage {
  role: string;
  content: unknown;
}

export interface GroqModelSpec {
  id: string;
  name: string;
  provider: string;
  stage: 'production' | 'preview' | 'system';
  type: 'chat' | 'reasoning' | 'agentic' | 'safety';
  contextWindow: number;
  maxCompletionTokens: number;
  capabilities: string[];
  reasoningEfforts?: readonly GroqReasoningEffort[];
  supportsReasoningFormat?: boolean;
  description: string;
}

export interface RoutingDecision {
  model: GroqModelSpec;
  requestedModel: string;
  normalizedModel: string;
  mode: 'auto' | 'explicit';
  reason: string;
}

export const GROQ_CHAT_MODELS: Record<string, GroqModelSpec> = {
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'Meta',
    stage: 'production',
    type: 'chat',
    contextWindow: 131072,
    maxCompletionTokens: 131072,
    capabilities: ['fast', 'low-cost', 'general-chat'],
    description: 'Fastest low-cost general-purpose text model on Groq.',
  },
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'Meta',
    stage: 'production',
    type: 'chat',
    contextWindow: 131072,
    maxCompletionTokens: 32768,
    capabilities: ['general-chat', 'writing', 'analysis', 'multilingual'],
    description: 'High-quality general-purpose model for richer analysis and writing.',
  },
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B 16E Instruct',
    provider: 'Meta',
    stage: 'preview',
    type: 'chat',
    contextWindow: 131072,
    maxCompletionTokens: 8192,
    capabilities: ['balanced', 'tool-use', 'vision-ready', 'instruction-following'],
    description: 'Balanced instruct model with strong tool-use and general task performance.',
  },
  'openai/gpt-oss-20b': {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B',
    provider: 'OpenAI',
    stage: 'production',
    type: 'reasoning',
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    capabilities: ['reasoning', 'tool-use', 'json-mode', 'json-schema', 'multilingual'],
    reasoningEfforts: ['low', 'medium', 'high'],
    description: 'Fast reasoning model with strong structured output and tool-use support.',
  },
  'openai/gpt-oss-120b': {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'OpenAI',
    stage: 'production',
    type: 'reasoning',
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    capabilities: ['reasoning', 'tool-use', 'browser-search', 'code-execution', 'json-mode', 'json-schema'],
    reasoningEfforts: ['low', 'medium', 'high'],
    description: 'Highest-capability open-weight Groq model for hard reasoning and coding.',
  },
  'qwen/qwen3-32b': {
    id: 'qwen/qwen3-32b',
    name: 'Qwen 3 32B',
    provider: 'Qwen',
    stage: 'preview',
    type: 'reasoning',
    contextWindow: 131072,
    maxCompletionTokens: 40960,
    capabilities: ['reasoning', 'multilingual', 'long-context', 'json-mode'],
    reasoningEfforts: ['none', 'default'],
    supportsReasoningFormat: true,
    description: 'Strong multilingual and long-context reasoning model.',
  },
  'groq/compound': {
    id: 'groq/compound',
    name: 'Groq Compound',
    provider: 'Groq',
    stage: 'system',
    type: 'agentic',
    contextWindow: 131072,
    maxCompletionTokens: 8192,
    capabilities: ['web-search', 'visit-website', 'code-execution', 'browser-automation', 'wolfram-alpha'],
    description: 'Agentic Groq system with multi-step built-in tool use.',
  },
  'groq/compound-mini': {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini',
    provider: 'Groq',
    stage: 'system',
    type: 'agentic',
    contextWindow: 131072,
    maxCompletionTokens: 8192,
    capabilities: ['web-search', 'visit-website', 'code-execution', 'browser-automation', 'wolfram-alpha'],
    description: 'Lower-latency Groq system for single built-in tool call tasks.',
  },
  'openai/gpt-oss-safeguard-20b': {
    id: 'openai/gpt-oss-safeguard-20b',
    name: 'GPT-OSS Safeguard 20B',
    provider: 'OpenAI',
    stage: 'preview',
    type: 'safety',
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    capabilities: ['safety', 'moderation', 'prompt-defense'],
    reasoningEfforts: ['low', 'medium', 'high'],
    description: 'Safety-focused GPT-OSS model for moderation and guardrail tasks.',
  },
  'meta-llama/llama-prompt-guard-2-22m': {
    id: 'meta-llama/llama-prompt-guard-2-22m',
    name: 'Llama Prompt Guard 2 22M',
    provider: 'Meta',
    stage: 'preview',
    type: 'safety',
    contextWindow: 512,
    maxCompletionTokens: 512,
    capabilities: ['prompt-injection-detection', 'safety'],
    description: 'Small prompt safety model for prompt-injection and unsafe input checks.',
  },
  'meta-llama/llama-prompt-guard-2-86m': {
    id: 'meta-llama/llama-prompt-guard-2-86m',
    name: 'Llama Prompt Guard 2 86M',
    provider: 'Meta',
    stage: 'preview',
    type: 'safety',
    contextWindow: 512,
    maxCompletionTokens: 512,
    capabilities: ['prompt-injection-detection', 'safety'],
    description: 'Larger prompt safety model for prompt-injection and unsafe input checks.',
  },
};

export const GROQ_MODEL_ALIASES: Record<string, string> = {
  'llama-4-scout-17b-16e-instruct': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'gpt-oss-20b': 'openai/gpt-oss-20b',
  'gpt-oss-120b': 'openai/gpt-oss-120b',
  'gpt-oss-safeguard-20b': 'openai/gpt-oss-safeguard-20b',
  'qwen3-32b': 'qwen/qwen3-32b',
  compound: 'groq/compound',
  'compound-mini': 'groq/compound-mini',
};

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    const apiKey = config.providers.groq.apiKey;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is missing in environment variables');
    }
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

function normalizeMessagePart(part: unknown): string {
  if (typeof part === 'string') return part;
  if (!part || typeof part !== 'object') return '';

  const maybePart = part as Record<string, unknown>;
  if (typeof maybePart.text === 'string') return maybePart.text;
  if (typeof maybePart.input_text === 'string') return maybePart.input_text;
  if (typeof maybePart.content === 'string') return maybePart.content;
  return '';
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(normalizeMessagePart).filter(Boolean).join('\n');
  return '';
}

function getConversationText(messages: ChatMessage[]): string {
  return messages.map((message) => normalizeMessageContent(message.content)).filter(Boolean).join('\n');
}

function getLastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      return normalizeMessageContent(messages[i].content);
    }
  }
  return '';
}

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getAutoRoute(messages: ChatMessage[]): Omit<RoutingDecision, 'requestedModel' | 'normalizedModel' | 'mode'> {
  const conversationText = getConversationText(messages);
  const lastUserMessage = getLastUserMessage(messages);
  const combined = `${conversationText}\n${lastUserMessage}`.toLowerCase();
  const charCount = conversationText.length;
  const estimatedTokens = estimateTokens(conversationText);
  const messageCount = messages.length;

  const needsSafety = matches(combined, [
    /\bmoderation\b/i,
    /\bsafety check\b/i,
    /\bprompt injection\b/i,
    /\bunsafe\b/i,
    /\bpolicy violation\b/i,
    /\bred team\b/i,
    /\bguardrail\b/i,
  ]);

  const needsLiveTools = matches(combined, [
    /\bcurrent\b/i,
    /\blatest\b/i,
    /\btoday\b/i,
    /\brecent\b/i,
    /\bnews\b/i,
    /\bsearch\b/i,
    /\bbrowse\b/i,
    /\blook up\b/i,
    /\bvisit website\b/i,
    /\bopen website\b/i,
    /\bcode execution\b/i,
    /\bexecute code\b/i,
    /\bwolfram\b/i,
  ]);

  const hasCode = matches(combined, [
    /```/,
    /\btypescript\b/i,
    /\bjavascript\b/i,
    /\bpython\b/i,
    /\bjava\b/i,
    /\bc\+\+\b/i,
    /\bsql\b/i,
    /\bdebug\b/i,
    /\bexception\b/i,
    /\bstack trace\b/i,
    /\btraceback\b/i,
    /\brefactor\b/i,
    /\bfunction\b/i,
    /\bclass\b/i,
    /\bcompiler\b/i,
  ]);

  const needsHeavyReasoning = matches(combined, [
    /\broot cause\b/i,
    /\barchitecture\b/i,
    /\btradeoff\b/i,
    /\bprove\b/i,
    /\bproof\b/i,
    /\bderive\b/i,
    /\boptimi[sz]e\b/i,
    /\banalyze\b/i,
    /\bresearch\b/i,
    /\bplan\b/i,
    /\balgorithm\b/i,
    /\bcomplex\b/i,
    /\bstep by step\b/i,
  ]);

  const needsJson = matches(combined, [
    /\bjson\b/i,
    /\bjson schema\b/i,
    /\bstructured output\b/i,
    /\bschema\b/i,
    /\bparseable\b/i,
    /\bstrict format\b/i,
  ]);

  const isMultilingualOrLongContext = matches(combined, [
    /\btranslate\b/i,
    /\bmultilingual\b/i,
    /\bbilingual\b/i,
    /\barabic\b/i,
    /\bhindi\b/i,
    /\bspanish\b/i,
    /\bfrench\b/i,
    /\bgerman\b/i,
    /\bjapanese\b/i,
    /\bkorean\b/i,
    /\bchinese\b/i,
  ]) || estimatedTokens > 6000 || charCount > 24000;

  const isVerySimple = !hasCode
    && !needsHeavyReasoning
    && !needsJson
    && !needsLiveTools
    && !isMultilingualOrLongContext
    && messageCount <= 3
    && charCount <= 600;

  if (needsSafety) {
    return {
      model: GROQ_CHAT_MODELS['openai/gpt-oss-safeguard-20b'],
      reason: 'Auto-routed to a safety-focused Groq model for moderation or prompt-defense work.',
    };
  }

  if (needsLiveTools) {
    const useCompound = needsHeavyReasoning || hasCode || estimatedTokens > 3000 || messageCount > 6;
    return {
      model: GROQ_CHAT_MODELS[useCompound ? 'groq/compound' : 'groq/compound-mini'],
      reason: useCompound
        ? 'Auto-routed to Groq Compound for multi-step tool use such as live search or code execution.'
        : 'Auto-routed to Groq Compound Mini for a lower-latency built-in tool call task.',
    };
  }

  if (hasCode && needsHeavyReasoning) {
    return {
      model: GROQ_CHAT_MODELS['openai/gpt-oss-120b'],
      reason: 'Auto-routed to GPT-OSS 120B for high-difficulty coding or debugging.',
    };
  }

  if (isMultilingualOrLongContext) {
    return {
      model: GROQ_CHAT_MODELS['qwen/qwen3-32b'],
      reason: 'Auto-routed to Qwen 3 32B for multilingual or long-context work.',
    };
  }

  if (needsHeavyReasoning) {
    return {
      model: GROQ_CHAT_MODELS['llama-3.3-70b-versatile'],
      reason: 'Auto-routed to Llama 3.3 70B for deeper analysis and richer general reasoning.',
    };
  }

  if (hasCode || needsJson) {
    return {
      model: GROQ_CHAT_MODELS['meta-llama/llama-4-scout-17b-16e-instruct'],
      reason: 'Auto-routed to Llama 4 Scout for balanced instruction following, tools, and structured tasks.',
    };
  }

  if (isVerySimple) {
    return {
      model: GROQ_CHAT_MODELS['llama-3.1-8b-instant'],
      reason: 'Auto-routed to the fastest low-cost Groq chat model for a simple prompt.',
    };
  }

  return {
    model: GROQ_CHAT_MODELS['openai/gpt-oss-20b'],
    reason: 'Auto-routed to GPT-OSS 20B as the default Groq reasoning model for general chat.',
  };
}

export function listGroqChatModels(): GroqModelSpec[] {
  return Object.values(GROQ_CHAT_MODELS);
}

export function resolveGroqChatModel(model: string): GroqModelSpec | null {
  const normalized = GROQ_MODEL_ALIASES[model] ?? model;
  return GROQ_CHAT_MODELS[normalized] ?? null;
}

export function routeGroqChatModel(messages: ChatMessage[], requestedModel = 'auto'): RoutingDecision {
  const normalizedModel = GROQ_MODEL_ALIASES[requestedModel] ?? requestedModel;

  if (normalizedModel !== 'auto') {
    const model = resolveGroqChatModel(normalizedModel);
    if (!model) {
      const supported = listGroqChatModels().map((entry) => entry.id).join(', ');
      throw new Error(`Unsupported Groq model '${requestedModel}'. Supported models: ${supported}`);
    }

    return {
      model,
      requestedModel,
      normalizedModel: model.id,
      mode: 'explicit',
      reason: model.id === requestedModel
        ? 'Explicit Groq model selected by caller.'
        : `Explicit Groq model alias '${requestedModel}' normalized to '${model.id}'.`,
    };
  }

  const autoRoute = getAutoRoute(messages);
  return {
    ...autoRoute,
    requestedModel,
    normalizedModel: autoRoute.model.id,
    mode: 'auto',
  };
}

export function supportsReasoningEffort(modelId: string): boolean {
  return Boolean(GROQ_CHAT_MODELS[modelId]?.reasoningEfforts?.length);
}

export function supportsReasoningFormat(modelId: string): boolean {
  return Boolean(GROQ_CHAT_MODELS[modelId]?.supportsReasoningFormat);
}

export function getAllowedReasoningEfforts(modelId: string): readonly GroqReasoningEffort[] {
  return GROQ_CHAT_MODELS[modelId]?.reasoningEfforts ?? [];
}

export async function listLiveGroqModels(): Promise<unknown> {
  return getGroq().models.list();
}
