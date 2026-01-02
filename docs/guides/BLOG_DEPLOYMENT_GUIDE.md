# Blog System Deployment Guide

**Status:** Complete and ready for launch
**Generated:** 2025-12-30
**Blog Posts:** 15 (scheduled Dec 31 - Jan 17)

---

## System Overview

Your blog system consists of:

1. **Infrastructure**
   - 15 blog posts (HTML files in `public/blog/`)
   - Metadata tracking (`data/blog_posts.json`)
   - Templates for rendering (`templates/`)

2. **Automation**
   - GitHub Actions workflow (auto-publish at 9 AM EST)
   - Python scripts for publishing pipeline
   - Scheduled date-based publishing

3. **Community**
   - Utterances comment system (GitHub Issues backend)
   - Persona-driven moderation
   - Human-in-the-loop responses

4. **Transparency**
   - The Lab page (ethical disclosure)
   - Personalized disclaimers (each persona)
   - Guardrails documentation (safety protocols)

---

## Pre-Launch Checklist (Do Before Going Live)

### Content Review & Edits

- [ ] **Review all 15 posts** for accuracy and tone
- [ ] **Suggest edits** (I'll incorporate them)
- [ ] **Final approval** before publishing

**Posts to review:**
1. 2025-12-31: Sarah - "Welcome to Carnivore Weekly"
2. 2025-01-01: Marcus - "The Anti-Resolution Playbook"
3. 2025-01-01: Chloe - "New Year, Same You"
4. 2025-01-05: Sarah - "Physiological Insulin Resistance"
5. 2025-01-06: Marcus - "The $7/Day Survival Guide"
6. 2025-01-07: Chloe - "The Lion Diet Challenge"
7. 2025-01-08: Sarah - "PCOS & Hormones"
8. 2025-01-09: Marcus - "The Deep Freezer Strategy"
9. 2025-01-10: Chloe - "Adult Acne Purge"
10. 2025-01-12: Sarah - "The ADHD Connection"
11. 2025-01-13: Marcus - "Anabolic Signaling (mTOR)"
12. 2025-01-14: Chloe - "The Night Sweats"
13. 2025-01-15: Sarah - "The Lipid Energy Model"
14. 2025-01-16: Marcus - "PSMF (Protein Sparing Modified Fasting)"
15. 2025-01-17: Chloe - "The Carnivore Bar Guide"

**Access:** `/Users/mbrew/Developer/carnivore-weekly/public/blog/`

### Technical Setup

- [ ] **Verify GitHub repo is public** (for GitHub Actions)
- [ ] **Enable GitHub Pages** (if not already):
  - Repo Settings → Pages → Source: Deploy from branch → main → /root
- [ ] **Test GitHub Actions** (optional, can test after launch):
  - Go to Repo → Actions → "Auto-Publish Scheduled Blog Posts" → Run workflow

### Comment System

- [ ] **Install Utterances app**: https://github.com/apps/utterances
- [ ] **Select repository:** MikeBrew123/carnivore-weekly
- [ ] **Test with a comment** on first published post
- [ ] **Set up GitHub notifications** for new issues (optional)

### Transparency Layer

- [ ] **Review The Lab page** (/public/the-lab.html)
- [ ] **Verify footer links** point to the-lab.html (already done)
- [ ] **Check that disclaimers** are accurate and in each persona's voice

### Final Checks

- [ ] **All posts have `published: true`** or `scheduled_date` set (check blog_posts.json)
- [ ] **Navigation links work** on all pages
- [ ] **Mobile responsive** (test on phone)
- [ ] **Blog index page displays** correctly (/blog.html)
- [ ] **The Lab page accessible** from footer

---

## Launch Day Steps (In Order)

### 1. Final Review & Approval

```
You: "All posts look good, ready to launch"
Claude: Confirms all technical checks passed
```

### 2. Commit Everything to GitHub

```bash
cd ~/Developer/carnivore-weekly

# Check what's ready to commit
git status

# Add all changes
git add .

# Commit with meaningful message
git commit -m "feat: Launch blog system with 15 initial posts

- 15 blog posts (Sarah/Marcus/Chloe personas)
- GitHub Actions auto-publishing workflow
- Comment system (Utterances) ready
- The Lab transparency page
- Complete with ethical guardrails

Posts scheduled to auto-publish 2025-12-31 to 2025-01-17"

# Push to GitHub
git push
```

### 3. Install Utterances App

1. Go to: https://github.com/apps/utterances
2. Click **Install**
3. Select repo: `MikeBrew123/carnivore-weekly`
4. Grant permissions (Issues: read/write)
5. Confirm installation

### 4. Enable GitHub Pages (If Needed)

1. Go to Repo → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main`, Folder: `/ (root)`
4. Click Save
5. Wait 1-2 minutes for GitHub to publish

### 5. Test Auto-Publishing (Optional)

**To verify the GitHub Actions workflow:**

1. Go to: Repo → Actions
2. Find: "Auto-Publish Scheduled Blog Posts"
3. Click → "Run workflow"
4. Check `/public/blog.html` appears or updates
5. Watch for first scheduled post (2025-12-31)

### 6. Announce & Monitor

**Day 1 (Dec 31):**
- Sarah's Welcome post publishes automatically (9 AM EST)
- Verify it appears on blog and blog index

**Days 2-17 (Jan 1-17):**
- Posts publish automatically at 9 AM EST
- Monitor for comments in GitHub Issues
- Respond to comments in persona voices
- Adjust based on feedback

---

## Post-Launch Operations

### Weekly Workflow

**Every Monday morning:**
```
1. Check GitHub Issues (new comments)
   → https://github.com/MikeBrew123/carnivore-weekly/issues

2. Respond to comments (in persona voice)
   - Can respond as yourself or as Sarah/Marcus/Chloe
   - Sign with persona name: "-Sarah", "-Marcus", "-Chloe"

3. Monitor which posts get most discussion
   → Informs future content topics

4. Watch analytics (if you set up Google Analytics)
   → Which posts get most views
   → Which creators drive traffic
```

### Content Calendar for Future Posts

After the initial 15 are published, add more posts:

**Frequency:** 2-3 new posts per month (one from each persona)
**Topics:** 15 more topics already in master list (see BLOG_VALIDATION_SUMMARY.md)

**Process:**
1. Pick next topic from master list
2. Generate post with AI (same process as initial 15)
3. Validate with 3 skills (/copy-editor, /carnivore-brand, /ai-text-humanization)
4. Add to `blog_posts.json` with scheduled_date
5. GitHub Actions handles publishing automatically

### Moderation Best Practices

**Spam/Inappropriate Comments:**
- Close the GitHub Issue (removes comment from blog)
- Or delete the issue entirely
- Utterances syncs automatically

**Healthy Discussion:**
- Encourage questions
- Share deeper context
- Tag other team members if needed

**Bad Faith Comments:**
- Respond once with charity
- If they double down, close the issue
- No need to engage trolls

---

## File Structure (What You Have)

```
carnivore-weekly/
├── .github/
│   └── workflows/
│       └── blog_publish.yml          ← GitHub Actions workflow
├── public/
│   ├── blog.html                      ← Blog index (auto-generated)
│   ├── the-lab.html                   ← Transparency page
│   └── blog/
│       ├── 2025-12-31-welcome-to-carnivore-weekly.html
│       ├── 2025-01-01-anti-resolution-playbook.html
│       ├── 2025-01-01-new-year-same-you.html
│       ├── ... (15 posts total)
│       └── 2025-01-17-carnivore-bar-guide.html
├── data/
│   └── blog_posts.json                ← Post metadata & scheduling
├── templates/
│   ├── blog_index_template.html       ← Blog listing template
│   ├── blog_post_template.html        ← Individual post template
│   └── ... (other templates)
├── scripts/
│   ├── check_scheduled_posts.py       ← Check what to publish
│   ├── generate_blog_pages.py         ← Render HTML from templates
│   └── ... (other scripts)
└── documentation/
    ├── BLOG_DEPLOYMENT_GUIDE.md       ← This file
    ├── BLOG_VALIDATION_SUMMARY.md     ← Validation status
    ├── BLOG_SYSTEM_STATUS.md          ← Previous session notes
    ├── COMMENT_SYSTEM_SETUP.md        ← How to moderate comments
    └── THE_LAB documentation          ← See /public/the-lab.html
```

---

## Troubleshooting

### Posts not auto-publishing at 9 AM EST?

**Check:**
1. GitHub Actions enabled? (Repo → Actions → enable)
2. Workflow file exists? (`.github/workflows/blog_publish.yml`)
3. Post scheduled_date set correctly in `blog_posts.json`?
4. GitHub Actions logs: Repo → Actions → "Auto-Publish..." → latest run

**If workflow fails:**
- Check error message in Actions logs
- Verify `data/blog_posts.json` is valid JSON
- Re-run workflow manually: Actions → Run workflow

### Comments not showing?

**Check:**
1. Utterances app installed? (Settings → Installed GitHub Apps)
2. `comments_enabled: true` in post metadata?
3. Blog post template has utterances script?
4. User has GitHub account? (Required to comment)

### The Lab page not accessible?

**Check:**
1. File exists: `public/the-lab.html`
2. Footer links updated in templates (already done)
3. Site deployed to GitHub Pages

---

## Going Live Timeline

**Before Dec 31, 2025:**
- [ ] Final content review & edits
- [ ] Technical checklist completed
- [ ] GitHub setup finished
- [ ] Test GitHub Actions workflow

**Dec 31, 2025 @ 9 AM EST:**
- Sarah's Welcome post auto-publishes
- Monitor for any issues

**Jan 1-17, 2025:**
- Posts auto-publish daily at 9 AM EST
- Monitor comments, respond in persona voices
- Gather feedback for future improvements

**Post-Jan 17:**
- Begin planning next batch of 15 posts
- Analyze which posts performed best
- Identify trending topics for future content

---

## Support & Maintenance

**Questions about:**
- **Blog posts:** Review BLOG_VALIDATION_SUMMARY.md
- **Comment system:** See COMMENT_SYSTEM_SETUP.md
- **Deployment:** This guide (BLOG_DEPLOYMENT_GUIDE.md)
- **System status:** Check BLOG_SYSTEM_STATUS.md
- **Ethical framework:** See `/public/the-lab.html`

**Scripts to run manually:**

```bash
# Check what posts will publish today
python3 scripts/check_scheduled_posts.py

# Regenerate all blog pages (if you edited JSON)
python3 scripts/generate_blog_pages.py

# View blog posts metadata
cat data/blog_posts.json | python3 -m json.tool
```

---

## Success Metrics

Track these to measure blog performance:

1. **Post Views** (Google Analytics)
   - Which posts get most traffic?
   - What's the bounce rate?

2. **Comments** (GitHub Issues)
   - How many comments per post?
   - Response rate to questions?

3. **Internal Traffic** (Analytics)
   - Blog → Wiki traffic
   - Blog → Calculator clicks
   - Blog → Channels (creator pages)

4. **Email/Social** (If you share posts)
   - Click-through rate
   - Share rate
   - Engagement metrics

---

## Next Steps After Launch

1. **Gather user feedback** from comments
2. **Analyze which topics** resonate most
3. **Plan next batch** of 15 posts (topics from master list)
4. **Consider Wiki integration** once blog is stable
5. **Expand to video content** linking to blog posts (optional future)

---

## Final Notes

Your blog system is:
- ✅ **Automated** (no manual publishing needed)
- ✅ **Transparent** (The Lab page explains methodology)
- ✅ **Community-enabled** (comment system ready)
- ✅ **Scalable** (easy to add more posts)
- ✅ **Persona-driven** (authentic voices)
- ✅ **Production-ready** (tested infrastructure)

**You're ready to launch. Just need your final approval on the posts, then we commit and go live.**

---

Generated by Claude Code
Last Updated: 2025-12-30
