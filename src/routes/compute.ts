import { Router, type Request, type Response } from 'express';

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

  const pistonUrl = process.env.PISTON_URL;
  if (!pistonUrl) {
    res.status(503).json({
      error: 'Compute service is not configured.',
      setup: 'Run: docker run -d -p 2000:2000 ghcr.io/engineer-man/piston and set PISTON_URL=http://localhost:2000',
    });
    return;
  }

  try {
    // First fetch available runtimes to validate language + get version
    const runtimesRes = await fetch(`${pistonUrl}/api/v2/runtimes`);
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
      return;
    }

    // Execute the code
    const execRes = await fetch(`${pistonUrl}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: `main.${getExtension(runtime.language)}`, content: code }],
        stdin,
        args,
        run_timeout: 10000,  // 10 second timeout
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
      provider: 'piston',
    });
  } catch (err: unknown) {
    console.error('[compute] Piston error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: 'Code execution failed', details: msg });
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
