#!/usr/bin/env python3
"""
Leo: Seed additional writer memories from their published content
Extract patterns, opinions, anecdotes, and cross-references from existing articles
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

print("=" * 100)
print("LEO: SEED ADDITIONAL WRITER MEMORIES")
print("=" * 100)
print()

# Get writer IDs
writers_result = supabase.table("writers").select("id, slug, name").execute()
writer_map = {w['slug']: {'id': w['id'], 'name': w['name']} for w in writers_result.data}

# Define memory entries to seed based on published content analysis
new_memories = []

# SARAH'S MEMORIES (extracted from her 14 articles)
sarah_id = writer_map['sarah']['id']

new_memories.extend([
    {
        "writer_id": sarah_id,
        "memory_type": "pattern_identified",
        "title": "Thyroid adaptation vs dysfunction distinction",
        "description": "Readers confuse lower T3 on carnivore with thyroid problems. Always distinguish metabolic adaptation (healthy) from actual dysfunction (symptoms present). Lead with symptom checklist, not just lab values.",
        "content": "When covering thyroid topics, prioritize symptom assessment over lab numbers. Lower T3 without hypothyroid symptoms is adaptation. Include body temperature, energy levels, and body composition as better markers than T3 alone.",
        "source": "direct_learning",
        "tags": ["thyroid", "adaptation", "metabolic-health", "symptoms"],
        "relevance_score": 0.94,
        "impact_category": "clarity_enhancement",
        "implementation_status": "implemented"
    },
    {
        "writer_id": sarah_id,
        "memory_type": "audience_insight",
        "title": "PCOS/hormone topics drive high engagement",
        "description": "Women's hormone health content consistently performs well. PCOS, menstrual cycles, and fertility topics generate questions and shares. Women are actively seeking carnivore solutions for hormone issues.",
        "content": "When writing about women's health, focus on practical hormone optimization rather than just weight loss. PCOS audience is motivated and engaged. Include realistic timelines (3-6 months for hormone normalization).",
        "source": "audience_feedback",
        "tags": ["womens-health", "PCOS", "hormones", "engagement"],
        "relevance_score": 0.96,
        "impact_category": "audience_expansion",
        "implementation_status": "implemented"
    },
    {
        "writer_id": sarah_id,
        "memory_type": "lesson_learned",
        "title": "Research citations build credibility without being dry",
        "description": "Including specific studies (year + journal) adds authority without losing conversational tone. Readers trust 'a 2007 study in JCEM' more than 'research shows' while still being accessible.",
        "content": "Balance evidence-based claims with conversational delivery. Cite specific studies when making medical claims but explain findings in plain language. Use 'Research shows general patterns—your body may respond differently' as disclaimer pattern.",
        "source": "direct_learning",
        "tags": ["research", "credibility", "tone", "evidence"],
        "relevance_score": 0.91,
        "impact_category": "tone_improvement",
        "implementation_status": "implemented"
    },
    {
        "writer_id": sarah_id,
        "memory_type": "pattern_identified",
        "title": "Cholesterol panic is predictable and addressable",
        "description": "Almost every beginner faces doctor concerns about rising LDL. Pre-empt this with education about LDL particle size, HDL ratio, and triglyceride context. Focus on metabolic markers beyond just LDL number.",
        "content": "When covering cholesterol, address doctor conversations proactively. Explain what to track (HDL, triglycerides, CRP) and what matters most (metabolic health markers, not just LDL). Validate reader concern while providing education.",
        "source": "pattern_identified",
        "tags": ["cholesterol", "LDL", "doctor-conversations", "beginner-concerns"],
        "relevance_score": 0.93,
        "impact_category": "clarity_enhancement",
        "implementation_status": "implemented"
    }
])

# MARCUS'S MEMORIES (extracted from his 11 articles)
marcus_id = writer_map['marcus']['id']

new_memories.extend([
    {
        "writer_id": marcus_id,
        "memory_type": "pattern_identified",
        "title": "Protocol-heavy content resonates with action-takers",
        "description": "Readers who engage with Marcus content want specific protocols, not theory. Step-by-step guides, exact macros, and testable timelines perform best. Avoid vague suggestions.",
        "content": "Lead with actionable protocols. Include specific numbers (grams protein, timing windows, rep ranges). Readers want to copy-paste protocols and test results. Measurable outcomes drive engagement.",
        "source": "audience_feedback",
        "tags": ["protocols", "actionable", "specificity", "engagement"],
        "relevance_score": 0.95,
        "impact_category": "engagement_boost",
        "implementation_status": "implemented"
    },
    {
        "writer_id": marcus_id,
        "memory_type": "lesson_learned",
        "title": "Budget content fills critical gap",
        "description": "Ground beef + eggs protocol articles consistently outperform others. Budget is a major barrier. Providing exact cost-per-day breakdowns and shopping lists removes objections and drives action.",
        "content": "When addressing cost objections, lead with exact numbers. '$7/day protocol: 2 lbs ground beef ($6) + 4 eggs ($1)'. Include Walmart/Costco price comparisons. Budget-focused content converts skeptics into starters.",
        "source": "performance_data",
        "tags": ["budget", "ground-beef", "cost", "beginner-friendly"],
        "relevance_score": 0.97,
        "impact_category": "audience_expansion",
        "implementation_status": "implemented"
    },
    {
        "writer_id": marcus_id,
        "memory_type": "style_refinement",
        "title": "Short sentences and bold emphasis improve clarity",
        "description": "Marcus's direct, punchy style works when sentences are short (<15 words average) and key takeaways are bolded. Avoid long paragraphs—break into bullet lists or numbered steps.",
        "content": "Keep sentences short. Use bold for key points. Break complex protocols into numbered lists. One idea per sentence. This matches performance-focused audience scanning behavior.",
        "source": "direct_learning",
        "tags": ["writing-style", "clarity", "formatting", "readability"],
        "relevance_score": 0.89,
        "impact_category": "clarity_enhancement",
        "implementation_status": "implemented"
    },
    {
        "writer_id": marcus_id,
        "memory_type": "audience_insight",
        "title": "Fasting + carnivore combination drives curiosity",
        "description": "Articles covering fasting protocols get high engagement. Readers want to know if/how to combine intermittent fasting with carnivore. Provide clear guidelines for who should and shouldn't fast.",
        "content": "When covering fasting, distinguish between IF (16:8) and extended fasts (24-48hr). Provide contraindications clearly (women with hormone issues, beginners in first 30 days). Include adaptation timeline expectations.",
        "source": "audience_feedback",
        "tags": ["fasting", "intermittent-fasting", "protocols", "combinations"],
        "relevance_score": 0.92,
        "impact_category": "engagement_boost",
        "implementation_status": "implemented"
    }
])

# CHLOE'S MEMORIES (extracted from her 13 articles)
chloe_id = writer_map['chloe']['id']

new_memories.extend([
    {
        "writer_id": chloe_id,
        "memory_type": "audience_insight",
        "title": "Social challenges resonate more than food logistics",
        "description": "Articles about dating, family dinners, and social situations outperform meal prep guides. Readers care more about how to handle judgment than what to eat. Focus on relationship/social dynamics.",
        "content": "Lead with social scenarios, not food lists. 'How to handle your date ordering a salad' gets more engagement than 'what to eat on dates'. Readers need social scripts, not nutrition advice.",
        "source": "performance_data",
        "tags": ["social-challenges", "dating", "family", "lifestyle"],
        "relevance_score": 0.94,
        "impact_category": "engagement_boost",
        "implementation_status": "implemented"
    },
    {
        "writer_id": chloe_id,
        "memory_type": "pattern_identified",
        "title": "Reddit testimonials add credibility and relatability",
        "description": "Citing specific Reddit threads and user experiences makes content feel grounded in real community. Readers trust peer experiences over expert claims. Include usernames and subreddit sources when possible.",
        "content": "When covering trending topics, reference specific Reddit posts (r/carnivore, r/zerocarb). Quote users directly. Link to threads when valuable. Community voices make content authentic and shareable.",
        "source": "direct_learning",
        "tags": ["reddit", "community", "testimonials", "credibility"],
        "relevance_score": 0.91,
        "impact_category": "brand_alignment",
        "implementation_status": "implemented"
    },
    {
        "writer_id": chloe_id,
        "memory_type": "style_refinement",
        "title": "Conversational openings hook readers immediately",
        "description": "Starting with 'Okay, so...' or 'Real talk:' signals casual, friendly tone. Readers respond to feeling like they're talking to a friend, not reading a blog post. First sentence sets tone for entire piece.",
        "content": "Open with conversational hooks: 'Okay, so your Instagram feed is flooded with...' or 'Real talk: everyone's asking about...'. Avoid formal introductions. Get to the point while maintaining friendly, insider vibe.",
        "source": "direct_learning",
        "tags": ["writing-style", "openings", "conversational", "engagement"],
        "relevance_score": 0.88,
        "impact_category": "engagement_boost",
        "implementation_status": "implemented"
    },
    {
        "writer_id": chloe_id,
        "memory_type": "lesson_learned",
        "title": "Trending topics require fast turnaround",
        "description": "Community trends (Lion Diet, ADHD discussions) have short windows. If a topic is trending this week, publish within 7 days or it's stale. Chloe's role requires speed over perfection on trending content.",
        "content": "When identifying trending topics, prioritize speed. Get 800-word perspective published within a week while trend is hot. Perfection matters less than timeliness for trend-based content. Evergreen topics can wait.",
        "source": "direct_learning",
        "tags": ["trending", "timing", "speed", "relevance"],
        "relevance_score": 0.93,
        "impact_category": "efficiency_gain",
        "implementation_status": "implemented"
    }
])

# Insert all memories
print("Inserting new memory entries...")
print("-" * 100)

inserted_count = 0
error_count = 0

for memory in new_memories:
    try:
        supabase.table("writer_memory_log").insert(memory).execute()
        writer_name = writer_map[[k for k, v in writer_map.items() if v['id'] == memory['writer_id']][0]]['name']
        print(f"  ✅ [{writer_name}] {memory['memory_type']}: {memory['title']}")
        inserted_count += 1
    except Exception as e:
        print(f"  ❌ Error: {e}")
        error_count += 1

print()
print("-" * 100)
print(f"Total inserted: {inserted_count}")
print(f"Errors: {error_count}")
print()

# Verify final count
result = supabase.table("writer_memory_log").select("id", count="exact").execute()
total_count = result.count if hasattr(result, 'count') else len(result.data)
print(f"✅ writer_memory_log table now has {total_count} total entries")

# Show breakdown by writer
for slug, data in writer_map.items():
    result = supabase.table("writer_memory_log").select("id", count="exact").eq("writer_id", data['id']).execute()
    count = result.count if hasattr(result, 'count') else len(result.data)
    print(f"   - {slug}: {count} memories")

print()
print("=" * 100)
print("MEMORY SEEDING COMPLETE")
print("=" * 100)
