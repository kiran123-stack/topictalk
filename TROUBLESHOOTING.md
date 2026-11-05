# TopicTalk — Operational Troubleshooting & Runbook

This guide helps diagnose, resolve, and operate common issues in **TopicTalk**.

---

## 1. Quick Diagnostic Checklist

Check system health immediately by visiting or curling the health endpoint:
```bash
curl -s http://127.0.0.1:3000/api/health
```
Expected output:
```json
{
  "status": "healthy",
  "service": "topictalk-backend",
  "pythonEngine": "connected",
  "geminiAvailable": true
}
```

---

## 2. Common Scenarios & Solutions

### Scenario A: HTTP 429 Too Many Requests
- **Symptom**: Client receives `{"success": false, "error": {"code": "RATE_LIMIT_EXCEEDED"}}`.
- **Cause**: Client IP made more than 30 topic generation requests within a 60-second sliding window.
- **Resolution**:
  - The response includes a `Retry-After: <seconds>` header.
  - The client UI shows a user-friendly notice to pause briefly before requesting a new topic.
  - Normal users will not hit this threshold during standard speaking intervals (1m - 5m).

### Scenario B: Python Companion Engine Shows `offline`
- **Symptom**: `GET /api/health` reports `"pythonEngine": "offline"`.
- **Cause**: Python backend process terminated or port 8001 is conflicted.
- **Resolution**:
  - Verify Python 3 is installed: `python3 --version`.
  - Check whether another process is using port 8001: `lsof -i :8001`.
  - The Node.js Express server automatically falls back to the native Node Google GenAI client, ensuring zero user-facing downtime.

### Scenario C: Gemini API 503 / High Latency
- **Symptom**: Upstream model timeouts or Google API returns 503 Service Unavailable.
- **Resolution**:
  - TopicTalk incorporates a multi-tier fallback mechanism:
    1. Tries `gemini-3.5-flash`.
    2. Tries `gemini-3.5-flash-lite`.
    3. Activates Tier 3 Pure-RAG dynamic synthesis directly from cached document chunks in `backend/rag_kb.py`.
  - The user always receives an authentic, grounded speaking challenge within seconds.

### Scenario D: Missing or Rebuilding Vector Cache
- **Symptom**: Ingestion reports 0 pre-cached vectors.
- **Resolution**:
  - The precomputed embeddings are stored in `backend/data/rag_chunk_embeddings.json`.
  - To regenerate all embeddings, run:
    ```bash
    python3 -c "from backend.rag_kb import get_all_document_chunks; print('Ingested:', len(get_all_document_chunks()))"
    ```

### Scenario E: WebSocket Connection Notice in Browser
- **Symptom**: `[vite] failed to connect to websocket` in browser console.
- **Cause**: Vite HMR WebSocket connection in iframe or container environments where WebSocket proxying is restricted.
- **Resolution**:
  - Harmless dev-mode behavior. `index.html` has an unhandled rejection listener installed that intercepts and suppresses this notice without affecting application functionality.

---

## 3. Running Automated Tests

Run the full automated test suite anytime to verify system integrity:
```bash
npm test
```
Or directly:
```bash
python3 backend/test_production.py
```
This tests:
1. RAG chunk vector cache presence.
2. RAM retrieval latency (< 50ms SLA).
3. Zero-user-PII privacy enforcement.
4. Cosine similarity accuracy.
5. Input sanitization against XSS payloads.
6. Schema completeness.
7. Semantic deduplication.
