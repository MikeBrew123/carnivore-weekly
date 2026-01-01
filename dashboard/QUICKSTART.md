# Dashboard Quick Start Guide

## 🚀 Start the Dashboard

```bash
cd /Users/mbrew/Developer/carnivore-weekly/dashboard
npm start
```

**That's it!** The dashboard will be running at: `http://localhost:3000`

---

## 📊 What You'll See

### Left Column
- **Site Health**: Database status, Core Web Vitals, uptime, error rates
- **Content Metrics**: Recent blog posts, upcoming schedule, archive stats
- **Resource Usage**: Claude API, GitHub, and Supabase usage progress bars

### Middle Column
- **Current Work**: Today's tasks from Quinn's agenda (color-coded by status)
- **Leo Database**: Database health, tables, writers, connections

### Right Column
- **Chat Interface**: Ask questions about Quinn, Leo, or the project

---

## 💬 Chat Examples

Try these questions in the chat interface:

### About Quinn
- "What does Quinn do?"
- "What's on today's agenda?"
- "Show me the current tasks"
- "What are the validation rules?"

### About Leo & Database
- "Tell me about the database"
- "What tables do we have?"
- "How does the database work?"
- "What migrations have been deployed?"

### About the Team
- "What skills do we have?"
- "Who works on what?"
- "Tell me about Sarah"
- "What can Marcus do?"

### General
- "How does the project work?"
- "What's Carnivore Weekly?"
- "Explain [technical concept] simply"

---

## 🔍 Monitoring

The dashboard automatically updates:
- **Health**: Every 30 seconds
- **Content**: Every 60 seconds
- **Todos**: Every 60 seconds
- **Resources**: Every 120 seconds
- **Database**: Every 30 seconds

Click **"🔄 Refresh All"** in the header to manually refresh everything.

---

## 🛑 Stop the Dashboard

Press **Ctrl+C** in your terminal.

---

## ⚙️ Configuration

The dashboard uses settings from parent `.env` file:
```bash
ANTHROPIC_API_KEY=your_claude_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
```

If these aren't set, the dashboard will show mock data but still work.

---

## 🐛 Troubleshooting

### "Port 3000 already in use"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Chat not working
- Verify ANTHROPIC_API_KEY is set
- Check browser console (F12) for errors
- Try a simpler question like "Hello"

### No data appearing
- Check browser console for errors
- Verify network tab shows API calls
- Check if parent .env file exists with proper keys

### Enable debug logging
```bash
DEBUG=true npm start
```

---

## 📂 What's Inside

```
dashboard/
├── server.js          # Backend server
├── public/            # Frontend (HTML, CSS, JS)
├── api/routes/        # API endpoints
├── services/          # Business logic
├── lib/               # Utilities
└── config/            # Configuration
```

See **README.md** for complete documentation.

---

## 🎯 Key Features

✅ **Real-Time Monitoring** - See what's happening right now
✅ **Content Tracking** - Monitor blog posts and content
✅ **Task Management** - See current work from Quinn's agendas
✅ **Resource Usage** - Track API usage and storage
✅ **AI Chat** - Ask questions about the project
✅ **Database Status** - Monitor Leo's database health
✅ **Responsive Design** - Works on desktop, tablet, mobile
✅ **Smart Fallbacks** - Shows mock data if APIs unavailable

---

## 📈 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ Carnivore Weekly Dashboard       [🔄 Refresh] [Last upd] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Site Health    │  Current Work    │  Ask a Question    │
│  Content        │  Leo Status      │  (Chat Interface)  │
│  Resources      │                  │                    │
│                 │                  │  (keeps history)   │
│                 │                  │                    │
│                 │                  │  [Input field]     │
│                 │                  │  [Send button]     │
│                 │                  │                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📞 Help

See **README.md** for complete documentation including:
- All API endpoints
- Environment variables
- Architecture details
- Development instructions

---

## ✨ You're Ready!

Start the dashboard with `npm start` and open `http://localhost:3000` 🎉
