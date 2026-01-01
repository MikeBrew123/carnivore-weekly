// Supabase Edge Function: Prioritize Topics (LEO System)
// Purpose: Apply LEO's prioritization algorithm to trending topics
// Latency: <50ms (database edge execution)
// Usage: Called weekly to reprioritize topics and update Chloe's assignment queue

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Priority scoring weights (must sum to 1.0)
const PRIORITY_WEIGHTS = {
  velocity: 0.30,
  engagement: 0.25,
  freshness: 0.20,
  creatorDiversity: 0.15,
  sentiment: 0.10,
};

const SERIES_THRESHOLD_DAYS = 14;
const SERIES_THRESHOLD_VELOCITY = 5.0;

interface PrioritizeRequest {
  writerSlug?: string; // e.g., "chloe"
  limit?: number; // Number of topics to return (default: 10)
}

interface PrioritizedTopic {
  topicId: number;
  topicSlug: string;
  topicTitle: string;
  priorityScore: number;
  recommendedFormat: "single_post" | "series" | "monthly_wrapup";
  seriesCandidate: boolean;
  metrics: {
    velocity: number;
    engagement: number;
    freshness: number;
    creatorDiversity: number;
    sentiment: number;
  };
  assignmentReady: boolean;
}

interface PrioritizeResponse {
  prioritizedTopics: PrioritizedTopic[];
  topicsAnalyzed: number;
  reprioritizedAt: string;
}

async function prioritizeTopics(
  supabaseClient: ReturnType<typeof createClient>,
  request: PrioritizeRequest
): Promise<PrioritizeResponse> {
  const limit = request.limit || 10;

  const response: PrioritizeResponse = {
    prioritizedTopics: [],
    topicsAnalyzed: 0,
    reprioritizedAt: new Date().toISOString(),
  };

  try {
    // Fetch all active trending topics
    const { data: topics, error: topicsError } = await supabaseClient
      .from("trending_topics")
      .select(
        "id, topic_slug, topic_title, mention_count, velocity_score, engagement_score, days_active, creator_count, sentiment"
      )
      .eq("assignment_status", "unassigned")
      .order("mention_count", { ascending: false })
      .limit(limit);

    if (topicsError) {
      throw topicsError;
    }

    if (!topics || topics.length === 0) {
      return response;
    }

    response.topicsAnalyzed = topics.length;

    // Prioritize each topic
    const prioritized: PrioritizedTopic[] = [];

    for (const topic of topics) {
      // Calculate individual component scores
      const velocityScore = normalizeScore(
        (topic.velocity_score || 0) * 100,
        1000
      ); // Normalize
      const engagementScore = normalizeScore(
        (topic.engagement_score || 0),
        500
      );
      const freshnessScore = calculateFreshnessScore(
        Math.ceil(
          (Date.now() - new Date(topic.updated_at).getTime()) / (1000 * 86400)
        )
      );
      const creatorDiversityScore = calculateCreatorDiversityScore(
        topic.creator_count || 0
      );
      const sentimentScore = calculateSentimentScore(topic.sentiment);

      // Apply weighted formula
      let priorityScore =
        velocityScore * PRIORITY_WEIGHTS.velocity +
        engagementScore * PRIORITY_WEIGHTS.engagement +
        freshnessScore * PRIORITY_WEIGHTS.freshness +
        creatorDiversityScore * PRIORITY_WEIGHTS.creatorDiversity +
        sentimentScore * PRIORITY_WEIGHTS.sentiment;

      // Freshness penalty: if >7 days old, 50% penalty
      const daysSinceUpdate = Math.ceil(
        (Date.now() - new Date(topic.updated_at).getTime()) / (1000 * 86400)
      );
      if (daysSinceUpdate > 7) {
        priorityScore *= 0.5;
      }

      // Determine recommended format
      let recommendedFormat: "single_post" | "series" | "monthly_wrapup" =
        "single_post";
      let seriesCandidate = false;

      if (
        topic.days_active >= SERIES_THRESHOLD_DAYS &&
        (topic.velocity_score || 0) >= SERIES_THRESHOLD_VELOCITY
      ) {
        recommendedFormat = "series";
        seriesCandidate = true;
      } else if ((topic.mention_count || 0) >= 50 && topic.days_active >= 7) {
        recommendedFormat = "monthly_wrapup";
      }

      prioritized.push({
        topicId: topic.id,
        topicSlug: topic.topic_slug,
        topicTitle: topic.topic_title,
        priorityScore: Math.round(priorityScore),
        recommendedFormat,
        seriesCandidate,
        metrics: {
          velocity: velocityScore,
          engagement: engagementScore,
          freshness: freshnessScore,
          creatorDiversity: creatorDiversityScore,
          sentiment: sentimentScore,
        },
        assignmentReady: priorityScore > 30, // Topics above threshold are assignment-ready
      });
    }

    // Sort by priority score (descending)
    prioritized.sort((a, b) => b.priorityScore - a.priorityScore);

    response.prioritizedTopics = prioritized.slice(0, limit);

    return response;
  } catch (error) {
    console.error("Error prioritizing topics:", error);
    throw error;
  }
}

function normalizeScore(value: number, max: number): number {
  return Math.min(Math.round((value / max) * 100), 100);
}

function calculateFreshnessScore(daysSinceLastSeen: number): number {
  if (daysSinceLastSeen <= 1) return 100;
  if (daysSinceLastSeen <= 3) return 75;
  if (daysSinceLastSeen <= 5) return 50;
  if (daysSinceLastSeen <= 7) return 25;
  return 0; // Stale
}

function calculateCreatorDiversityScore(creatorCount: number): number {
  if (creatorCount >= 10) return 100;
  if (creatorCount >= 8) return 90;
  if (creatorCount >= 6) return 75;
  if (creatorCount >= 4) return 50;
  if (creatorCount >= 2) return 30;
  if (creatorCount >= 1) return 15;
  return 0;
}

function calculateSentimentScore(sentiment: any): number {
  if (!sentiment) return 50;

  const total =
    (sentiment.positive || 0) +
    (sentiment.neutral || 0) +
    (sentiment.negative || 0);
  if (total === 0) return 50;

  const positiveRatio = (sentiment.positive || 0) / total;
  return Math.round(positiveRatio * 100);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const request: PrioritizeRequest = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Execute prioritization
    const result = await prioritizeTopics(supabaseClient, request);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
