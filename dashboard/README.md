# Carnivore Weekly Dashboard

A local web-based dashboard for monitoring Carnivore Weekly operations, site health, content metrics, and AI agent activities.

## Quick Start

```bash
cd /Users/mbrew/Developer/carnivore-weekly/dashboard
npm start
```

Then open your browser to: **http://localhost:3000**

The dashboard will be running locally and is only accessible on your machine (127.0.0.1).

## What's Built

### Phase 1: Foundation ✅
- Express.js server running on port 3000
- Static file serving from `/public`
- All npm dependencies installed (158 packages)
- Symlink to parent `.env` file

### Phase 2: Health Metrics 🔄
- **API**: `/api/health` - Site health monitoring
- **Frontend**: Displays database status, Core Web Vitals, uptime, validation pipeline
- **Leo Integration**: Connects to Leo agent for database health
- **Updates**: Polls every 30 seconds

### Phase 3: Content Metrics ✅
- **APIs**:
  - `/api/content/recent` - Recent blog posts
  - `/api/content/upcoming` - Scheduled posts
  - `/api/content/archive-stats` - Archive statistics
  - `/api/content/youtube` - YouTube videos collected
- **Frontend**: Shows recent posts, upcoming schedule, archive stats
- **Data Sources**: Local files + Supabase database
- **Updates**: Polls every 60 seconds

### Phase 4: Automated Todo List ✅
- **API**: `/api/todos` - Current work from Quinn's agendas
- **Features**:
  - Parses Quinn's daily agendas (`/agents/daily_logs/*_AGENDA.md`)
  - Extracts agent tasks with deadlines and status
  - Shows agent memory incidents
  - Status indicators: GREEN (ON_TRACK), YELLOW (AT_RISK), RED (BLOCKED)
- **Frontend**: Displays current work with status colors
- **Updates**: Polls every 60 seconds

### Phase 5: Resource Usage Tracking ✅
- **API**: `/api/resources` - Usage metrics
- **Tracks**:
  - Claude API session time remaining
  - GitHub storage usage
  - Supabase storage usage
- **Frontend**: Progress bars with percentage indicators
- **Updates**: Polls every 120 seconds

### Phase 6: Chat Interface (Claude AI) ✅
- **API**: `POST /api/chat` - Chat with Claude
- **Features**:
  - Ask questions about Quinn's documentation
  - Ask about Leo's database
  - Ask about team skills
  - General project questions
  - Auto-detects context from your message
- **Context Types**:
  - **Quinn**: Protocols, agendas, agent memory
  - **Leo**: Database architecture, migrations, health
  - **Skills**: Team capabilities and expertise
  - **General**: Project overview
- **Language**: Explains technical concepts in simple language
- **Conversation History**: Maintains up to 10 messages per conversation

### Phase 7: Leo Integration ✅
- **APIs**:
  - `GET /api/leo/health` - Run database health check
  - `GET /api/leo/verify` - Verify writer system
  - `GET /api/leo/report` - Performance report
- **Frontend**: Displays database health, tables, writers, latency, connections
- **Features**: Refresh button, report generation, connection stats
- **Updates**: Polls every 30 seconds

### Phase 8: Frontend Assembly ✅
- **Main Page**: `/public/index.html`
  - 3-column grid layout (Desktop)
  - Responsive design (tablet/mobile)
  - Real-time module loading
- **Styling**: `/public/css/dashboard.css`
  - Carnivore brand colors (#3d2817, #d4a574)
  - Status indicators (green, yellow, red)
  - Responsive grid system
- **JavaScript Modules**: 6 frontend modules
  - Each module initializes independently
  - Real-time polling with configurable intervals
  - Error handling with fallback UI

## Directory Structure

```
dashboard/
├── server.js                    # Express server (main entry point)
├── package.json                 # Dependencies
├── .env -> ../.env             # Symlink to parent config
│
├── api/routes/                  # API endpoints
│   ├── health.js               # Health metrics
│   ├── content.js              # Content stats
│   ├── todos.js                # Quinn's agendas
│   ├── resources.js            # Usage tracking
│   ├── chat.js                 # Claude chat
│   └── leo.js                  # Leo integration
│
├── services/                    # Business logic
│   ├── supabase.js             # Database wrapper
│   ├── github.js               # GitHub API
│   ├── leo-service.js          # Leo agent operations
│   ├── quinn-parser.js         # Agenda parsing
│   ├── content-service.js      # Content data
│   └── claude.js               # Claude API
│
├── config/                      # Configuration
│   └── context-builder.js      # Claude context building
│
├── lib/                         # Utilities
│   ├── logger.js               # Console logging
│   ├── cache.js                # In-memory caching
│   └── utils.js                # Helper functions (planned)
│
└── public/                      # Frontend assets
    ├── index.html              # Main dashboard page
    ├── css/dashboard.css       # Styling
    └── js/
        ├── dashboard.js        # Main orchestration
        ├── health-metrics.js   # Health module
        ├── content-metrics.js  # Content module
        ├── todo-list.js        # Todos module
        ├── resources.js        # Resources module
        ├── chat-interface.js   # Chat module
        └── leo-integration.js  # Leo module
```

## API Endpoints

### Health Monitoring
```
GET /api/health
```
Returns site health metrics including database status, Core Web Vitals, uptime, validation pipeline.

### Content Metrics
```
GET /api/content
GET /api/content/recent[?limit=10]
GET /api/content/upcoming
GET /api/content/archive-stats
GET /api/content/youtube[?limit=10]
```
Returns content statistics and blog post information.

### Todos & Tasks
```
GET /api/todos
```
Returns current work from Quinn's agendas, memory incidents, and upcoming posts.

### Resource Usage
```
GET /api/resources
```
Returns Claude, GitHub, and Supabase usage metrics.

### Chat Interface
```
POST /api/chat
```
Request body:
```json
{
  "message": "your question",
  "conversationId": "optional-uuid",
  "contextType": "quinn|leo|general|skills"
}
```

### Leo Database
```
GET /api/leo/health
GET /api/leo/verify
GET /api/leo/report
```
Returns Leo's database health, writer system status, and performance reports.

## Features

### Polled Data
- **Health Metrics**: Updates every 30 seconds
- **Content**: Updates every 60 seconds
- **Todos**: Updates every 60 seconds
- **Resources**: Updates every 120 seconds
- **Chat**: Real-time (user-initiated)
- **Leo**: Updates every 30 seconds

### Caching
- 5-minute TTL for most data
- In-memory cache to reduce API calls
- Automatic cache invalidation

### Error Handling
- Graceful fallbacks to mock data
- User-friendly error messages
- Detailed console logging (set `DEBUG=true`)

## Environment Variables

Required in parent `.env`:
```bash
ANTHROPIC_API_KEY=your_claude_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
GITHUB_TOKEN=optional_github_token  # For higher API rate limits
```

Optional:
```bash
DASHBOARD_PORT=3000             # Custom port
DEBUG=true                      # Enable debug logging
```

## Development

### Start Server
```bash
npm start
```

### Development with Auto-reload
```bash
npm run dev
# Requires nodemon
```

### Test Individual Endpoints
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/todos
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What does Quinn do?"}'
```

## What's Next

### Minor Fixes Needed
1. Health route registration (might need route path adjustment)
2. Supabase integration testing (currently using mock data)
3. Claude API context optimization

### Future Enhancements
- WebSocket real-time updates (instead of polling)
- Historical data charts and trends
- Alert system for critical issues
- Mobile app version
- User authentication and roles
- Dark mode toggle
- Custom polling intervals per module
- Data export (JSON/CSV)
- Advanced query builder for Leo

## Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill existing process if needed
kill -9 <PID>
```

### Missing environment variables
```bash
# Verify .env exists in parent directory
cat ../.env | grep -E "ANTHROPIC|SUPABASE|GITHUB"
```

### Routes not registering
```bash
# Check server logs
DEBUG=true npm start
# Monitor console for route registration messages
```

### Claude chat not working
```bash
# Verify API key
echo $ANTHROPIC_API_KEY
# Check API quota at https://console.anthropic.com
```

## Architecture

### Tech Stack
- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Database**: Supabase PostgreSQL
- **AI**: Claude API (Anthropic)
- **Automation**: Python (parent project)
- **Hosting**: Local (localhost:3000)

### Design Principles
1. **Simple**: Minimal dependencies, vanilla JavaScript
2. **Resilient**: Fallback to mock data when APIs unavailable
3. **Observable**: Detailed logging, clear status indicators
4. **Maintainable**: Clear code structure, documented APIs
5. **Performant**: Caching, polling optimization, lazy loading

## Performance Targets

- Page load: < 2 seconds
- API response: < 500ms
- Database query: < 50ms
- Memory usage: < 100MB
- Uptime: 99.9%

## Notes

- This dashboard is designed for **local use only** (127.0.0.1)
- It monitors the Carnivore Weekly project's health and operations
- All sensitive data stays local (no external transmission)
- The dashboard can run indefinitely with automatic polling
- Mock data is used when real data isn't available

## Support

For issues or questions:
1. Check the console logs (`DEBUG=true npm start`)
2. Verify environment variables in parent `.env`
3. Test individual API endpoints with curl
4. Check network tab in browser DevTools

---

**Dashboard Status**: ✅ Core functionality complete, ready for local deployment

**Last Updated**: January 1, 2026

## Command Centre 2.0 (2026-09-13)

`generate_command_center.py` renders a single-screen operator cockpit. Nothing
was removed: every previous section lives in the collapsible **Forensic detail**
drawer, split across eight tabs.

### The cockpit, top to bottom

| Band | What it answers | Logic |
|---|---|---|
| Business state strip | status, yesterday/7d/30d collected, purchases, experiment, ops failures | `build_executive` |
| What matters today | the 3–5 things worth a minute, each FACT / INTERPRETATION / ACTION | `build_what_matters` |
| Needs attention · Do not overreact to | what to act on; what to ignore | `build_needs_attention` / `build_dont_overreact` |
| CW · KD scorecards | traffic, audience, buying intent, revenue, email — now, prior, direction, confidence | `scorecard_html` |
| Paid funnel | the measurable purchase journey and where it drops | `build_funnel` |
| Currently measuring | impressions, engagements, checkouts, purchases vs the review threshold | `build_experiments` |
| Revenue | gross, refunds, collected; net profit not measured | `build_revenue` |
| Signal vs noise | observed beside de-spiked, with the reason | `clean_traffic` |
| Customer signal | reply counts and categories, no addresses | `fetch_mail` |
| Change timeline | project changes beside movements, with the caveat | `parse_timeline` / `correlate` |
| Data health | per-source current / stale / unavailable / error | `build_data_quality` |
| Forensic detail | eight tabs of diagnostics, collapsed by default | — |

### Visual system

**Every element must be able to change in a way that affects a decision.** A
funnel stage's first bar is 100% by definition, so no stage bars are drawn at
all; the *drops between* stages are drawn instead, because that is what a
reader acts on. An inferred stage's carry-through says `equal by definition`
rather than a meaningless 100%. The only progress bar on the page is the
experiment's review threshold, which moves daily and gates a decision.

**The evidence meter** is the signature element. Every figure carries a
three-segment sample-weight mark, and a thin-evidence figure is rendered dimmed
with its percentage withheld. The page goes quiet where it does not know.

**Mono is measurement, sans is interpretation.** Anything measured is set in
the mono face; anything inferred is set in the prose face. The split is
load-bearing — a reader can tell fact from inference before reading a word.

**Colour.** A deep slate ground, so state has somewhere quiet to sit. Green,
amber, red and blue mean state and appear nowhere decorative. CW is identified
by an ember rule and KD by a teal one, used only as 2px marks and labels, never
as a card fill.

**Print.** `@media print` produces an executive summary on white: state strip,
what matters, attention, scorecards, funnel, experiment, revenue, signal,
timeline and data health. The forensic drawer and its tables — including the
mail table that used to run off the page — are excluded entirely.

### Rules the code enforces

- **Sample size.** A percentage is suppressed when both periods sit under the
  floor in `MIN_SAMPLE`. `1 → 3` renders as `+2, low sample — directional only`.
- **Failed source ≠ zero.** Any fetcher returning `{'error': ...}` renders
  "data unavailable"; it never becomes a 0 in a headline or a trend.
- **Gross, collected and profit are three quantities.** `gross` is what Stripe
  charged. `collected after refunds` is gross minus refunds — money in the
  account, **not profit**. `net profit` is **not measured**: no cost feed exists
  for processor fees, COGS, hosting or tooling. The `$1,000/month` target is a
  **net-profit** target, so progress toward it renders as **unavailable**, not
  as a percentage estimated from refunds alone. There is deliberately no
  progress bar — a bar against an unknown numerator would be a picture of a
  number we do not have.
- **Sessions, not event fires.** The funnel counts GA4 sessions containing each
  event. On 2026-09-13 the bridge CTA showed 31 fires from 7 sessions.
- **The cleaned traffic figure is named after its method.** It is
  `cleaned trend sessions`, not "human-like sessions": whole days flagged by the
  3× median spike detector are dropped, and nothing identifies a bot at the
  session level. Dropping a whole day also discards that day's real readers and
  does nothing about crawler traffic spread thinly across ordinary days.
  Observed sessions are always shown beside it.
- **An experiment threshold is a review gate, not proof.** Below it, the panel
  reads `KEEP MEASURING — BELOW REVIEW THRESHOLD` and the experiment must not be
  touched. Reaching it reads `REVIEW ELIGIBLE`, which means look at it. It never
  says change, keep, or winner. Purchases are shown beside engagement so a
  healthy CTA rate on zero sales cannot read as success.
- **Stage honesty.** Every funnel stage is tagged `measured`, `inferred` or
  `unavailable`. CTA controls that open the payment modal are drawn as
  overlapping *contributors*, not as a stage above it, because the modal has
  more than one entry point.
- **Correlation is not cause.** A change must be at least 2 days old to be
  offered as a co-movement, curated project-log entries outrank commit
  subjects, and every statement carries the caveat.
- **Read-only.** The dashboard observes. It never sends, deploys, publishes, or
  writes to customer records.

### Email metrics

Unchanged from the 2026-09-13 repair and **must not be redefined without
evidence of a defect**: attempts = distinct delivered + bounced; delivery and
bounce over attempts; complaint and both unique rates over delivered; fixture
addresses excluded from the whole production cohort first. The executive layer
consumes that block verbatim.

### Declaring an experiment

Edit `dashboard/experiments.json`. Only the GA4 event pair lives there, because
prose cannot name a denominator; the narrative of the change is picked up from
`docs/project-log/decisions.md` automatically. Delete the entry when it ends.

**`started` is the first full calendar day AFTER the change shipped, never the
ship date.** GA4 is aggregated here by day, so a mid-day ship mixes pre-change
and post-change traffic into one bucket that cannot be split; that day is
excluded outright rather than counted and caveated. Record the ship moment in
`shipped` for the audit trail. If `started` is in the future the panel reads
`NOT STARTED — WINDOW OPENS <date>` and shows no progress bar, rather than
showing zeros as though they were a result.

**Checkout and purchase counts are same-window totals, not attributed
outcomes.** `build_experiments()` has no session-level intersection, so it
cannot show that a checkout came from a session that saw the bridge offer. They
render below a dashed divider headed *Same window, not attributed*, and the
verdict never says "purchases from these impressions". Do not relabel them
without real session-intersection instrumentation — which this task did not
add.

This was corrected on 2026-09-13: the entry had `started: 2026-09-07` while the
revised bridge shipped at 14:45 UTC on 09-13 (`2cfd1792`, with the CTA source
property in `617c9abd` at 14:57), so the 29 impressions / 6 engagements / 2
purchases then on screen were not a valid cohort.

### The model narrative is optional

`model_narrative()` is a labelled opinion beside the deterministic brief, not
underneath it. Every executive output — status verdict, brief, what changed,
needs attention, do not overreact, funnel, scorecard — is computed by
`command_center_exec.py` *before* the model is called and does not depend on
it. If the call fails, times out, or returns no text, the page and the email
are fully usable and simply carry no opinion. `--no-model` exercises that path
and is what the tests and any offline run use.

The 2026-09-13 repair was: `max_tokens` 700 → 3000, because sonnet-5 emits a
thinking block that was consuming the whole budget before a word of review was
written; and an explicit empty-result branch that logs `stop_reason` and the
block types instead of returning `None` silently. Parsing was **not** loosened —
it still accepts only `type == 'text'` blocks, because a thinking block is not
the review. Cost per run is about **$0.044** (~11k input, ~700 output including
thinking), roughly **$1.35/month** at one run a day. Before the fix a run cost
about the same and produced nothing, so this recovered waste rather than adding
spend.

### Tests

```
python3 dashboard/test_command_center.py
```

Each test pins a rule the previous version of the page broke.

### Deploying to the NAS

**Manual publish** (no email — this is the command to run by hand):

```
python3 dashboard/generate_command_center.py --nas
```

`--nas --email` is for the scheduled cron, or when an email send is explicitly
wanted. Do not add `--email` to a manual run out of habit; it mails Brew every
time.

Publishes to `http://100.117.74.5:8087/live/command-center.html` plus a dated
archive copy. It sends nothing — email happens only when `--email` is passed.
Requires Tailscale.

The **Mac crontab at 03:40 PT is the only thing that runs the Command Center**:

```
40 3 * * * /opt/homebrew/bin/python3 .../dashboard/generate_command_center.py --nas --email
```

`.github/workflows/dashboard-update.yml` refreshes the Google Sheet only — it
was deliberately taken off the Command Center on 2026-08-28 because the runner
cannot route to the Tailscale-only NAS, and the repo is public, so a report
holding subscriber emails and revenue must never be staged there as an
artifact. That workflow does run `test_command_center.py`, so a regression in
the executive layer fails CI even though the report itself is generated on the
Mac.

Nothing new needs to be installed for 2.0 — `command_center_exec.py` is pure
standard library and sits next to the generator, so the existing cron line and
NAS layout are unchanged.
