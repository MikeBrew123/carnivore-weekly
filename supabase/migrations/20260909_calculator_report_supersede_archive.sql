-- 20260909_calculator_report_supersede_archive.sql
--
-- Version history for superseded paid report content, plus a staging buffer.
--
-- WHY. A paying customer's 2026-09-07 report was generated from a self-contradictory
-- questionnaire. The stored inputs were corrected on 2026-09-09 and the report
-- regenerated, but her existing report had to start serving the corrected content
-- WITHOUT changing her URL and WITHOUT losing the original.
--
-- The architecture forces update-in-place:
--   * handleReportContent looks the report up by access_token, so the token IS the link
--   * calculator_reports has UNIQUE(session_id) AND UNIQUE(access_token), so a second
--     row for the same session is impossible
--   * calculator_report_access_log.report_id is an FK to calculator_reports(id)
--     ON DELETE CASCADE, so delete-and-reinsert would destroy the access audit trail
--
-- So the live row is updated in place and the previous content is preserved here.
--
-- Applied to production 2026-09-09 via the Supabase MCP. The promotion, rollback and
-- verification statements are operational, not schema, and live in
-- docs/project-log/decisions.md under 2026-09-09.

CREATE TABLE IF NOT EXISTS public.calculator_reports_archive (
  archive_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_num             integer NOT NULL CHECK (version_num > 0),
  LIKE public.calculator_reports,        -- exact column names and types; no CHECKs, no PK
  html_sha256             text,
  html_length             integer,
  archived_at             timestamptz NOT NULL DEFAULT now(),
  supersede_reason        text NOT NULL,
  authorised_by           text NOT NULL,
  replaced_by_staging_id  uuid,
  replaced_by_sha256      text,
  archive_note            text
);

CREATE UNIQUE INDEX IF NOT EXISTS calculator_reports_archive_session_version_uniq
  ON public.calculator_reports_archive (session_id, version_num);
CREATE INDEX IF NOT EXISTS calculator_reports_archive_report_id_idx
  ON public.calculator_reports_archive (id, version_num);
CREATE INDEX IF NOT EXISTS calculator_reports_archive_token_idx
  ON public.calculator_reports_archive (access_token);

ALTER TABLE public.calculator_reports_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calculator_reports_archive FROM anon, authenticated;
GRANT ALL ON public.calculator_reports_archive TO service_role;

COMMENT ON TABLE public.calculator_reports_archive IS
  'Immutable version history of public.calculator_reports. One row per superseded content version. "id" is the ORIGINAL live report id, deliberately not a FK so the archive outlives cascade deletes. No CHECK constraints are mirrored from the live table: an archive that can refuse a historical value is not an archive. Holds live access tokens and customer PII, so service_role only, and it must be excluded from any report-export script. Append-only: never UPDATE or DELETE a row here.';
COMMENT ON COLUMN public.calculator_reports_archive.version_num IS
  'Per-session sequence, 1 = first superseded version. Keyed on session_id rather than report id so history survives even if the live row were ever recreated.';

CREATE TABLE IF NOT EXISTS public.calculator_report_staging (
  staging_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_report_id       uuid NOT NULL,
  session_id             uuid NOT NULL,
  email                  varchar(255) NOT NULL,
  report_html            text NOT NULL,
  content_sha256         text NOT NULL,
  content_length         integer NOT NULL,
  source_note            text NOT NULL,
  authorised_by          text NOT NULL,
  supersede_reason       text NOT NULL,
  status                 text NOT NULL DEFAULT 'staged',
  created_at             timestamptz NOT NULL DEFAULT now(),
  promoted_at            timestamptz,
  promoted_to_archive_id uuid,
  CONSTRAINT staging_status_valid   CHECK (status IN ('staged','promoted','rejected','rolled_back')),
  CONSTRAINT staging_html_not_empty CHECK (length(trim(report_html)) > 0),
  CONSTRAINT staging_len_matches    CHECK (content_length = length(report_html)),
  CONSTRAINT staging_sha_shape      CHECK (content_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS calculator_report_staging_target_idx
  ON public.calculator_report_staging (target_report_id, status);

ALTER TABLE public.calculator_report_staging ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calculator_report_staging FROM anon, authenticated;
GRANT ALL ON public.calculator_report_staging TO service_role;

COMMENT ON TABLE public.calculator_report_staging IS
  'Write-ahead buffer for corrected report content. ~55KB of HTML does not belong inline in a hand-written statement, so the bytes arrive over the REST API (scripts/stage_report_html.mjs), are integrity-checked by length and sha256 INSIDE the database, and are then promoted by a single atomic statement. staging_len_matches fires at INSERT time if the body was truncated in transit, before the live row is ever in play. status is the idempotency latch. Contains paid content and PII: service_role only.';
