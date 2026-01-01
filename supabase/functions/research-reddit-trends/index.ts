// Supabase Edge Function: Research Reddit Trends
// Purpose: Monitor Reddit for trending discussions and community sentiment
// Latency: <50ms (direct database query at edge)
// Usage: Used by Chloe to validate YouTube trends in community context

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResearchRequest {
  topicSlug: string;
  topicTitle: string;
  maxSources?: number;
}

interface RedditSource {
  postUrl: string;
  title: string;
  subreddit: string;
  upvotes: number;
  commentCount: number;
  createdAt: string;
  topComments: Array<{
    text: string;
    author: string;
    upvotes: number;
    sentiment: string;
  }>;
  engagementScore: number;
}

interface ResearchResponse {
  topicSlug: string;
  topicTitle: string;
  redditSourcesFound: number;
  sources: RedditSource[];
  subredditBreakdown: Array<{ name: string; postCount: number }>;
  sentimentSummary: {
    positive: number;
    neutral: number;
    negative: number;
  };
  communityValidation: boolean; // True if also trending on YouTube
  collectedAt: string;
}

async function researchRedditTrends(
  supabaseClient: ReturnType<typeof createClient>,
  request: ResearchRequest
): Promise<ResearchResponse> {
  const maxSources = request.maxSources || 10;

  const response: ResearchResponse = {
    topicSlug: request.topicSlug,
    topicTitle: request.topicTitle,
    redditSourcesFound: 0,
    sources: [],
    subredditBreakdown: [],
    sentimentSummary: {
      positive: 0,
      neutral: 0,
      negative: 0,
    },
    communityValidation: false,
    collectedAt: new Date().toISOString(),
  };

  try {
    // Query trending topics table to get Reddit mention metadata
    const { data: topicData, error: topicError } = await supabaseClient
      .from("trending_topics")
      .select("reddit_mentions, sentiment, youtube_mentions")
      .eq("topic_slug", request.topicSlug)
      .single();

    if (topicError && topicError.code !== "PGRST116") {
      throw topicError;
    }

    if (topicData) {
      response.redditSourcesFound = topicData.reddit_mentions || 0;
      response.sentimentSummary = topicData.sentiment || {
        positive: 0,
        neutral: 0,
        negative: 0,
      };
      // Community validation: trending on both YouTube and Reddit
      response.communityValidation =
        (topicData.reddit_mentions || 0) > 0 &&
        (topicData.youtube_mentions || 0) > 0;
    }

    // Query topic sources for Reddit posts
    const { data: sources, error: sourcesError } = await supabaseClient
      .from("topic_sources")
      .select(
        "source_url, title, author_name, content_snippet, like_count, comment_count, sentiment, published_at, full_content"
      )
      .eq("topic_id", request.topicSlug)
      .in("source_type", ["reddit_post", "reddit_comment"])
      .order("like_count", { ascending: false })
      .limit(maxSources);

    if (sourcesError && sourcesError.code !== "PGRST116") {
      throw sourcesError;
    }

    if (sources && sources.length > 0) {
      const subredditMap = new Map<string, number>();

      response.sources = sources.map((source: any) => {
        const subreddit = extractSubreddit(source.source_url);
        subredditMap.set(subreddit, (subredditMap.get(subreddit) || 0) + 1);

        return {
          postUrl: source.source_url,
          title: source.title || "Untitled",
          subreddit,
          upvotes: source.like_count || 0,
          commentCount: source.comment_count || 0,
          createdAt: source.published_at || new Date().toISOString(),
          topComments: [], // Populated separately if needed
          engagementScore: (source.like_count || 0) + (source.comment_count || 0),
        };
      });

      // Break down by subreddit
      response.subredditBreakdown = Array.from(subredditMap.entries())
        .map(([name, postCount]) => ({ name, postCount }))
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 5);
    }

    return response;
  } catch (error) {
    console.error("Error researching Reddit trends:", error);
    throw error;
  }
}

function extractSubreddit(url: string): string {
  // Extract subreddit from Reddit URL
  const match = url.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/);
  return match ? match[1] : "unknown";
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const request: ResearchRequest = await req.json();

    // Validate request
    if (!request.topicSlug || !request.topicTitle) {
      return new Response(
        JSON.stringify({ error: "Missing topicSlug or topicTitle" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Execute research
    const result = await researchRedditTrends(supabaseClient, request);

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
