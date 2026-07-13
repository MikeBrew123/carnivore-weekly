-- EXP-004 micro-survey: capture what the user says they want next after the free
-- calculator results (offer-message fit signal for the $29 report).
-- Applied to production 2026-07-13 via MCP; this file records it in the repo.

ALTER TABLE calculator_sessions_v2 ADD COLUMN IF NOT EXISTS survey_next_step text;

COMMENT ON COLUMN calculator_sessions_v2.survey_next_step IS
  'EXP-004 micro-survey: what the user said they want next after free results (offer-message fit signal)';
