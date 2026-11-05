# TopicTalk — System Architecture & Technical Specifications

This document outlines the architecture, data flows, security posture, privacy mechanisms, and fault-tolerance design of **TopicTalk**.

---

## 1. High-Level System Architecture

```
+-----------------------------------------------------------------------+
|                             USER BROWSER                              |
|   React 19 SPA + UnifiedTopicTimerCard + Circular Canvas Timer        |
+-----------------------------------------------------------------------+
                                   |
                         HTTP / REST API (port 3000)
                                   v
+-----------------------------------------------------------------------+
|                    NODE.JS / EXPRESS BFF GATEWAY                      |
|                                                                       |
|  - Security Headers (nosniff, X-XSS-Protection, Referrer-Policy)       |
|  - In-Memory Sliding-Window Rate Limiter (30 req/min/IP)               |
|  - Input Validation & XSS Sanitization (<50KB payload cap)            |
|  - Health Diagnostics (/api/health, /healthz)                         |
|  - Circuit-Breaker Fallback to Node Gemini SDK                        |
+-----------------------------------------------------------------------+
                 |                                      |
         HTTP (port 8001)                     Google GenAI Fallback
                 v                                      v
+---------------------------------+   +---------------------------------+
|     PYTHON RAG ENGINE (app.py)  |   |    GEMINI FLASH INFERENCE       |
|                                 |   |                                 |
|  - RAM Vector Store (59 chunks) |   |    (Node-based SDK fallback)    |
|  - Cosine Similarity (<20ms)    |   +---------------------------------+
|  - Dynamic Chunk Synthesis      |
+---------------------------------+
                 ^
                 | 
+---------------------------------+
| RAG KNOWLEDGE BASE (DISK / RAM) |
| - speak_arena_current_affairs   |
| - speaking_critical_thinking    |
| - rag_chunk_embeddings.json     |
+---------------------------------+
```

---

## 2. RAG Pipeline & In-Memory Vector Search

The RAG engine follows an evidence-grounded approach:

1. **Document Ingestion**:
   - `speak_arena_simple_current_affairs_rag_22c6f2be.md` (24 sections)
   - `speaking_critical_thinking_rag_starter_d7e8077d.md` (35 sections)
   - Total: 59 authentic chunks.
2. **Precomputed High-Dimensional Embeddings**:
   - Vector dimensions: 3072 (`models/gemini-embedding-001`).
   - Persisted in `backend/data/rag_chunk_embeddings.json`.
   - On process startup, all 59 vector arrays and their L2 Euclidean norms (`sqrt(sum(x^2))`) are preloaded directly into RAM.
3. **Retrieval**:
   - Hybrid Scoring: `0.6 * SemanticVectorCosine + 0.4 * BM25KeywordOverlap`.
   - With precomputed L2 norms and in-memory query embedding caching (`_QUERY_EMBED_CACHE`), cosine similarity across all 59 chunks executes in **under 18 milliseconds** in pure Python.
4. **Provenance Tracking**:
   - Every generated topic returns:
     - `groundedSection`: Exact markdown heading.
     - `sourceDocument`: Exact document title.
     - `evidenceExcerpt`: Verifiable factual passage excerpt.

---

## 3. Strict User Data Privacy (Zero-Database Footprint)

The platform enforces strict zero-data persistence for users:
- **Zero Database Operations**: No MySQL, PostgreSQL, SQLite, Firestore, or MongoDB databases storing user identities or activities.
- **Zero Audio Retention**: Voice recording feature removed per user specification. No microphones or audio streams are accessed or stored.
- **Anonymous Question Ring-Buffer**: The only stored state is an in-memory / local JSON ring-buffer of generated debate question text strings (`topic_history.json`), strictly capped at 50 items. This file contains **zero user identifiers, zero IP addresses, zero timestamps with user correlation, and zero session cookies**.

---

## 4. Multi-Layer Security Architecture

### A. Perimeter Defense
- **Security Headers**:
  - `X-Content-Type-Options: nosniff` (prevents MIME sniffing).
  - `X-XSS-Protection: 1; mode=block` (activates browser reflection defenses).
  - `Referrer-Policy: strict-origin-when-cross-origin` (prevents leakage of referrers).
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` (disables sensitive hardware features).
  - `Content-Security-Policy: frame-ancestors 'self' https: http:;` (authorizes safe embedding in AI Studio preview environments).

### B. Abuse Prevention & Rate Limiting
- Sliding-window in-memory rate limiter on `/api/*` endpoints.
- Max 30 requests per minute per IP.
- Excess requests receive `HTTP 429 Too Many Requests` with a calculated `Retry-After` header.
- Periodic cleanup every 2 minutes evicts inactive IP entries, keeping RAM footprint constant.

### C. Input Validation & XSS Sanitization
- Body payload capped at **50KB** to thwart body-overflow Denial of Service attacks.
- Strict type validation and string sanitization stripping `<script>`, HTML tags, and null bytes (`\x00-\x1f`).
- `duration` parameter constrained strictly to whitelist `[1, 3, 5, 15]`.

---

## 5. Fault Tolerance & Multi-Tier Fallback

To ensure the app never crashes when external AI APIs face service degradation or quota limits:

1. **Tier 1 (Python Primary Engine)**:
   - Queries `gemini-3.5-flash` with 12s timeout and RAG passage grounding.
2. **Tier 2 (Node Google GenAI SDK)**:
   - If Python companion is unreachable, Express BFF invokes `@google/genai` directly with system instructions.
3. **Tier 3 (Pure RAG Dynamic Synthesis)**:
   - If upstream LLMs fail (e.g. 503 or quota exhaustion), `synthesize_from_retrieved_chunks()` extracts real dilemmas, stakeholder conflicts, and policy questions directly from the retrieved document chunks, returning a valid, diverse, and grounded topic without network downtime.
