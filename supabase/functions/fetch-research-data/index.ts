// Supabase Edge Function: Fetch Research Data for Chloe
// Purpose: Chloe's "Research Gap" tool - fetch all data for an assigned topic
// Latency: <100ms (aggregates multiple queries at database edge)
// Usage: Called by Chloe when researching assigned topic for blog post

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResearchDataRequest {
  topicId: number;
  includeYouTube?: boolean;
  includeReddit?: boolean;
  includeVault?: boolean;
  maxSources?: number;
}

interface TopicInfo {
  topicId: number;
  topicSlug: string;
  topicTitle: string;
  description: string;
  trendMetrics: {
    mentionCount: number;
    velocityScore: number;
    engagementScore: number;
    daysActive: number;
    creatorCount: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  contentFormat: string;
  seriesStatus: string;
}

interface VaultSource {
  blogId: number;
  title: string;
  author: string;
  slug: string;
  publishedAt: string;
  excerpt: string;
  tags: string[];
}

interface YoutubeSource {
  sourceId: number;
  videoId: string;
  title: string;
  creator: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  contentSnippet: string;
  topComments: Array<{ text: string; author: string; sentiment: string }>;
  relevanceScore: number;
}

interface RedditSource {
  sourceId: number;
  postUrl: string;
  title: string;
  subreddit: string;
  upvotes: number;
  commentCount: number;
  createdAt: string;
  contentSnippet: string;
  topComments: Array<{ text: string; author: string; upvotes: number }>;
  relevanceScore: number;
}

interface ResearchDataResponse {
  topic: TopicInfo;
  vaultSources: VaultSource[];
  youtubeSources: YoutubeSource[];
  redditSources: RedditSource[];
  truthLevelBreakdown: {
    vault: number;
    reputableWeb: number;
    unverifiedForum: number;
  };
  researchCompletedAt: string;
}

async function fetchResearchData(
  supabaseClient: ReturnType<typeof createClient>,
  request: ResearchDataRequest
): Promise<ResearchDataResponse> {
  const maxSources = request.maxSources || 20;
  const includeYouTube = request.includeYouTube !== false;
  const includeReddit = request.includeReddit !== false;
  const includeVault = request.includeVault !== false;

  const response: ResearchDataResponse = {
    topic: {} as TopicInfo,
    vaultSources: [],
    youtubeSources: [],
    redditSources: [],
    truthLevelBreakdown: {
      vault: 0,
      reputableWeb: 0,
      unverifiedForum: 0,
    },
    researchCompletedAt: new Date().toISOString(),
  };

  try {
    // Fetch topic data
    const { data: topicData, error: topicError } = await supabaseClient
      .from("trending_topics")
      .select(
        "id, topic_slug, topic_title, description, mention_count, velocity_score, engagement_score, days_active, creator_count, sentiment, content_format, series_status"
      )
      .eq("id", request.topicId)
      .single();

    if (topicError && topicError.code !== "PGRST116") {
      throw topicError;
    }

    if (topicData) {
      response.topic = {
        topicId: topicData.id,
        topicSlug: topicData.topic_slug,
        topicTitle: topicData.topic_title,
        description: topicData.description || "",
        trendMetrics: {
          mentionCount: topicData.mention_count || 0,
          velocityScore: topicData.velocity_score || 0,
          engagementScore: topicData.engagement_score || 0,
          daysActive: topicData.days_active || 1,
          creatorCount: topicData.creator_count || 0,
          sentiment: topicData.sentiment || {
            positive: 0,
            neutral: 0,
            negative: 0,
          },
        },
        contentFormat: topicData.content_format || "single_post",
        seriesStatus: topicData.series_status || "none",
      };
    }

    // Fetch Vault sources (internal blogs covering this topic)
    if (includeVault) {
      const { data: vaultData, error: vaultError } = await supabaseClient
        .from("writer_content")
        .select("id, title, author, content_slug, published_at, excerpt, tags")
        .contains("tags", [response.topic.topicSlug])
        .order("published_at", { ascending: false })
        .limit(5);

      if (vaultError && vaultError.code !== "PGRST116") {
        throw vaultError;
      }

      if (vaultData && vaultData.length > 0) {
        response.vaultSources = vaultData.map((source: any) => ({
          blogId: source.id,
          title: source.title || "Untitled",
          author: source.author || "Unknown",
          slug: source.content_slug || "",
          publishedAt: source.published_at || "",
          excerpt: source.excerpt || "",
          tags: source.tags || [],
        }));

        response.truthLevelBreakdown.vault += response.vaultSources.length;
      }
    }

    // Fetch YouTube sources
    if (includeYouTube) {
      const { data: youtubeData, error: youtubeError } = await supabaseClient
        .from("topic_sources")
        .select(
          "id, title, author_name, view_count, like_count, comment_count, published_at, content_snippet, relevance_score, truth_level"
        )
        .eq("topic_id", request.topicId)
        .eq("source_type", "youtube_video")
        .order("like_count", { ascending: false })
        .limit(maxSources);

      if (youtubeError && youtubeError.code !== "PGRST116") {
        throw youtubeError;
      }

      if (youtubeData && youtubeData.length > 0) {
        response.youtubeSources = youtubeData.map((source: any) => ({
          sourceId: source.id,
          videoId: extractYoutubeId(source.title || ""),
          title: source.title || "Untitled",
          creator: source.author_name || "Unknown Creator",
          viewCount: source.view_count || 0,
          likeCount: source.like_count || 0,
          commentCount: source.comment_count || 0,
          publishedAt: source.published_at || "",
          contentSnippet: source.content_snippet || "",
          topComments: [], // Can be populated separately if needed
          relevanceScore: source.relevance_score || 0,
        }));

        // Count truth levels
        youtubeData.forEach((source: any) => {
          if (source.truth_level === "reputable_web") {
            response.truthLevelBreakdown.reputableWeb++;
          } else {
            response.truthLevelBreakdown.unverifiedForum++;
          }
        });
      }
    }

    // Fetch Reddit sources
    if (includeReddit) {
      const { data: redditData, error: redditError } = await supabaseClient
        .from("topic_sources")
        .select(
          "id, title, author_name, like_count, comment_count, published_at, content_snippet, relevance_score, truth_level, source_url"
        )
        .eq("topic_id", request.topicId)
        .in("source_type", ["reddit_post", "reddit_comment"])
        .order("like_count", { ascending: false })
        .limit(maxSources);

      if (redditError && redditError.code !== "PGRST116") {
        throw redditError;
      }

      if (redditData && redditData.length > 0) {
        response.redditSources = redditData.map((source: any) => ({
          sourceId: source.id,
          postUrl: source.source_url || "",
          title: source.title || "Untitled",
          subreddit: extractSubreddit(source.source_url || ""),
          upvotes: source.like_count || 0,
          commentCount: source.comment_count || 0,
          createdAt: source.published_at || "",
          contentSnippet: source.content_snippet || "",
          topComments: [],
          relevanceScore: source.relevance_score || 0,
        }));

        // Count truth levels
        redditData.forEach((source: any) => {
          if (source.truth_level === "unverified_forum") {
            response.truthLevelBreakdown.unverifiedForum++;
          }
        });
      }
    }

    return response;
  } catch (error) {
    console.error("Error fetching research data:", error);
    throw error;
  }
}

function extractYoutubeId(title: string): string {
  // In reality, would extract from source_url
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 11);
}

function extractSubreddit(url: string): string {
  const match = url.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/);
  return match ? match[1] : "unknown";
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const request: ResearchDataRequest = await req.json();

    // Validate request
    if (!request.topicId) {
      return new Response(JSON.stringify({ error: "Missing topicId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Fetch research data
    const result = await fetchResearchData(supabaseClient, request);

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
