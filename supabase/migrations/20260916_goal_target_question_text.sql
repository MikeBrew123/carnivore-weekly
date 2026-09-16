-- Replace the seeded placeholder wording on the day-5 goal_target question (both sites).
-- Applied to production 2026-09-16 via execute_sql. CW went live 2026-09-13 with the
-- placeholder still in question_text, visible on journey-checkin.html (form view and
-- "Change my answer"). Wording is Sarah's approved day-5 email question, minus "Tap one."
-- Updated in place, NOT version-bumped: day-5.html hardcodes the six option uuids that
-- belong to this question row, so a new version row would orphan every email button.
update drip_survey_questions
   set question_text = 'How much are you hoping to lose?'
 where day = 5 and question_key = 'goal_target' and version = 1
   and question_text like '[PLACEHOLDER%';
