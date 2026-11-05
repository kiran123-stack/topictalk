"""
SpeakArena / TopicTalk — RAG Pipeline Audit & Verification Script
Runs end-to-end testing as requested in Section 7:
1. Generates 10 test topics using the real RAG knowledge base.
2. Displays the question, retrieved document, grounded section, stakeholders, and dilemma for each.
3. Tests semantic duplicate detection via vector cosine similarity.
4. Tests edge-case queries where no exact document match exists.
"""

import os
import sys
import json
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from rag_kb import (
    retrieve_relevant_rag_chunks,
    is_semantic_duplicate,
    compute_gemini_embedding,
    cosine_similarity,
    get_all_document_chunks
)
from pitch_engine import generate_pitch

def run_tests():
    print("=" * 70)
    print("SPEAKARENA / TOPICTALK: RAG PIPELINE VERIFICATION TEST")
    print("=" * 70)

    # 1. Verify Document Ingestion
    chunks = get_all_document_chunks()
    print(f"\n[TEST 1] Document Ingestion Check:")
    print(f"Total authentic markdown chunks indexed: {len(chunks)}")
    unique_docs = set(c.doc_name for c in chunks)
    print(f"Documents ingested: {list(unique_docs)}")
    assert len(chunks) > 20, "Expected at least 20 chunks from uploaded RAG files."

    # 2. Generate 10 Diverse Topics Grounded in RAG Knowledge Base
    print("\n" + "=" * 70)
    print("[TEST 2] Generating 10 Grounded Topics from RAG Knowledge Base:")
    print("=" * 70)

    test_queries = [
        ("State Gov & Tamil Nadu", "Tamil Nadu free bus travel and public transport infrastructure"),
        ("Government Decisions", "Government recruitment upper age limit relaxation"),
        ("Jobs & Economy", "Generative AI replacing entry-level office jobs for fresh graduates"),
        ("Central Schemes", "Direct bank cash transfers vs subsidized food grains through ration shops"),
        ("Education & Colleges", "Compulsory college internships vs equal access for rural students"),
        ("State Gov & Tamil Nadu", "School morning breakfast scheme nutrition vs infrastructure funding"),
        ("Government Decisions", "Railway automatic train protection Kavach vs bullet train corridors"),
        ("Jobs & Economy", "Gig worker social security pension and healthcare protections"),
        ("Central Schemes", "PM Surya Ghar rooftop solar panels vs recurring free electricity units"),
        ("International Affairs", "Global trade import tariffs vs domestic electronics manufacturing")
    ]

    results = []
    for idx, (category, query) in enumerate(test_queries, 1):
        print(f"\n>>> Running Topic {idx}/10: Category='{category}' | Focus='{query}'")
        start_time = time.time()
        pitch = generate_pitch(category, 1, query)
        duration_ms = int((time.time() - start_time) * 1000)

        q = pitch.get("tagline") or pitch.get("solution") or pitch.get("startupName")
        section = pitch.get("groundedSection", "N/A")
        doc = pitch.get("sourceDocument", "N/A")
        stakeholders = pitch.get("targetAudience", "N/A")
        dilemma = pitch.get("problem", "N/A")
        excerpt = pitch.get("evidenceExcerpt", "N/A")[:120]

        print(f"  • Question: '{q}'")
        print(f"  • Grounded Section: {section}")
        print(f"  • Source Document: {doc}")
        print(f"  • Stakeholders: {stakeholders}")
        print(f"  • Dilemma: {dilemma}")
        print(f"  • Latency: {duration_ms}ms")

        results.append({
            "index": idx,
            "category": category,
            "query": query,
            "question": q,
            "section": section,
            "document": doc,
            "stakeholders": stakeholders,
            "dilemma": dilemma
        })

    # 3. Test Semantic Duplicate Detection
    print("\n" + "=" * 70)
    print("[TEST 3] Testing Semantic Duplicate Detection (Embedding Vector Cosine Similarity):")
    print("=" * 70)
    
    first_q = results[0]["question"]
    print(f"Testing exact duplicate check for: '{first_q}'")
    is_dup = is_semantic_duplicate(first_q, threshold=0.70)
    print(f"Result for identical question duplicate check: {is_dup} (Expected: True)")
    assert is_dup is True, "Expected exact duplicate to be detected."

    # Test rephrased version
    rephrased = first_q.replace("Should", "Do you think").replace("spend more on", "invest heavily into")
    print(f"\nTesting rephrased version: '{rephrased}'")
    is_rephrased_dup = is_semantic_duplicate(rephrased, threshold=0.70)
    print(f"Result for semantically similar question: {is_rephrased_dup}")

    # 4. Test Obscure Query with Graceful Grounding
    print("\n" + "=" * 70)
    print("[TEST 4] Testing Obscure Query (Edge Case):")
    print("=" * 70)
    obscure_pitch = generate_pitch("General", 1, "quantum space archaeology on Mars")
    print(f"Obscure Query Question: '{obscure_pitch.get('tagline')}'")
    print(f"Grounded Section: '{obscure_pitch.get('groundedSection')}'")
    assert obscure_pitch.get("tagline"), "Expected non-empty question for obscure query."

    print("\n" + "=" * 70)
    print("ALL 4 RAG PIPELINE VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return results

if __name__ == "__main__":
    run_tests()
