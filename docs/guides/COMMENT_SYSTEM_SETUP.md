# Comment System Setup - Utterances

## Overview

Carnivore Weekly uses **Utterances** for comments. Utterances maps blog post comments to GitHub Issues, making moderation simple and keeping everything in GitHub.

## How It Works

1. **User leaves a comment** on a blog post
2. **Utterances creates a GitHub Issue** in the repo automatically
3. **You review/respond** in GitHub (as yourself or in persona voice)
4. **Comment appears** on the blog (automatically synced)

**Why Utterances?**
- No backend database needed (GitHub is the backend)
- Free and open-source
- Easy moderation (just manage GitHub Issues)
- Spam-resistant (requires GitHub login)
- GDPR-friendly (no third-party tracking)

---

## Setup Steps

### Step 1: Enable Utterances App

1. Go to: https://github.com/apps/utterances
2. Click **Install**
3. Select your repository: `MikeBrew123/carnivore-weekly`
4. Click **Install**

### Step 2: Verify Configuration

The blog post template already includes utterances:

```html
<!-- In templates/blog_post_template.html -->
<script src="https://utteranc.es/client.js"
    repo="MikeBrew123/carnivore-weekly"
    issue-term="pathname"
    theme="github-dark"
    crossorigin="anonymous"
    async>
</script>
```

**Configuration breakdown:**
- `repo`: Your GitHub repo
- `issue-term="pathname"`: Each blog post URL gets its own issue thread
- `theme="github-dark"`: Matches your site's dark theme
- `crossorigin="anonymous"`: Allows cross-origin requests

✅ **Already configured and ready to go.**

---

## Moderation Workflow

### How to Respond to Comments

**Option 1: As Yourself (Mike)**
1. Go to: https://github.com/MikeBrew123/carnivore-weekly/issues
2. Find the issue for the blog post (title matches post slug)
3. Read the comment
4. Reply as yourself
5. It appears on the blog automatically

**Option 2: In Persona Voice**

For higher engagement, respond as Sarah/Marcus/Chloe:

1. **Review the comment** in GitHub Issue
2. **Draft a response** in the persona's voice:
   - Sarah: Educational, warm, evidence-based
   - Marcus: Direct, punchy, performance-focused
   - Chloe: Conversational, humorous, insider perspective
3. **Validate with /carnivore-brand skill** (optional but recommended)
4. **Post comment** on the GitHub Issue
5. **Signature**: Sign it "-Sarah", "-Marcus", or "-Chloe"

**Example response from Sarah:**
```
Great question! Here's what the research shows...

[Your evidence-based answer]

The key takeaway: [simplified insight]

—Sarah
```

### Handling Spam

**If you get spam comments:**
1. GitHub Issue appears in the repo
2. Delete the issue or lock it
3. Comment disappears from blog automatically
4. No moderation queue needed (you control everything)

---

## What Users See

When a user visits a blog post:
1. They scroll to bottom
2. See "Comments" section with Utterances widget
3. Click "Sign in with GitHub" to comment
4. Write their comment
5. It creates a GitHub Issue thread

**Important:** Users must have a GitHub account to comment. This filters out drive-by trolls and bots.

---

## Best Practices

### Response Time
- Aim to respond within 24-48 hours
- Users get notifications when you reply
- Creates sense of community

### Tone Guidelines
- Always be helpful and respectful
- Correct misinformation gently (cite sources)
- Share personal experiences when relevant
- Ask follow-up questions to deepen discussion

### Cross-Promote
- Pin important discussions to the blog post
- Share particularly good Q&As in the newsletter
- Use comments to identify blog post topics (what people are asking about)

---

## Monitoring Comments

### Weekly Check-In

```bash
# Check for new issues (comments)
gh issue list --repo MikeBrew123/carnivore-weekly --limit 20

# Or just visit:
https://github.com/MikeBrew123/carnivore-weekly/issues
```

### Automated Alerts (Optional)

Set up GitHub notifications to email you when new issues are created:
1. Go to GitHub Settings → Notifications
2. Set repo to "Participating and @mentions"
3. Receive email for new issues

---

## Troubleshooting

### Comments not showing up?
- Clear browser cache
- Check that blog post `comments_enabled: true` in `blog_posts.json`
- Verify repo name is correct in template

### GitHub Issue not creating?
- Confirm Utterances app is installed on repo
- Check browser console for errors
- Try posting comment again

### Want to disable comments on a post?
```json
{
  "id": "2025-01-05-physiological-insulin-resistance",
  "comments_enabled": false,
  "...rest of post metadata..."
}
```

Then regenerate blog pages:
```bash
python3 scripts/generate_blog_pages.py
```

---

## Privacy Notes

**For Users:**
- Comments are public (stored in GitHub Issues)
- Requires GitHub account (users control their data)
- GitHub's privacy policy applies

**For You:**
- No private user data collected
- All data in GitHub (encrypted in transit)
- Can export/backup comment threads anytime
- Can delete issues (removes comments)

---

## Advanced: Persona Consistency

To keep persona responses consistent:

1. **Create a "Comment Response Template"** for each persona
2. **Keep a doc** with example responses
3. **Run through /carnivore-brand validator** before posting (optional)

**Sarah's template:**
- Open with empathy ("Great question!")
- Explain the science simply
- Cite sources if relevant
- Close with practical takeaway
- Sign "-Sarah"

**Marcus's template:**
- Start with direct answer
- Provide the protocol/numbers
- Explain the "why"
- Offer the metric/measurement angle
- Sign "-Marcus"

**Chloe's template:**
- Relatable opener ("So real!")
- Share relevant community insight
- Practical tip for real life
- Light humor if appropriate
- Sign "-Chloe"

---

## Setup Checklist

- [x] Utterances HTML in blog_post_template.html
- [ ] Install Utterances GitHub app (when ready to go live)
- [ ] Test with first blog post (post a test comment)
- [ ] Set up GitHub notifications for new issues
- [ ] Create persona response templates
- [ ] Add link to moderation workflow (pin in README)

**Status:** Ready to activate on launch day. No additional setup needed until then.

---

**Next Steps:**
1. When blog goes live, install Utterances app
2. Post a test comment on a blog post
3. Verify comment → GitHub Issue workflow
4. Start responding to user comments!
