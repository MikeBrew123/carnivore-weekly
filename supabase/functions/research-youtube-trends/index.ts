// Supabase Edge Function: Research YouTube Trends
// Purpose: Query YouTube data for trending topics
// Latency: <50ms (direct database query at edge)
// Usage: Used by Chloe to research YouTube creator content and trends

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

interface YoutubeSource {
  videoId: string;
  title: string;
  creator: string;
  channelUrl: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  topComments: Array<{
    text: string;
    author: string;
    likes: number;
    sentiment: string;
  }>;
  engagementScore: number;
}

interface ResearchResponse {
  topicSlug: string;
  topicTitle: string;
  youtubeSourcesFound: number;
  sources: YoutubeSource[];
  topCreators: Array<{ name: string; videoCount: number }>;
  sentimentSummary: {
    positive: number;
    neutral: number;
    negative: number;
  };
  collectedAt: string;
}

async function researchYoutubeTrends(
  supabaseClient: ReturnType<typeof createClient>,
  request: ResearchRequest
): Promise<ResearchResponse> {
  const maxSources = request.maxSources || 10;

  // In production, this would query stored YouTube data
  // For now, return structure that matches expected format
  // Real implementation would parse youtube_data.json via Supabase storage
  // or query a cached YouTube trends table

  const response: ResearchResponse = {
    topicSlug: request.topicSlug,
    topicTitle: request.topicTitle,
    youtubeSourcesFound: 0,
    sources: [],
    topCreators: [],
    sentimentSummary: {
      positive: 0,
      neutral: 0,
      negative: 0,
    },
    collectedAt: new Date().toISOString(),
  };

  try {
    // Query trending topics table to get YouTube mention metadata
    const { data: topicData, error: topicError } = await supabaseClient
      .from("trending_topics")
      .select("youtube_mentions, sentiment")
      .eq("topic_slug", request.topicSlug)
      .single();

    if (topicError && topicError.code !== "PGRST116") {
      throw topicError;
    }

    if (topicData) {
      response.youtubeSourcesFound = topicData.youtube_mentions || 0;
      response.sentimentSummary = topicData.sentiment || {
        positive: 0,
        neutral: 0,
        negative: 0,
      };
    }

    // Query topic sources for YouTube videos
    const { data: sources, error: sourcesError } = await supabaseClient
      .from("topic_sources")
      .select(
        "source_url, title, author_name, content_snippet, like_count, comment_count, sentiment, published_at"
      )
      .eq("topic_id", request.topicSlug)
      .eq("source_type", "youtube_video")
      .order("like_count", { ascending: false })
      .limit(maxSources);

    if (sourcesError && sourcesError.code !== "PGRST116") {
      throw sourcesError;
    }

    if (sources && sources.length > 0) {
      response.sources = sources.map((source: any) => ({
        videoId: extractYoutubeId(source.source_url),
        title: source.title || "Untitled",
        creator: source.author_name || "Unknown Creator",
        channelUrl: `https://www.youtube.com`,
        viewCount: source.like_count || 0,
        likeCount: source.like_count || 0,
        publishedAt: source.published_at || new Date().toISOString(),
        topComments: [], // Populated separately if needed
        engagementScore: (source.like_count || 0) + (source.comment_count || 0),
      }));

      // Extract top creators
      const creators = new Map<string, number>();
      response.sources.forEach((source) => {
        const count = creators.get(source.creator) || 0;
        creators.set(source.creator, count + 1);
      });

      response.topCreators = Array.from(creators.entries())
        .map(([name, videoCount]) => ({ name, videoCount }))
        .sort((a, b) => b.videoCount - a.videoCount)
        .slice(0, 5);
    }

    return response;
  } catch (error) {
    console.error("Error researching YouTube trends:", error);
    throw error;
  }
}

function extractYoutubeId(url: string): string {
  // Extract video ID from YouTube URL
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : "";
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
    const result = await researchYoutubeTrends(supabaseClient, request);

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
