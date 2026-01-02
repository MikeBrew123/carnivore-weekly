import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const body = await req.json()

    // Validate required fields
    if (!body.event_type || !body.source) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_type, source' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Determine table based on event type
    const isPerformanceEvent = body.event_type.includes('performance') || body.lcp_ms !== undefined

    if (isPerformanceEvent) {
      // Insert into performance_metrics
      const { data, error } = await supabase
        .from('performance_metrics')
        .insert({
          page_url: body.page_url,
          lcp_ms: body.lcp_ms,
          cls_score: body.cls_score,
          inp_ms: body.inp_ms,
          device_type: body.device_type,
        })

      if (error) {
        console.error('Performance metrics insert error:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      return new Response(JSON.stringify({ success: true, type: 'performance' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } else {
      // Insert into analytics_events
      const { data, error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: body.event_type,
          source: body.source,
          device_type: body.device_type,
          viewport_width: body.viewport_width,
          scroll_depth: body.scroll_depth,
        })

      if (error) {
        console.error('Analytics event insert error:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      return new Response(JSON.stringify({ success: true, type: 'event' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  } catch (error) {
    console.error('Analytics endpoint error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
