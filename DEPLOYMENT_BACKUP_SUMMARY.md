# 2026 Design Deployment - Backup & Rollback Plan

**Deployment Date:** January 2, 2026
**Status:** 2026 design deployed as main homepage
**Backups Created:** YES ✅

---

## Backup Files Location

```
/Users/mbrew/Developer/carnivore-weekly/backups/
├── index.html.backup (259 KB) - Previous homepage version
└── style.css.backup (18 KB) - Previous stylesheet version
```

**Last Backed Up:** January 2, 2026, 13:10 UTC

---

## Git Commit History

**Current (2026 Design):**
- `3bb2099` - Deploy 2026 design as main homepage ← **LIVE NOW**

**Previous Version:**
- `2952167` - feat: Analytics infrastructure deployment for 2026 demo
- `61558e3` - Production refinements for 2026 demo based on team feedback
- `882c60c` - feat: hybrid header design - restore original banner + new layout

---

## Rollback Options

### Option 1: Automatic Rollback Script (EASIEST)

**One-command rollback:**
```bash
cd /Users/mbrew/Developer/carnivore-weekly
./ROLLBACK.sh
```

This will:
- ✅ Restore previous index.html from backup
- ✅ Restore previous style.css from backup
- ✅ Commit the rollback to git
- ✅ Push to production
- ✅ Site reverts within 1-2 minutes

---

### Option 2: Git Revert

**If you want to keep git history clean:**
```bash
git revert 3bb2099
git push origin main
```

This creates a new commit that undoes the 2026 deployment (cleaner history).

---

### Option 3: Git Reset (NOT RECOMMENDED)

```bash
git reset --hard HEAD~1
git push origin main --force
```

⚠️ Only use if absolutely necessary—modifies commit history.

---

## Rollback Triggers

**Execute rollback if ANY of these occur:**

1. **Critical Errors:**
   - Page doesn't load
   - Major CSS/layout breaking
   - JavaScript errors in console
   - Mobile experience completely broken

2. **Performance Issues:**
   - LCP > 3000ms (2+ consecutive days)
   - Page load time increases significantly
   - Images not loading

3. **Conversion Metrics:**
   - Mobile calculator CTR < 10% (3+ consecutive days)
   - Bounce rate increases +10% or more
   - User feedback is overwhelmingly negative

4. **Analytics:**
   - Cannot track events properly
   - Data collection broken

---

## Monitoring Checklist (First 24 Hours)

- [ ] Page loads without errors
- [ ] All features visible (FAB, sticky CTA, lazy loading)
- [ ] No console JavaScript errors
- [ ] Mobile layout is responsive (375px - 1200px)
- [ ] Images load with lazy loading
- [ ] Links navigate correctly
- [ ] Performance acceptable (< 3 seconds load time)

---

## Backup Recovery Instructions

If something goes wrong and you need to manually restore:

**Restore index.html:**
```bash
cp /Users/mbrew/Developer/carnivore-weekly/backups/index.html.backup \
   /Users/mbrew/Developer/carnivore-weekly/public/index.html
```

**Restore style.css:**
```bash
cp /Users/mbrew/Developer/carnivore-weekly/backups/style.css.backup \
   /Users/mbrew/Developer/carnivore-weekly/public/style.css
```

**Commit and push:**
```bash
git add public/index.html public/style.css
git commit -m "Restore previous homepage version from backup"
git push origin main
```

---

## What Was Deployed

**Files Changed:**
- `public/index.html` - Replaced with 2026 demo version
- `public/style.css` - Replaced with 2026 stylesheet

**New Features Now Live:**
- ✅ Brown header (#1a120b) with 70/30 layout
- ✅ 7 images with lazy loading
- ✅ FAB feedback button (mobile)
- ✅ Sticky calculator CTA (mobile post-hero scroll)
- ✅ Analytics tracking code
- ✅ No horizontal scroll on insight cards
- ✅ Restored original logo design
- ✅ WCAG AA accessibility compliance

---

## Support Contacts

**If rollback needed:**
- Execute `./ROLLBACK.sh` immediately
- Notify team of issue
- Check PRODUCTION_DEPLOYMENT.md for monitoring queries

**For questions:**
- Frontend: Check index.html / style.css
- Analytics: Check ANALYTICS_INFRASTRUCTURE.md
- Performance: Run Lighthouse audit
- Backups: Check /backups/ directory

---

## Quick Status Check

**To verify current live version:**
```bash
curl -s https://carnivoreweekly.com/ | grep -q "fab-feedback" && echo "2026 design LIVE" || echo "Previous version LIVE"
```

**To check backup integrity:**
```bash
wc -l /Users/mbrew/Developer/carnivore-weekly/backups/*.backup
# index.html.backup should be ~1000+ lines
# style.css.backup should be ~700+ lines
```

---

**Status:** ✅ BACKED UP AND READY
**Rollback Available:** YES (Execute ./ROLLBACK.sh anytime)
**Last Verified:** January 2, 2026, 13:10 UTC
