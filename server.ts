import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const PYTHON_PORT = 8001;

// Initialize Google GenAI client as per gemini-api skill
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Spawn Python backend process as companion
let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  const pythonScript = path.join(__dirname, 'backend', 'app.py');
  console.log(`[Server] Launching Python backend from ${pythonScript}...`);

  pythonProcess = spawn('python3', [pythonScript], {
    env: {
      ...process.env,
      PYTHON_PORT: String(PYTHON_PORT),
    },
    stdio: 'inherit',
  });

  pythonProcess.on('error', (err) => {
    console.error('[Server] Failed to start Python backend:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Server] Python backend exited with code ${code}, signal ${signal}`);
  });
}

startPythonBackend();

process.on('exit', () => {
  if (pythonProcess) pythonProcess.kill();
});

process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit();
});

// Security & Rate Limiting Configurations
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

// Auto-cleanup stale rate-limit records every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (val.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 2 * 60 * 1000).unref();

function rateLimitMiddleware(req: Request, res: Response, next: express.NextFunction): void {
  const clientKey = req.ip || req.socket.remoteAddress || 'client';
  const now = Date.now();
  let record = rateLimitMap.get(clientKey);

  if (!record || record.resetTime < now) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(clientKey, record);
  } else {
    record.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a moment before generating another speaking topic.',
      },
    });
    return;
  }
  next();
}

// Input sanitization helper to neutralize XSS, null bytes, and script injection
function sanitizeInput(val: unknown, maxLen = 200): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') // remove control chars
    .replace(/<[^>]*>/g, '') // strip HTML/script tags
    .trim()
    .slice(0, maxLen);
}

// Security Headers Middleware
app.use((_req: Request, res: Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Allow AI Studio preview and standard iframes while defending against clickjacking
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https: http:;");
  next();
});

// Middleware for parsing json with strict payload limit (50KB) to prevent DoS
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Health Check Endpoints (/api/health and /healthz)
app.get(['/api/health', '/healthz'], async (_req: Request, res: Response): Promise<void> => {
  let pythonStatus = 'unknown';
  try {
    const check = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    pythonStatus = check.ok ? 'connected' : 'error';
  } catch {
    pythonStatus = 'offline';
  }

  res.json({
    status: 'healthy',
    service: 'topictalk-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    pythonEngine: pythonStatus,
    geminiAvailable: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

// Duration word targets
const DURATION_TARGETS: Record<number, { words: string; sec: number }> = {
  1: { words: '120-150 words', sec: 60 },
  3: { words: '360-450 words', sec: 180 },
  5: { words: '600-750 words', sec: 300 },
  15: { words: '1800-2250 words', sec: 900 },
};

// Primary /api/generate-pitch handler routing to Python RAG Engine with Node Gemini fallback
app.post('/api/generate-pitch', rateLimitMiddleware, async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body || {};
  const category = sanitizeInput(rawBody.category || 'tech', 80);
  const rawDuration = Number(rawBody.duration);
  const numDuration = [1, 3, 5, 15].includes(rawDuration) ? rawDuration : 1;
  const customTopic = sanitizeInput(rawBody.customTopic || '', 200);
  const instructions = sanitizeInput(rawBody.instructions || '', 300);
  const topic = customTopic || category;
  const cfg = DURATION_TARGETS[numDuration] || DURATION_TARGETS[1];

  // 1. Primary: Route to Python RAG Engine (which uses the uploaded Speaking & Critical Thinking Knowledge Base)
  try {
    const pythonUrl = `http://127.0.0.1:${PYTHON_PORT}/api/generate-pitch`;
    const pyResp = await fetch(pythonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, duration: numDuration, customTopic: topic, instructions }),
      signal: AbortSignal.timeout(16000), // 16-second timeout for RAG synthesis
    });

    if (pyResp.ok) {
      const data = await pyResp.json();
      if (data && data.success && data.pitch) {
        res.json(data);
        return;
      }
    }
  } catch (pyErr: any) {
    console.warn('[Server] Python RAG engine notice:', pyErr.message);
  }

  // 2. Fallback using Node Google GenAI client if Python is temporarily unreachable
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      console.log(`[Gemini API Fallback] Generating speaking topic for: "${topic}" (${numDuration}m)...`);

      const systemInstruction = `You are TopicTalk's expert debate mentor for students, grounded in Current Affairs RAG v2.
CORE PRINCIPLE: Simple language. Real issue. Interesting choice. Two or more defensible views.
PRIORITISE:
1. Latest Indian news and government decisions.
2. State government performance, including Tamil Nadu (e.g., free public bus transport, morning breakfast scheme, power tariff adjustments).
3. Government schemes and real-world impact (PM Awas, Ayushman Bharat, MGNREGA, Free Ration).
4. Jobs, education, colleges, economy, and AI impact on fresh graduates.
5. International developments.
Convert news into one short, neutral, thought-provoking question for college students. Never repeat topics.
Output STRICT JSON ONLY.`;

      const randomSeed = Date.now() % 100000;
      const userPrompt = `Create ONE brand-new, unique current affairs speaking topic:
Category: "${category}"
Topic Focus: "${topic}"
Speaking Time: ${numDuration} minute(s)
Diversity Seed: ${randomSeed}
${instructions ? `User guidance: "${instructions}"` : ''}

RULES:
- ONE clear, neutral, interesting question (12-18 words) that any college student understands immediately.
- Connect to a real public decision, trade-off, or development (include Tamil Nadu state welfare or national schemes where relevant).
- Must have at least two defensible viewpoints.

Return JSON with exact keys:
{
  "startupName": "Short 3-6 Word Topic Title",
  "tagline": "One clear, neutral question in plain English (e.g. Should state governments spend more on free public transport or improving bus quality?)",
  "problem": "1-2 short sentences giving factual background.",
  "targetAudience": "College students, citizens, policymakers",
  "solution": "The central question to debate",
  "features": ["Key argument FOR", "Secondary argument FOR"],
  "differentiation": "Key counterargument AGAINST",
  "valueProposition": "Public welfare and fairness",
  "businessModel": "Real-world public policy",
  "closingStatement": "What is the strongest argument against your opinion?",
  "pitchScript": "• Intro: ...\\n• Point: ...\\n• Counterpoint: ...\\n• Conclusion: ...",
  "estimatedDurationSeconds": ${cfg.sec},
  "themeSuggestion": "${category}",
  "topic": "Short Topic Title",
  "category": "${category}",
  "difficulty": "Beginner to Intermediate",
  "context": "1-2 short sentences giving factual background.",
  "supportingArguments": ["Argument 1", "Argument 2"],
  "opposingArguments": ["Counter 1", "Counter 2"],
  "criticalThinkingQuestions": ["Question 1?", "Question 2?"],
  "realWorldConnection": "Government Policy & Public Services",
  "speakingChallenge": "Take 1 minute to explain your perspective clearly!",
  "authoritativeSources": ["Press Information Bureau (pib.gov.in)", "Government of Tamil Nadu (tn.gov.in)", "PRS Legislative Research (prsindia.org)"]
}`;

      const candidateModels = [
        'gemini-3.5-flash-lite',
        process.env.GEMINI_MODEL,
        'gemini-3.8-flash',
        'gemini-flash-latest',
      ].filter(Boolean) as string[];

      const startTime = Date.now();

      for (const modelName of candidateModels) {
        try {
          const geminiPromise = ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.85,
            },
          });

          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 10000)
          );

          const response: any = await Promise.race([geminiPromise, timeoutPromise]);

          if (response && response.text) {
            let cleanText = response.text.trim();
            if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
            if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
            if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
            cleanText = cleanText.trim();

            const parsed = JSON.parse(cleanText);
            if (parsed.startupName || parsed.topic) {
              parsed.startupName = parsed.startupName || parsed.topic;
              parsed.tagline = parsed.tagline || parsed.speakingChallenge;
              parsed.estimatedDurationSeconds = cfg.sec;
              parsed.themeSuggestion = category;
              parsed.aiMetadata = {
                isLiveAI: true,
                model: modelName,
                generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                generationLatencyMs: Date.now() - startTime,
                promptTopic: topic,
                uniquenessMoat: 'Grounded via Speaking & Critical Thinking Starter',
              };
              res.json({ success: true, pitch: parsed });
              return;
            }
          }
        } catch (mErr: any) {
          console.warn(`[Gemini API Fallback] Model ${modelName} error: ${mErr.message}`);
        }
      }
    } catch (err: any) {
      console.warn(`[Gemini API Fallback] Notice: ${err.message}`);
    }
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'GENERATION_UNAVAILABLE',
      message: 'Unable to synthesize speaking topic at this time. Please retry.',
    },
  });
});

// Proxy other /api calls to Python with rate limiting
app.all('/api/*', rateLimitMiddleware, async (req: Request, res: Response): Promise<void> => {
  const targetUrl = `http://127.0.0.1:${PYTHON_PORT}${req.originalUrl}`;
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || 'application/json';
    const textData = await response.text();
    res.status(response.status).header('Content-Type', contentType).send(textData);
  } catch (error) {
    res.status(502).json({
      success: false,
      error: { code: 'BACKEND_UNAVAILABLE', message: 'Companion RAG backend is temporarily unavailable' },
    });
  }
});

// Vite middleware in dev or static files in production
async function configureFrontend() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

await configureFrontend();

// Global Express Error Handler Middleware (never leaks stack traces)
app.use((err: any, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[Server Internal Error]', err?.message || 'Unknown error');
  if (res.headersSent) return;
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again.',
    },
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] AI Pitch Studio running on http://0.0.0.0:${PORT}`);
});
