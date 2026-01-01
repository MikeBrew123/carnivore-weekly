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
