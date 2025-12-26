# Trigger Weekly Updates from Your Phone

## Setup (One-Time)

### Step 1: Add GitHub Secrets

Go to your GitHub repository settings and add your API keys as secrets:

1. Go to: https://github.com/MikeBrew123/carnivore-weekly/settings/secrets/actions
2. Click "New repository secret"
3. Add these two secrets:
   - Name: `YOUTUBE_API_KEY`, Value: [your YouTube API key]
   - Name: `ANTHROPIC_API_KEY`, Value: [your Anthropic API key]

### Step 2: Upload the Workflow File

The workflow file has been created locally at:
`.github/workflows/weekly-update.yml`

Since your GitHub token doesn't have workflow permissions, you need to upload it manually:

**Option A: Via GitHub Web Interface**
1. Go to: https://github.com/MikeBrew123/carnivore-weekly
2. Click "Add file" → "Create new file"
3. Name it: `.github/workflows/weekly-update.yml`
4. Copy and paste the contents from the local file
5. Commit directly to main

**Option B: Create New Token & Push**
1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Check the `workflow` scope
4. Use that token to push:
   ```bash
   git add .github/workflows/weekly-update.yml
   git commit -m "Add GitHub Actions workflow for phone triggering"
   git push
   ```

---

## How to Trigger from Your Phone

### Method 1: GitHub Mobile App (Easiest)

1. **Install GitHub Mobile App**
   - iOS: https://apps.apple.com/app/github/id1477376905
   - Android: https://play.google.com/store/apps/details?id=com.github.android

2. **Trigger the Workflow:**
   - Open the GitHub app
   - Navigate to your repository (carnivore-weekly)
   - Tap "Actions" tab
   - Tap "Weekly Content Update"
   - Tap "Run workflow" button
   - Tap "Run workflow" to confirm
   - ✅ Done! Check back in 5-10 minutes

### Method 2: Safari/Chrome Shortcut

1. **Create the Trigger URL:**
   - You'll need a Personal Access Token (PAT) with `repo` scope
   - Go to: https://github.com/settings/tokens
   - Generate new token with `repo` scope
   - Save it somewhere safe

2. **Create iOS Shortcut:**
   - Open Shortcuts app
   - Create new shortcut
   - Add "URL" action: `https://api.github.com/repos/MikeBrew123/carnivore-weekly/actions/workflows/weekly-update.yml/dispatches`
   - Add "Get Contents of URL" action
   - Set Method: POST
   - Add Header: `Authorization` = `Bearer YOUR_TOKEN_HERE`
   - Add Header: `Accept` = `application/vnd.github.v3+json`
   - Add Request Body: `{"ref":"main"}`
   - Set body type: JSON
   - Save as "Run Carnivore Weekly"

3. **Add to Home Screen:**
   - Tap the three dots on your shortcut
   - Tap "Add to Home Screen"
   - Now you have a one-tap button!

### Method 3: Calendar Event Link

Add this to a recurring Monday calendar event:

**Title:** "Run Carnivore Weekly"
**Notes:**
```
Tap to trigger: carnivoreweekly://trigger
Or open GitHub app and run workflow
```

You can create a URL scheme that opens the GitHub app directly to your repo.

---

## Optional: Automatic Schedule

To make it run automatically every Monday at 9 AM EST, edit the workflow file and uncomment these lines:

```yaml
schedule:
  - cron: '0 14 * * 1'  # 9 AM EST = 2 PM UTC
```

Then you don't need to trigger it manually at all!

---

## Monitoring

After triggering from your phone:

1. **Check Progress:**
   - GitHub app → Actions tab → See the running workflow
   - Takes about 5-10 minutes

2. **When Complete:**
   - Visit carnivoreweekly.com
   - New content is live!

3. **If It Fails:**
   - Check the Actions tab for error logs
   - Most common issues: API rate limits or keys not set

---

## Recommended Setup

**For Maximum Convenience:**

1. Set up the automatic schedule (runs every Monday at 9 AM)
2. Install GitHub mobile app as backup
3. You'll get a notification when it completes
4. Just check the site to verify - nothing to do!

**Or Keep Manual Control:**

1. Use GitHub mobile app to trigger when you want
2. Add a Monday 9 AM calendar reminder
3. One tap in the app → done
