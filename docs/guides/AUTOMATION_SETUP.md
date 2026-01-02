# GitHub Actions Automation Setup

This document explains how to set up the weekly automation for Carnivore Weekly.

## Overview

The GitHub Actions workflow (`weekly-update.yml`) runs every Monday at 10:00 AM UTC and:

1. ✅ Collects YouTube data from top carnivore diet creators
2. ✅ Analyzes content using Claude AI
3. ✅ Generates updated website pages
4. ✅ Commits and pushes changes automatically

## Setup Instructions

### Step 1: Add GitHub Secrets

You need to add your API keys as GitHub secrets so the automation can access them securely.

1. Go to your repository on GitHub: https://github.com/MikeBrew123/carnivore-weekly
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these two secrets:

#### YOUTUBE_API_KEY
- Name: `YOUTUBE_API_KEY`
- Value: Your YouTube Data API v3 key

#### ANTHROPIC_API_KEY
- Name: `ANTHROPIC_API_KEY`
- Value: Your Claude API key

### Step 2: Enable GitHub Actions

1. Go to the **Actions** tab in your repository
2. If prompted, click **"I understand my workflows, go ahead and enable them"**

### Step 3: Test the Workflow

You can manually trigger the workflow to test it:

1. Go to **Actions** tab
2. Click **"Weekly Carnivore Content Update"** in the left sidebar
3. Click **"Run workflow"** button
4. Select the branch (main)
5. Click **"Run workflow"**

The workflow will run and you can watch the logs to see each step execute.

### Step 4: Set up GitHub Pages (Optional)

To host your site on GitHub Pages:

1. Go to **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Select branch: **main**
4. Select folder: **/public**
5. Click **Save**

Your site will be available at: `https://mikebrew123.github.io/carnivore-weekly/`

## Workflow Schedule

The automation runs:
- **Automatically**: Every Monday at 10:00 AM UTC
- **Manually**: Anytime via the "Run workflow" button in GitHub Actions

## Local Testing

To test the complete workflow locally:

```bash
# 1. Collect YouTube data
python3 scripts/youtube_collector.py

# 2. Analyze with Claude
python3 scripts/content_analyzer.py

# 3. Generate pages
python3 scripts/generate_pages.py

# 4. View the result
open public/index.html
```

## Monitoring

- Check the **Actions** tab to see workflow runs
- Each run will show logs for each step
- Failed runs will send you an email notification
- Successful runs will automatically update your repository

## Cost Estimates

- **YouTube API**: 10,000 quota units/day (free)
  - Weekly run uses ~500 units
- **Anthropic API**: Pay per token
  - Weekly run: ~$0.10-0.30 depending on content
- **GitHub Actions**: 2,000 minutes/month (free)
  - Weekly run: ~2-3 minutes

## Troubleshooting

### Workflow fails with "API key not found"
- Make sure you've added the secrets in GitHub Settings
- Secret names must match exactly: `YOUTUBE_API_KEY` and `ANTHROPIC_API_KEY`

### No changes committed
- This means no new data was collected (normal if there's no new content)

### Permission denied when pushing
- Go to Settings → Actions → General
- Under "Workflow permissions", select "Read and write permissions"
- Click Save

## Customization

You can customize the schedule by editing `.github/workflows/weekly-update.yml`:

```yaml
schedule:
  - cron: '0 10 * * 1'  # Every Monday at 10:00 AM UTC
```

Cron syntax:
- `0 10 * * 1` = Monday at 10:00 AM
- `0 10 * * *` = Every day at 10:00 AM
- `0 10 * * 3` = Every Wednesday at 10:00 AM

## Next Steps

1. Add your API keys as GitHub secrets
2. Test the workflow manually
3. Set up GitHub Pages to host your site
4. Let it run automatically every week!

---

**Note**: Remember to never commit your `.env` file to GitHub. It's already in `.gitignore` to prevent accidental commits.
