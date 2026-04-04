import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';

const router = Router();

// ─── POST /v1/compute ─────────────────────────────────────────────────────────
// Executes code in a self-hosted Piston sandbox (requires Docker).
// Setup: docker run -d -p 2000:2000 ghcr.io/engineer-man/piston
router.post('/v1/compute', async (req: Request, res: Response) => {
  const { language, code, stdin = '', args = [] } = req.body;

  if (!language || typeof language !== 'string') {
    res.status(400).json({ error: 'language field is required (e.g. "python", "javascript", "rust")' });
    return;
  }
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ error: 'code field is required and must be a non-empty string' });
    return;
  }

  const primaryUrl = config.compute.pistonUrl;
  const fallbackUrl = config.compute.pistonFallbackUrl;

  async function tryExecute(url: string, isFallback: boolean): Promise<boolean> {
    try {
      // First fetch available runtimes to validate language + get version
      const runtimesRes = await fetch(`${url}/api/v2/runtimes`);
      if (!runtimesRes.ok) throw new Error('Piston runtimes endpoint unavailable');
      const runtimes = await runtimesRes.json() as { language: string; version: string; aliases: string[] }[];

      const runtime = runtimes.find(
        r => r.language === language.toLowerCase() || r.aliases.includes(language.toLowerCase())
      );

      if (!runtime) {
        res.status(400).json({
          error: `Language '${language}' not supported.`,
          supported: runtimes.map(r => r.language),
        });
        return true; // Sent 400, stop
      }

      // Execute the code
      const execRes = await fetch(`${url}/api/v2/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [{ name: `main.${getExtension(runtime.language)}`, content: code }],
          stdin,
          args,
          run_timeout: 10000,
          compile_timeout: 15000,
        }),
      });

      if (!execRes.ok) {
        throw new Error(`Piston returned ${execRes.status}: ${await execRes.text()}`);
      }

      const result = await execRes.json() as {
        run: { stdout: string; stderr: string; code: number; signal: string | null };
        compile?: { stdout: string; stderr: string; code: number };
      };

      res.json({
        stdout: result.run.stdout,
        stderr: result.run.stderr,
        exit_code: result.run.code,
        signal: result.run.signal,
        compile: result.compile ?? null,
        language: runtime.language,
        version: runtime.version,
        provider: isFallback ? 'piston-public' : 'piston-local',
      });
      return true;
    } catch (err: any) {
      if (!isFallback && (err.code === 'ECONNREFUSED' || err.message.includes('fetch failed'))) {
        console.warn(`[compute] Local Piston unreachable at ${url}, falling back to public API...`);
        return false; // Try fallback
      }
      console.error(`[compute] Piston error (${isFallback ? 'public' : 'local'}):`, err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: 'Code execution failed', details: msg, provider: isFallback ? 'public' : 'local' });
      return true;
    }
  }

  const handled = await tryExecute(primaryUrl, false);
  if (!handled) {
    await tryExecute(fallbackUrl, true);
  }
});

function getExtension(language: string): string {
  const map: Record<string, string> = {
    python: 'py', javascript: 'js', typescript: 'ts', go: 'go',
    rust: 'rs', java: 'java', 'c++': 'cpp', c: 'c', ruby: 'rb',
    php: 'php', bash: 'sh', kotlin: 'kt',
  };
  return map[language.toLowerCase()] ?? 'txt';
}

export default router;
