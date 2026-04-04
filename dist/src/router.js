import Groq from 'groq-sdk';
let _groq = null;
function getGroq() {
    if (!_groq) {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is missing in environment variables');
        }
        _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return _groq;
}
const MODEL_MAP = {
    SIMPLE: 'llama-3.1-8b-instant', // Fast, cheap, handles easy tasks
    MEDIUM: 'llama-4-scout-17b-16e-instruct', // Balanced performance
    COMPLEX: 'llama-3.3-70b-versatile', // Smartest, handles hard reasoning
};
// ─── Classify Prompt Complexity ───────────────────────────────────────────────
// Uses the cheapest Groq model to classify the prompt in ~100ms.
// Returns a complexity level which maps to the appropriate model.
export async function classifyPrompt(messages) {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content ?? '';
    const classification = await getGroq().chat.completions.create({
        model: 'llama-3.1-8b-instant',
        max_tokens: 5,
        temperature: 0,
        messages: [
            {
                role: 'system',
                content: 'You are a routing agent. Classify the following user prompt as exactly one of: SIMPLE, MEDIUM, or COMPLEX.\n' +
                    '- SIMPLE: casual chat, simple questions, greetings, translation, summarization of short text.\n' +
                    '- MEDIUM: multi-step reasoning, writing a paragraph, light coding (< 20 lines), data analysis.\n' +
                    '- COMPLEX: advanced code generation, debugging large codebases, long-form research, math proofs, multi-step logic.\n' +
                    'Reply ONLY with the single word: SIMPLE, MEDIUM, or COMPLEX.',
            },
            {
                role: 'user',
                content: lastUserMessage.slice(0, 500), // Limits token usage for the classifier
            },
        ],
    });
    const raw = classification.choices[0]?.message?.content?.trim().toUpperCase() ?? 'SIMPLE';
    const complexity = ['SIMPLE', 'MEDIUM', 'COMPLEX'].includes(raw) ? raw : 'SIMPLE';
    return complexity;
}
// ─── Route to Best Model ──────────────────────────────────────────────────────
// Returns the Groq model ID for a given complexity level.
export function getModelForComplexity(complexity) {
    return MODEL_MAP[complexity];
}
