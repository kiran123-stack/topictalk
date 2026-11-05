"""
SpeakArena / TopicTalk — RAG Knowledge Base Engine (v3)
Ingests, chunks, indexes, and retrieves document passages from:
1. `knowledge_base.md`  (primary — rules + topic guide)
2. `public/assets/aistudio/speak_arena_simple_current_affairs_rag_22c6f2be.md`
3. `public/assets/aistudio/speaking_critical_thinking_rag_starter_d7e8077d.md`

Also fetches LIVE news headlines from free BBC/Hindu RSS feeds
to ground every generated topic in real current events.

Features:
- Full document chunking by markdown section headings
- Keyword / lexical retrieval (no embeddings API needed)
- Semantic vector retrieval when embeddings are available (optional boost)
- Live RSS news fetching (BBC, The Hindu, Reuters)
- Full provenance tracking (doc_name, section_title, evidence_excerpt)
- Persistent topic history and duplicate prevention
"""

import os
import json
import math
import re
import random
import time
import html as html_module
import xml.etree.ElementTree as ET
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple


WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOC_PATHS = [
    (
        os.path.join(WORKSPACE_ROOT, "knowledge_base.md"),
        "SpeakArena RAG Guide v3",
        "knowledge_base.md"
    ),
    (
        os.path.join(WORKSPACE_ROOT, "public", "assets", "aistudio", "speak_arena_simple_current_affairs_rag_22c6f2be.md"),
        "SpeakArena Simple Current Affairs RAG v2",
        "speak_arena_simple_current_affairs_rag_22c6f2be.md"
    ),
    (
        os.path.join(WORKSPACE_ROOT, "public", "assets", "aistudio", "speaking_critical_thinking_rag_starter_d7e8077d.md"),
        "Speaking & Critical Thinking RAG Starter",
        "speaking_critical_thinking_rag_starter_d7e8077d.md"
    ),
]

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "data", "topic_history.json")
EMBEDDINGS_FILE = os.path.join(os.path.dirname(__file__), "data", "topic_embeddings.json")
CHUNK_CACHE_FILE = os.path.join(os.path.dirname(__file__), "data", "rag_chunk_embeddings.json")


def load_dotenv():
    for env in [os.path.join(os.path.dirname(__file__), ".env"), os.path.join(WORKSPACE_ROOT, ".env")]:
        if os.path.exists(env):
            try:
                with open(env, "r", encoding="utf-8") as f:
                    for line in f:
                        if "=" in line and not line.strip().startswith("#"):
                            k, v = line.strip().split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k not in os.environ and v:
                                os.environ[k] = v
            except Exception:
                pass

load_dotenv()


class DocumentChunk:
    def __init__(self, chunk_id: str, doc_name: str, doc_file: str, section_title: str, content: str):
        self.chunk_id = chunk_id
        self.doc_name = doc_name
        self.doc_file = doc_file
        self.section_title = section_title
        self.content = content.strip()
        # Extract keywords for lexical search
        words = re.findall(r"\b[A-Za-z0-9\-\']{3,}\b", (section_title + " " + content).lower())
        self.keywords = set(words)
        self.embedding: Optional[List[float]] = None
        self.norm: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "doc_name": self.doc_name,
            "doc_file": self.doc_file,
            "section_title": self.section_title,
            "content": self.content,
        }


_CHUNKS_INDEX: List[DocumentChunk] = []


def chunk_document_markdown(file_path: str, doc_name: str, doc_file: str) -> List[DocumentChunk]:
    if not os.path.exists(file_path):
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            raw_text = f.read()
    except Exception as e:
        print(f"[RAG Ingestion] Error reading {file_path}: {e}")
        return []

    # Split on markdown headings (H1, H2, H3)
    sections = re.split(r"\n(?=#{1,3}\s)", raw_text)
    chunks: List[DocumentChunk] = []
    
    for idx, sec in enumerate(sections):
        sec = sec.strip()
        if not sec or len(sec) < 60:
            continue
        lines = sec.split("\n")
        title_line = lines[0].lstrip("#").strip()
        body_text = "\n".join(lines[1:]).strip()
        if not body_text:
            continue

        chunk_id = f"{doc_file}_{idx}"
        chunk = DocumentChunk(
            chunk_id=chunk_id,
            doc_name=doc_name,
            doc_file=doc_file,
            section_title=title_line,
            content=body_text
        )
        chunks.append(chunk)

    return chunks


def get_all_document_chunks() -> List[DocumentChunk]:
    global _CHUNKS_INDEX
    if _CHUNKS_INDEX:
        return _CHUNKS_INDEX

    all_chunks: List[DocumentChunk] = []
    for fpath, dname, dfile in DOC_PATHS:
        c = chunk_document_markdown(fpath, dname, dfile)
        all_chunks.extend(c)

    # Load precomputed high-dimensional embeddings into RAM
    cached_vectors: Dict[str, List[float]] = {}
    if os.path.exists(CHUNK_CACHE_FILE):
        try:
            with open(CHUNK_CACHE_FILE, "r", encoding="utf-8") as f:
                cached_vectors = json.load(f)
        except Exception as e:
            print(f"[RAG Ingestion] Notice reading chunk cache: {e}")

    loaded_count = 0
    for chunk in all_chunks:
        if chunk.chunk_id in cached_vectors:
            chunk.embedding = cached_vectors[chunk.chunk_id]
            chunk.norm = math.sqrt(sum(x * x for x in chunk.embedding))
            loaded_count += 1

    _CHUNKS_INDEX = all_chunks
    print(f"[RAG Ingestion] Ingested {len(_CHUNKS_INDEX)} authentic chunks across RAG knowledge base files ({loaded_count} pre-cached vectors active in RAM).")
    return _CHUNKS_INDEX


_QUERY_EMBED_CACHE: Dict[str, List[float]] = {}

def compute_gemini_embedding(text: str) -> Optional[List[float]]:
    global _QUERY_EMBED_CACHE
    clean_key = text.strip().lower()[:300]
    if clean_key in _QUERY_EMBED_CACHE:
        return _QUERY_EMBED_CACHE[clean_key]

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "MY_GEMINI_API_KEY":
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={api_key}"
    payload = {"content": {"parts": [{"text": text[:1200]}]}}

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            values = data.get("embedding", {}).get("values")
            if values and isinstance(values, list) and len(values) > 0:
                if len(_QUERY_EMBED_CACHE) > 200:
                    _QUERY_EMBED_CACHE.clear()
                _QUERY_EMBED_CACHE[clean_key] = values
                return values
    except Exception:
        pass
    return None


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


def retrieve_relevant_rag_chunks(query: str, top_k: int = 3, category: str = "") -> List[Dict[str, Any]]:
    """
    RAG Retrieval: Keyword/lexical matching (primary) + semantic vector (optional boost)
    Returns top_k document passages from the RAG knowledge base.
    Respects the user's actual query and category — never overrides it.
    """
    chunks = get_all_document_chunks()
    if not chunks:
        return []

    # Build search query from both user topic AND category
    combined = f"{query} {category}".strip()
    clean_query = combined.strip().lower()
    query_tokens = set(re.findall(r"\b[A-Za-z0-9\-\']{3,}\b", clean_query))

    # If still empty, use broad terms that match most knowledge base sections
    if not query_tokens:
        query_tokens = {"topic", "speaking", "debate", "current", "news", "student"}

    # 1. Optional: semantic embedding boost (gracefully skipped if unavailable)
    q_vec = compute_gemini_embedding(clean_query)
    q_norm = math.sqrt(sum(a * a for a in q_vec)) if q_vec else 0.0

    scored_chunks: List[Tuple[float, DocumentChunk]] = []

    for chunk in chunks:
        # Lexical score: keyword overlap between query and chunk text
        overlap = len(query_tokens.intersection(chunk.keywords))
        lexical_score = overlap / max(1, len(query_tokens))

        # Extra boost when query words appear in the section title
        title_lower = chunk.section_title.lower()
        if any(t in title_lower for t in query_tokens):
            lexical_score += 0.6

        # Semantic embedding score (only when embeddings exist)
        semantic_score = 0.0
        if q_norm > 0.0 and chunk.embedding and chunk.norm > 0.0:
            dot = sum(a * b for a, b in zip(q_vec, chunk.embedding))
            semantic_score = dot / (q_norm * chunk.norm)

        # Keyword is primary (60%), semantic is a bonus (40%)
        final_score = (lexical_score * 0.6) + (semantic_score * 0.4)
        scored_chunks.append((final_score, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    results: List[Dict[str, Any]] = []
    seen_titles = set()
    for score, chunk in scored_chunks:
        if chunk.section_title in seen_titles:
            continue
        seen_titles.add(chunk.section_title)
        results.append({
            "chunk_id": chunk.chunk_id,
            "doc_name": chunk.doc_name,
            "doc_file": chunk.doc_file,
            "section_title": chunk.section_title,
            "content": chunk.content,
            "relevance_score": round(score, 3)
        })
        if len(results) >= top_k:
            break

    return results




def format_chunks_for_llm_prompt(chunks: List[Dict[str, Any]]) -> str:
    """Formats retrieved document chunks into clean markdown blocks for the model."""
    if not chunks:
        return "No specific document passages retrieved."

    formatted = []
    for idx, c in enumerate(chunks, 1):
        content_snippet = c['content'][:600].strip()
        formatted.append(
            f"--- [PASSAGE {idx}] ---\n"
            f"SOURCE: {c['doc_name']} | SECTION: {c['section_title']}\n"
            f"CONTENT:\n{content_snippet}\n"
        )
    return "\n".join(formatted)



# =========================================================================
# Live RSS News Fetcher — Free, No API Key Required
# =========================================================================

# Map categories to relevant BBC/Hindu/Entertainment RSS feeds
_RSS_FEEDS: Dict[str, str] = {
    "world":         "http://feeds.bbci.co.uk/news/world/rss.xml",
    "india":         "https://www.thehindu.com/news/national/feeder/default.rss",
    "entertainment": "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "technology":    "http://feeds.bbci.co.uk/news/technology/rss.xml",
    "business":      "http://feeds.bbci.co.uk/news/business/rss.xml",
    "health":        "http://feeds.bbci.co.uk/news/health/rss.xml",
    "science":       "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "default":       "http://feeds.bbci.co.uk/news/rss.xml",
}

_CATEGORY_FEED_MAP: Dict[str, str] = {
    "world":         "world",
    "international": "world",
    "global":        "world",
    "india":         "india",
    "tamil":         "india",
    "central government": "india",
    "state gov":     "india",
    "upsc":          "india",
    "entertainment": "entertainment",
    "cinema":        "entertainment",
    "movie":         "entertainment",
    "ott":           "entertainment",
    "actor":         "entertainment",
    "film":          "entertainment",
    "bigg boss":     "entertainment",
    "celebrity":     "entertainment",
    "technology":    "technology",
    "tech":          "technology",
    "ai":            "technology",
    "digital":       "technology",
    "business":      "business",
    "economy":       "business",
    "jobs":          "business",
    "mba":           "business",
    "health":        "health",
    "science":       "science",
    "environment":   "science",
}


_live_news_cache: Dict[str, str] = {}  # simple in-memory cache


def fetch_live_news_headline(query: str = "", category: str = "") -> str:
    """
    Fetches one live news headline + summary from a free RSS feed.
    Tries to match the feed to the user's category, then filters
    items by query keywords.
    Returns a formatted string ready to inject into the LLM prompt.
    Returns "" if news cannot be fetched (network error etc.).
    """
    cache_key = f"{category.lower()[:40]}|{query.lower()[:40]}"
    if cache_key in _live_news_cache:
        return _live_news_cache[cache_key]

    # Pick the best feed for the user's category
    cat_lower = category.lower()
    feed_key = "default"
    for key, val in _CATEGORY_FEED_MAP.items():
        if key in cat_lower:
            feed_key = val
            break

    feed_url = _RSS_FEEDS.get(feed_key, _RSS_FEEDS["default"])
    query_words = set(re.findall(r"\b[A-Za-z]{3,}\b", query.lower())) if query else set()

    try:
        req = urllib.request.Request(
            feed_url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; TopicTalk/1.0; +https://topictalk.app)"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            xml_data = resp.read().decode("utf-8", errors="ignore")

        root = ET.fromstring(xml_data)
        channel = root.find("channel")
        if channel is None:
            return ""

        items = channel.findall("item")
        if not items:
            return ""

        best_item = None

        # 1. Try to find an item matching query keywords
        if query_words:
            for item in items[:25]:
                title_el = item.find("title")
                desc_el = item.find("description")
                title_text = html_module.unescape(title_el.text or "") if title_el is not None else ""
                desc_text = html_module.unescape(desc_el.text or "") if desc_el is not None else ""
                combined_text = (title_text + " " + desc_text).lower()
                if any(w in combined_text for w in query_words):
                    best_item = item
                    break
            # If user gave a specific topic and no news matched, do NOT inject an unrelated headline!
            if best_item is None:
                return ""
        else:
            # Only pick the top headline if user did not provide a specific search query
            best_item = items[0]


        title_el = best_item.find("title")
        desc_el = best_item.find("description")
        pub_el = best_item.find("pubDate")
        link_el = best_item.find("link")

        title = html_module.unescape(title_el.text or "").strip() if title_el is not None else ""
        desc = html_module.unescape(desc_el.text or "").strip() if desc_el is not None else ""
        pub = (pub_el.text or "").strip() if pub_el is not None else ""
        link = (link_el.text or "").strip() if link_el is not None else ""

        # Strip any residual HTML tags from description
        desc = re.sub(r"<[^>]+>", "", desc).strip()
        desc = desc[:350] if len(desc) > 350 else desc

        if not title:
            return ""

        result = (
            f"LIVE NEWS HEADLINE (fetched now from RSS):\n"
            f"Title: {title}\n"
            f"Published: {pub}\n"
            f"Summary: {desc}\n"
            f"Source: {link}"
        )

        # Cache for this request session
        _live_news_cache[cache_key] = result
        print(f"[Live News] Fetched: {title[:80]}")
        return result

    except Exception as e:
        print(f"[Live News] RSS fetch failed ({feed_url}): {e}")
        return ""


# =========================================================================
# Persistent Topic History & Semantic Duplicate Detection
# =========================================================================


def load_topic_history() -> List[Dict[str, Any]]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def load_topic_embeddings() -> Dict[str, List[float]]:
    if not os.path.exists(EMBEDDINGS_FILE):
        return {}
    try:
        with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def is_semantic_duplicate(candidate_question: str, threshold: float = 0.70) -> bool:
    clean = candidate_question.strip().lower()
    history = load_topic_history()

    # Exact or near string matching
    for h in history[-30:]:
        q = h.get("question", "").strip().lower()
        t = h.get("title", "").strip().lower()
        if clean == q or clean == t:
            return True
        if len(clean) > 20 and (clean in q or q in clean):
            return True

    # Vector cosine similarity
    cand_vec = compute_gemini_embedding(candidate_question)
    if not cand_vec:
        return False

    embeddings = load_topic_embeddings()
    for past_q, past_vec in embeddings.items():
        sim = cosine_similarity(cand_vec, past_vec)
        if sim >= threshold:
            print(f"[RAG Deduplication] Semantic duplicate detected (sim={sim:.2f}) with past topic: '{past_q}'")
            return True

    return False


def save_topic_to_history(topic_record: Dict[str, Any]) -> None:
    """
    Privacy Guarantee:
    Saves strictly anonymous debate question text strings for duplicate prevention.
    ZERO user data, user speech, audio, IP, session token, or personal identifiers are stored.
    Rolling window is strictly capped at 50 public debate topics.
    """
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    history = load_topic_history()

    title = topic_record.get("startupName") or topic_record.get("topic") or "Untitled Topic"
    question = topic_record.get("tagline") or title

    entry = {
        "title": title,
        "question": question,
        "category": topic_record.get("category", "General"),
        "groundedSection": topic_record.get("groundedSection", ""),
        "sourceDocument": topic_record.get("sourceDocument", ""),
        "timestamp": datetime.now().isoformat(),
    }
    history.append(entry)
    # Strictly cap at 50 to prevent unbounded disk growth
    if len(history) > 50:
        history = history[-50:]

    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception:
        pass

    vec = compute_gemini_embedding(question)
    if vec:
        embeddings = load_topic_embeddings()
        embeddings[question] = vec
        if len(embeddings) > 50:
            keys = list(embeddings.keys())
            for k in keys[:-50]:
                del embeddings[k]
        try:
            with open(EMBEDDINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(embeddings, f)
        except Exception:
            pass


def get_recent_forbidden_topics(limit: int = 25) -> List[str]:
    history = load_topic_history()
    recent = []
    for h in reversed(history):
        q = h.get("question") or h.get("title")
        if q and q not in recent:
            recent.append(q)
        if len(recent) >= limit:
            break
    return recent
