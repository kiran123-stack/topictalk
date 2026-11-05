# TopicTalk — Simple Speaking & Critical Thinking Studio

**TopicTalk** (powered by SpeakArena) is a production-grade, privacy-first web application designed to help students, job seekers, and aspiring public speakers practice articulation and debate. Grounded in authentic current affairs and critical thinking documents, TopicTalk uses a hybrid RAG (Retrieval-Augmented Generation) pipeline to formulate concise, neutral, and thought-provoking speaking challenges.

---

## Key Features

- **RAG-First Grounded Generation**: Ingests, indexes, and retrieves from authoritative markdown documents (`speak_arena_simple_current_affairs_rag_22c6f2be.md` and `speaking_critical_thinking_rag_starter_d7e8077d.md`).
- **Sub-20ms In-Memory Vector Search**: 59 precomputed 3072-dimensional embeddings (`gemini-embedding-001`) loaded directly into RAM with precalculated L2 norms.
- **Strict Zero-User-PII Privacy**: Operates with a zero-database footprint. No user speech, audio, IP, personal profile, or user-generated recordings are ever stored.
- **Semantic Deduplication**: Vector cosine similarity and rolling history constraints prevent repetitive or rephrased questions.
- **Unified Clean UI**: Clean white glassmorphic card design matching reference specifications, with live circular countdown timer, direct RAG provenance tag, and 1-click navigation.
- **Enterprise-Grade Security**: Includes security headers (`nosniff`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`), sliding-window rate limiting (30 req/min/IP), strict input sanitization, and standardized RFC-compliant error responses.

---

## Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas circular clock |
| **BFF / Proxy Server** | Node.js, Express, TypeScript (`tsx`), Vite middleware mode |
| **RAG & Inference Engine** | Python 3, Gemini 3.5 Flash / Flash Lite, `gemini-embedding-001` (3072-dim) |
| **Knowledge Base** | 59 authentic chunk embeddings cached in RAM (`rag_chunk_embeddings.json`) |

---

## Quick Start & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- Valid `GEMINI_API_KEY` (in `.env`)

### 1. Installation
Dependencies are pre-configured:
```bash
npm install
```

### 2. Environment Configuration
Create or inspect `.env`:
```env
PORT=3000
PYTHON_PORT=8001
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

### 3. Development Mode
Starts both the Node.js Express server on port 3000 and the Python RAG companion engine on port 8001:
```bash
npm run dev
```

### 4. Running Production Build
```bash
npm run build
npm start
```

### 5. Automated Tests
Runs the end-to-end production readiness, security, latency, and schema test suite:
```bash
npm test
```

---

## API Endpoints

### `POST /api/generate-pitch`
Generates a grounded speaking topic.
- **Rate Limit**: 30 requests / minute per IP (returns 429 when exceeded).
- **Request Body**:
  ```json
  {
    "category": "Current Affairs",
    "duration": 1,
    "customTopic": "Public Bus Fares",
    "instructions": ""
  }
  ```
- **Response**: Standardized JSON containing topic question, RAG provenance section, source document, supporting and opposing arguments.

### `GET /api/health` and `/healthz`
Health check diagnostics returning:
```json
{
  "status": "healthy",
  "service": "topictalk-backend",
  "uptimeSeconds": 142,
  "memoryUsageMb": 54,
  "pythonEngine": "connected",
  "geminiAvailable": true,
  "timestamp": "2026-11-05T09:50:00.000Z"
}
```

---

## Zero-PII Privacy Compliance
TopicTalk is engineered specifically for privacy-sensitive student environments:
1. No user account creation or login required.
2. No database storing personal profiles, audio streams, or user inputs.
3. The only persisted local state is a non-personal rolling ring-buffer of public debate question strings (capped at 50 items) used strictly for duplicate prevention.
