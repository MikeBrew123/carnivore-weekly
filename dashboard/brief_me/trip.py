"""Read the Sayulita trip ledger (Project Nexus Postgres, schema trip) for Brief Me.

Read-only on purpose: connects as `trip_reader` (SELECT only, read-only
transactions), never `trip_writer`. The password lives on the VPS at
/root/secrets/trip_reader.pw and is copied, mode 600, to
~/.brief-me/trip_reader.pw on each machine that builds episodes.

The query reuses the 8am Telegram recap's logic
(project-nexus/trip/n8n/sql/recap_load.sql) with two differences: the trip must
contain today (the recap also runs the morning after the last day), and it adds
a per-day spend series for the chart.
"""

import json
import os
from pathlib import Path

PG = {'host': '100.92.115.43', 'port': 5432, 'dbname': 'memory_db', 'user': 'trip_reader'}
PW_FILE = Path(os.environ.get('BRIEF_ME_HOME', Path.home() / '.brief-me')) / 'trip_reader.pw'

SQL = """
WITH d AS (SELECT %(today)s::date AS today, %(today)s::date - 1 AS yday),
t AS (SELECT tr.* FROM trip.trips tr, d WHERE d.today BETWEEN tr.starts_on AND tr.ends_on
      ORDER BY tr.starts_on DESC LIMIT 1)
SELECT (SELECT row_to_json(t) FROM t) AS trip,
  (SELECT json_agg(json_build_object('starts_on', starts_on, 'ends_on', ends_on)) FROM trip.trips) AS windows,
  (SELECT coalesce(json_agg(z ORDER BY z.total DESC NULLS LAST), '[]') FROM (
     SELECT s.category, s.currency, sum(s.amount) AS total, count(*) AS n
     FROM trip.spend s, d, t WHERE NOT s.voided AND s.trip_id = t.id
       AND (s.occurred_at AT TIME ZONE 'America/Vancouver')::date = d.yday
     GROUP BY 1, 2) z) AS yday_spend,
  (SELECT coalesce(json_agg(z), '[]') FROM (
     SELECT s.currency, sum(s.amount) AS total,
            count(DISTINCT (s.occurred_at AT TIME ZONE 'America/Vancouver')::date) AS days
     FROM trip.spend s, t WHERE NOT s.voided AND s.trip_id = t.id GROUP BY 1) z) AS trip_spend,
  (SELECT coalesce(json_agg(z ORDER BY z.day), '[]') FROM (
     SELECT (s.occurred_at AT TIME ZONE 'America/Vancouver')::date::text AS day, sum(s.amount) AS total
     FROM trip.spend s, t WHERE NOT s.voided AND s.trip_id = t.id AND s.currency = t.currency
     GROUP BY 1) z) AS daily_spend,
  (SELECT coalesce(json_agg(DISTINCT pe.name), '[]')
     FROM trip.sightings si JOIN trip.people pe ON pe.id = si.person_id, d
     WHERE (si.seen_at AT TIME ZONE 'America/Vancouver')::date = d.yday) AS yday_people,
  (SELECT coalesce(json_agg(json_build_object('name', pe.name, 'description', pe.description)), '[]')
     FROM trip.people pe, d WHERE pe.source = 'voice capture' AND pe.first_seen = d.yday) AS yday_new,
  (SELECT coalesce(json_agg(json_build_object('what', cm.what, 'with', cm.with_who,
          'date', (cm.due_at AT TIME ZONE 'America/Mexico_City')::date::text,
          'time', to_char(cm.due_at AT TIME ZONE 'America/Mexico_City', 'FMHH12:MI AM'))
          ORDER BY cm.due_at NULLS LAST), '[]')
     FROM trip.commitments cm, d WHERE cm.status = 'open' AND (
       (cm.due_at AT TIME ZONE 'America/Vancouver')::date BETWEEN d.today AND d.today + 2
       OR (cm.due_at IS NULL AND cm.created_at > now() - interval '3 days'))) AS commitments,
  (SELECT coalesce(json_agg(json_build_object('title', e.title, 'venue', e.venue,
          'date', (e.starts_at AT TIME ZONE 'America/Mexico_City')::date::text,
          'time', CASE WHEN e.all_day OR e.date_precision <> 'exact' THEN ''
                       ELSE to_char(e.starts_at AT TIME ZONE 'America/Mexico_City', 'FMHH12:MI AM') END)
          ORDER BY e.starts_at), '[]')
     FROM trip.events e, d
     WHERE (e.starts_at AT TIME ZONE 'America/Mexico_City')::date <= d.today + 2
       AND coalesce((e.ends_at AT TIME ZONE 'America/Mexico_City')::date,
                    (e.starts_at AT TIME ZONE 'America/Mexico_City')::date) >= d.today) AS events
"""


def load_trip(today):
    """Ledger context for `today` (ISO date). ctx['trip'] is None when no trip
    contains today; ctx['windows'] lists every trip's dates (cached by the caller
    so an outage during a trip is reported, not mistaken for "no trip").

    Raises when the database cannot be reached; the caller turns that into a
    health fact ("trip data missing, not zero") rather than a silent skip.
    """
    import psycopg2                           # only needed on trip-capable machines
    conn = psycopg2.connect(password=PW_FILE.read_text().strip(), connect_timeout=10, **PG)
    try:
        conn.set_session(readonly=True)
        with conn.cursor() as cur:
            cur.execute(SQL, {'today': today})
            cols = [c[0] for c in cur.description]
            row = dict(zip(cols, cur.fetchone()))
    finally:
        conn.close()
    row = json.loads(json.dumps(row, default=str))
    return row | {'today': today}
