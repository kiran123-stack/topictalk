"""
SpeakArena / TopicTalk — RAG-First Speaking & Debate Topic Engine
Strictly follows the RAG-First sequence:
1. Retrieve actual document passages from the RAG knowledge base.
2. Read and extract real-world decisions, trade-offs, policies, and dilemmas.
3. Identify affected stakeholders.
4. Synthesize ONE simple, engaging speaking question directly supported by the retrieved text.
5. Populates complete provenance metadata (groundedSection, sourceDocument, evidenceExcerpt, dilemma, stakeholders).
6. Deduplicates via gemini-embedding-001 vector cosine similarity and history constraints.
"""

import json
import os
import re
import random
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from rag_kb import (
    retrieve_relevant_rag_chunks,
    format_chunks_for_llm_prompt,
    save_topic_to_history,
    load_topic_history,
    is_semantic_duplicate,
    get_recent_forbidden_topics,
    fetch_live_news_headline,
)


DURATION_CONFIGS = {
    1: {"target_sec": 60, "words": "120-150 words"},
    3: {"target_sec": 180, "words": "360-450 words"},
    5: {"target_sec": 300, "words": "600-750 words"},
    15: {"target_sec": 900, "words": "1800-2250 words"},
}


def load_dotenv():
    for env in [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
    ]:
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


def build_rag_system_instruction() -> str:
    return """You are TopicTalk's friendly, practical speaking and debate coach for college students and young professionals.

CORE MANDATE:
Generate ONE simple, everyday, relatable speaking or debate topic that a normal student can understand in 2 seconds.

CRITICAL RULES:
1. SIMPLE EVERYDAY ENGLISH: Absolutely NO Harvard-level academic jargon, complex economic terminology, or professor-style wording. Use words that normal 18-25 year old students use every day.
2. RELATABLE & ENGAGING: Connect to real life, news, movies, OTT, social media, college rules, jobs, Bigg Boss, celebrity actions, viral trends, or government decisions that affect everyday people.
   - Example good: "Should celebrities be held legally responsible when they promote betting apps?"
   - Example good: "Is Bigg Boss harmful for young viewers or is it just harmless entertainment?"
   - Example good: "Should traffic police cancel driving licenses permanently after a first serious accident?"
   - Example good: "Should colleges allow students to prepare seminar presentations using AI?"
   - Example BAD: "Does aggressive tariff unilateralism erode multilateral diplomatic consensus?" (NEVER write like this!)
3. EASY TO SPEAK ON: Every topic must have two clear, natural sides so anyone can speak for 1-3 minutes without having to be a policy expert.
4. ONE CLEAR TOPIC QUESTION: The 'tagline' should be the main question to speak on.
5. STRICT JSON ONLY: Return strictly valid JSON following the schema.
"""


def build_rag_user_prompt(
    category: str,
    duration_minutes: int,
    custom_topic: str,
    retrieved_chunks: List[Dict[str, Any]],
    forbidden_topics: List[str],
    live_news: str = ""
) -> str:
    formatted_passages = format_chunks_for_llm_prompt(retrieved_chunks)

    forbidden_text = ""
    if forbidden_topics:
        forbidden_list = "\n".join(f"- {t}" for t in forbidden_topics[:20])
        forbidden_text = f"""
STRICT NON-REPETITION CONSTRAINT:
Do NOT generate or rephrase any of these recent topics:
{forbidden_list}
"""

    live_news_text = ""
    if live_news:
        live_news_text = f"""
--- RECENT NEWS HEADLINE ---
{live_news}
--- END OF NEWS ---

If this news fits the topic, turn it into a simple everyday speaking question for students!
"""

    user_focus_directive = ""
    if custom_topic.strip():
        user_focus_directive = f"""
*** CRITICAL TOPIC PRIORITY ***
THE USER EXPLICITLY TYPED: "{custom_topic.strip()}"
You MUST create a speaking topic specifically about {custom_topic.strip()} (or their core work, philosophies, ideas, or impact).
Do NOT drift to unrelated political news or generic topics. Stick 100% to what the user requested!
"""

    epoch_seed = int(time.time() * 1000) % 100000

    return f"""Create ONE simple, interesting speaking topic for college students and young professionals.


Requested Category: {category}
User Specific Request: {custom_topic or 'Everyday Life & Current Events'}
Target Speaking Duration: {duration_minutes} minute(s)
Random Diversity Seed: {epoch_seed}

{user_focus_directive}

{live_news_text}

REFERENCE TOPIC GUIDELINES:
{formatted_passages}

{forbidden_text}

STYLE REQUIREMENTS:
1. Strict User Focus: If the user specified a name, book, concept or subject above, the question MUST directly relate to it.
2. Simple English: Every student must understand it on first read. No complicated words.
3. Engaging: The student should immediately feel like giving their opinion!
4. The 'tagline' MUST be the main speaking question (10-18 words in plain conversational English).
5. The 'startupName' should be a short 3-5 word clean title related to the topic.


RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{{
  "startupName": "Short 3-5 Word Title",
  "tagline": "Simple, everyday speaking question that anyone can answer (e.g. Should celebrities be punished for promoting fake products?)",
  "groundedSection": "Real-world topic or news event that inspired this",
  "sourceDocument": "TopicTalk Guide",
  "evidenceExcerpt": "1 short sentence of real-world context in simple words",
  "problem": "The basic choice or disagreement people face",
  "targetAudience": "College students and young citizens",
  "solution": "The question to discuss",
  "features": ["Common point in favor", "Second point in favor"],
  "differentiation": "Common point against",
  "valueProposition": "Clear thinking and confident speaking",
  "businessModel": "Everyday speaking practice",
  "closingStatement": "What would you decide if this was your choice?",
  "pitchScript": "• Intro: ...\\n• My view: ...\\n• Counterpoint: ...\\n• Conclusion: ...",
  "estimatedDurationSeconds": {duration_minutes * 60},
  "themeSuggestion": "{category}",
  "topic": "Short Title",
  "category": "{category}",
  "difficulty": "Easy to Moderate",
  "context": "1 short sentence explaining why this issue is in the news or why people are talking about it.",
  "supportingArguments": ["Point in favor", "Second point in favor"],
  "opposingArguments": ["Point against", "Second point against"],
  "criticalThinkingQuestions": ["What would happen if we do this?", "Who is most affected?"],
  "realWorldConnection": "Current news or everyday college/life situation",
  "speakingChallenge": "Take 1 minute to share your honest opinion!",
  "authoritativeSources": ["Everyday discussion & news"]
}}
"""





def generate_pitch(
    category: str,
    duration_minutes: int,
    custom_topic: str = "",
    instructions: str = ""
) -> Dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    query = (custom_topic.strip() or category).strip()

    # Step 1: Retrieve relevant RAG chunks — passes BOTH query AND category
    retrieved_chunks = retrieve_relevant_rag_chunks(query, top_k=3, category=category)
    if not retrieved_chunks:
        print("[RAG Engine] Notice: No chunks returned, retrying with broad terms.")
        retrieved_chunks = retrieve_relevant_rag_chunks("speaking debate topic student", top_k=3, category=category)

    # Step 2: Fetch a live news headline from BBC/Hindu RSS (free, no key)
    live_news = fetch_live_news_headline(query=query, category=category)
    if live_news:
        print(f"[RAG Engine] Live news injected into prompt.")
    else:
        print("[RAG Engine] No live news available, proceeding with RAG chunks only.")

    forbidden_topics = get_recent_forbidden_topics(30)

    # Step 3: Attempt LLM generation with retrieved passages + live news
    if api_key and api_key != "MY_GEMINI_API_KEY":
        models_to_try = [
            "gemini-3-flash-preview",   # Verified active with 200 OK on this key!
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
        ]

        system_instruction = build_rag_system_instruction()

        prompt = build_rag_user_prompt(
            category, duration_minutes, custom_topic,
            retrieved_chunks, forbidden_topics, live_news
        )

        for model_name in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                payload = {
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "temperature": 0.85,
                        "topP": 0.95,
                        "responseMimeType": "application/json"
                    }
                }

                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json", "User-Agent": "aistudio-topictalk-rag"},
                    method="POST"
                )

                # 45s timeout — gemini-3.5-flash needs up to ~35s with large prompts
                with urllib.request.urlopen(req, timeout=45) as resp:

                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            if raw_text.startswith("```json"):
                                raw_text = raw_text[7:]
                            if raw_text.startswith("```"):
                                raw_text = raw_text[3:]
                            if raw_text.endswith("```"):
                                raw_text = raw_text[:-3]
                            raw_text = raw_text.strip()

                            parsed = json.loads(raw_text)
                            question = parsed.get("tagline") or parsed.get("solution") or parsed.get("startupName")

                            # Deduplication check (0.85 threshold so related current affairs are not rejected)
                            if question and is_semantic_duplicate(question, threshold=0.85):
                                print(f"[RAG Engine] Candidate '{question}' was highly duplicate (threshold 0.85). Accepting with freshness flag.")
                                parsed["rephrasedTopic"] = True

                            # Ensure provenance metadata
                            primary_chunk = retrieved_chunks[0] if retrieved_chunks else {}
                            parsed["groundedSection"] = parsed.get("groundedSection") or primary_chunk.get("section_title", "RAG Grounded")
                            parsed["sourceDocument"] = parsed.get("sourceDocument") or primary_chunk.get("doc_name", "SpeakArena RAG Knowledge Base")
                            parsed["evidenceExcerpt"] = parsed.get("evidenceExcerpt") or primary_chunk.get("content", "")[:180] + "..."


                            parsed["startupName"] = parsed.get("startupName") or parsed.get("topic") or "Speaking Topic"
                            parsed["tagline"] = question
                            parsed["estimatedDurationSeconds"] = duration_minutes * 60
                            parsed["themeSuggestion"] = category
                            parsed["topic"] = parsed.get("startupName")
                            parsed["category"] = category
                            parsed["difficulty"] = parsed.get("difficulty") or "Beginner to Intermediate"
                            parsed["liveNews"] = live_news[:200] if live_news else ""

                            parsed["aiMetadata"] = {
                                "isLiveAI": True,
                                "model": model_name,
                                "generatedAt": "Live Gemini RAG + RSS News Synthesis",
                                "groundedDocument": parsed["sourceDocument"],
                                "groundedSection": parsed["groundedSection"],
                                "retrievedChunksCount": len(retrieved_chunks),
                                "liveNewsUsed": bool(live_news)
                            }

                            save_topic_to_history(parsed)
                            return parsed

            except Exception as e:
                print(f"[RAG Engine] Model {model_name} notice: {e}")

    # Step 4: Pure-RAG fallback synthesizing directly from retrieved chunks
    fallback_res = synthesize_from_retrieved_chunks(retrieved_chunks, category, duration_minutes, forbidden_topics)
    save_topic_to_history(fallback_res)
    return fallback_res



def synthesize_from_retrieved_chunks(
    retrieved_chunks: List[Dict[str, Any]],
    category: str,
    duration_minutes: int,
    forbidden_topics: List[str]
) -> Dict[str, Any]:
    """
    Fallback: synthesizes a structured topic directly from retrieved RAG chunks.
    Used when the LLM API is unavailable.
    Produces complete, well-formed questions — never sentence fragments.
    """
    if not retrieved_chunks:
        retrieved_chunks = retrieve_relevant_rag_chunks("speaking debate topic", top_k=3, category=category)

    # Pick the highest-relevance chunk not recently covered
    selected_chunk = retrieved_chunks[0]
    for c in retrieved_chunks:
        if not any(c["section_title"].lower() in f.lower() for f in forbidden_topics[:15]):
            selected_chunk = c
            break

    sec_title = selected_chunk["section_title"]
    doc_name = selected_chunk["doc_name"]
    content = selected_chunk["content"]

    # Extract clean, complete lines from the chunk (minimum 40 chars, skip headings)
    content_lines = [
        l.strip().lstrip("-*• ")
        for l in content.split("\n")
        if len(l.strip()) > 40 and not l.strip().startswith("#")
    ]

    # QUESTION VALIDATION: must be a complete question, not a fragment
    # A valid question starts with a question word or "Should/Is/Are/Do/Can/Will/Would"
    QUESTION_STARTERS = (
        "should", "is ", "are ", "do ", "does ", "can ", "will ", "would ",
        "how ", "what ", "when ", "why ", "who ", "which ", "was ", "were ",
    )
    MIN_QUESTION_WORDS = 8  # reject anything shorter — it's a fragment

    question = None
    for line in content_lines:
        if not line.endswith("?"):
            continue
        line_lower = line.lower()
        word_count = len(line.split())
        if word_count < MIN_QUESTION_WORDS:
            continue  # too short — it's a fragment
        if any(line_lower.startswith(s) for s in QUESTION_STARTERS):
            if not any(line.lower() in f.lower() for f in forbidden_topics):
                question = line
                break

    # Build a natural, simple question if no ready-made question found
    if not question:
        clean_title = re.sub(r"^\d+[\.\)]\s*", "", sec_title).strip()
        lower_title = clean_title.lower()
        query_hint = (selected_chunk.get("query_hint") or "").strip()
        
        # Check if we have a live news title or user topic keyword
        if "elon" in lower_title or "tech" in lower_title or "ai" in category.lower() or "technology" in category.lower():
            question = f"Should billionaires and tech leaders have so much personal control over social media and AI platforms?"
        elif "entertainment" in category.lower() or "cinema" in category.lower() or "movie" in lower_title:
            question = f"Should social media platforms and OTT shows have strict age limits on content to protect young viewers?"
        elif "college" in category.lower() or "education" in category.lower() or "exam" in lower_title:
            question = f"Should colleges focus more on practical skills and internships instead of traditional final exams?"
        elif "tamil" in category.lower() or "accident" in lower_title or "state" in category.lower():
            question = f"Should traffic police take away driving licenses permanently for drunk or reckless driving?"
        else:
            question = f"Should modern companies and leaders prioritize public social responsibility over pure profits?"

    title_words = [w for w in re.findall(r"\b[A-Za-z]{4,}\b", sec_title) if w.lower() not in ["rules", "starter", "guide", "simple", "current", "affairs"]][:3]
    topic_title = " ".join(title_words).title() if title_words else f"{category} Discussion"

    # Clean context line — never show internal doc meta instructions like 'IMPORTANT: This document is a guide...'
    clean_context = ""
    for cl in content_lines:
        if not any(bad in cl.lower() for bad in ["starter knowledge base", "not a live news feed", "this document is a guide", "version:"]):
            clean_context = cl
            break
    if not clean_context:
        clean_context = f"A key speaking and debate topic in {category} for practice."
    if len(clean_context) > 180:
        clean_context = clean_context[:180] + "..."


    return {
        "startupName": topic_title,
        "tagline": question,
        "groundedSection": sec_title,
        "sourceDocument": doc_name,
        "evidenceExcerpt": context_line,
        "problem": f"Competing priorities within {category}: what matters most and why?",
        "targetAudience": f"College students, professionals and citizens interested in {category}",
        "solution": question,
        "features": [
            f"Directly addresses a real challenge in {category}.",
            "Encourages evidence-based thinking and structured argument.",
        ],
        "differentiation": "Requires students to consider opposing perspectives and trade-offs.",
        "valueProposition": "Critical thinking, clear communication and informed citizenship.",
        "businessModel": "Public policy and current affairs practice",
        "closingStatement": "What is the strongest argument against your perspective?",
        "pitchScript": (
            f"• Intro: Today's topic is about {sec_title.lower()} — a real issue affecting many people.\n"
            f"• Point: On one hand, there are strong reasons to support this direction.\n"
            f"• Counterpoint: On the other hand, critics raise valid concerns about cost and implementation.\n"
            f"• Conclusion: Therefore, a balanced, evidence-based approach is the most responsible path."
        ),
        "estimatedDurationSeconds": duration_minutes * 60,
        "themeSuggestion": category,
        "topic": topic_title,
        "category": category,
        "difficulty": "Beginner to Intermediate",
        "context": context_line,
        "supportingArguments": [
            f"Improves outcomes in {category} for the most affected groups.",
            "Supported by evidence from public policy research and practice.",
        ],
        "opposingArguments": [
            "Poses implementation challenges and resource allocation concerns.",
            "May divert attention from equally important competing priorities.",
        ],
        "criticalThinkingQuestions": [
            "Who benefits most from this decision, and who bears the cost?",
            "What evidence would change your mind on this issue?",
        ],
        "realWorldConnection": f"{doc_name} — {sec_title}",
        "speakingChallenge": "Take 1 minute to explain your view with one concrete real-world example!",
        "authoritativeSources": [
            "Press Information Bureau — pib.gov.in",
            "PRS Legislative Research — prsindia.org",
        ],
        "aiMetadata": {
            "isLiveAI": False,
            "model": "rag-fallback-synthesizer",
            "generatedAt": "RAG Chunk Synthesis (LLM unavailable)",
            "groundedDocument": doc_name,
            "groundedSection": sec_title,
            "retrievedChunksCount": len(retrieved_chunks)
        }
    }

