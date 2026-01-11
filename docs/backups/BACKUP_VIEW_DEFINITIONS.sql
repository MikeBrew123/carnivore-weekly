-- BACKUP: Current View Definitions
-- Created: 2026-01-07
-- DO NOT DELETE - Used for rollback if security_invoker changes cause issues

-- View 1: vw_claude_api_costs
CREATE OR REPLACE VIEW public.vw_claude_api_costs AS
 SELECT date(request_at) AS date,
    count(*) AS total_calls,
    sum(input_tokens) AS total_input_tokens,
    sum(output_tokens) AS total_output_tokens,
    round(sum(input_tokens)::numeric * 3.0 / 1000000.0, 4) AS input_cost_usd,
    round(sum(output_tokens)::numeric * 15.0 / 1000000.0, 4) AS output_cost_usd,
    round(sum(input_tokens)::numeric * 3.0 / 1000000.0 + sum(output_tokens)::numeric * 15.0 / 1000000.0, 4) AS total_cost_usd,
    round(avg(duration_ms), 0) AS avg_duration_ms
   FROM claude_api_logs
  WHERE status::text = 'success'::text
  GROUP BY (date(request_at))
  ORDER BY (date(request_at)) DESC;

-- View 2: vw_generation_stats
CREATE OR REPLACE VIEW public.vw_generation_stats AS
 SELECT date(created_at) AS date,
    count(*) AS total_reports,
    count(
        CASE
            WHEN is_generated THEN 1
            ELSE NULL::integer
        END) AS completed,
    count(
        CASE
            WHEN NOT is_generated AND NOT is_expired THEN 1
            ELSE NULL::integer
        END) AS pending,
    count(
        CASE
            WHEN is_expired THEN 1
            ELSE NULL::integer
        END) AS expired,
    avg(EXTRACT(epoch FROM generated_at - created_at)) AS avg_generation_time_seconds
   FROM calculator_reports
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;

-- View 3: vw_pending_reports
CREATE OR REPLACE VIEW public.vw_pending_reports AS
 SELECT id,
    session_id,
    email,
    access_token,
    created_at,
    expires_at,
    (report_json ->> 'stage'::text)::integer AS current_stage,
    (report_json ->> 'progress'::text)::integer AS current_progress
   FROM calculator_reports
  WHERE is_generated = false AND is_expired = false AND expires_at > now()
  ORDER BY created_at;
