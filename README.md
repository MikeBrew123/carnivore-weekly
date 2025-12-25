# Carnivore Weekly - Automated Content Hub

An automated content aggregation and generation system for carnivore diet YouTube content, research, and trends.

## Project Overview

This system automatically:
- Collects weekly YouTube videos from top carnivore creators
- Gathers latest research studies from PubMed
- Analyzes news and trends
- Generates comprehensive weekly summaries using Claude AI
- Creates automated YouTube videos
- Publishes to website
- Distributes via social media and email

## Project Structure

```
carnivore-weekly/
├── .github/
│   └── workflows/          # GitHub Actions automation
├── scripts/
│   ├── collect_youtube.py  # YouTube data collection
│   ├── collect_research.py # Research paper scraping
│   ├── collect_news.py     # News aggregation
│   ├── analyze_content.py  # Claude AI analysis
│   ├── generate_pages.py   # HTML generation
│   ├── generate_video.py   # Video creation
│   └── upload_youtube.py   # YouTube upload
├── templates/
│   ├── weekly_update.html  # Weekly page template
│   ├── creator_profile.html
│   └── email_newsletter.html
├── data/
│   ├── youtube_data.json   # Collected data
│   ├── research_data.json
│   └── config.json         # Configuration
├── public/
│   ├── index.html          # Homepage
│   ├── weekly/             # Weekly updates
│   ├── creators/           # Creator profiles
│   ├── studies/            # Research summaries
│   └── assets/             # CSS, JS, images
└── README.md

```

## Setup

### Prerequisites
- Python 3.11+
- Node.js (for video generation - optional)
- Git

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd carnivore-weekly
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Configure data sources in `data/config.json`

### API Keys Needed

- YouTube Data API v3
- Anthropic Claude API
- PubMed API (optional)
- NewsAPI (optional)
- Synthesia API (for video generation)

## Usage

### Manual Run

```bash
# Collect data
python scripts/collect_youtube.py
python scripts/collect_research.py

# Generate content
python scripts/analyze_content.py
python scripts/generate_pages.py

# Create video
python scripts/generate_video.py
```

### Automated Run (GitHub Actions)

The system runs automatically every Monday at 10 AM UTC via GitHub Actions.

## Development

### Running Locally

```bash
# Test individual scripts
python scripts/collect_youtube.py --test

# Preview generated pages
python -m http.server 8000
# Visit http://localhost:8000/public/
```

### Adding New Features

1. Create feature branch
2. Implement changes
3. Test locally
4. Submit pull request

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Alternative: Netlify, DigitalOcean

See deployment docs for specific instructions.

## Roadmap

- [x] Project structure
- [ ] Data collection scripts
- [ ] Claude AI integration
- [ ] HTML generation
- [ ] Video automation
- [ ] GitHub Actions workflow
- [ ] Website deployment
- [ ] Email newsletter integration
- [ ] Social media automation

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/carnivore-weekly](https://github.com/yourusername/carnivore-weekly)
