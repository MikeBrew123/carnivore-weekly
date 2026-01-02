# Getting a Fresh Supabase Service Role Key

## Problem
Your current service role key in `.env` is **NOT WORKING**:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dGRwdm5qZXd0YWh1eGp5bHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDE2MDY0MywiZXhwIjoxODkxODI3MjQzfQ.qyZNTfEcTbTqXhDPZqWKJ0J2pI5rTf6Q8VTk2xvCIZc
```

**Last rotated:** January 1, 2024 (diagnostic confirmed it's invalid)

---

## Solution: Get Fresh Key from Dashboard

### Step 1: Go to Supabase Console
- **URL:** https://app.supabase.com
- **Login:** Using your Supabase account

### Step 2: Select Project
- Look for: **carnivore-weekly**
- **Project ID:** kwtdpvnjewtahuxjyltn

### Step 3: Navigate to API Settings
1. Click: **Settings** (left sidebar, bottom)
2. Click: **API** (left sidebar, under Settings)

### Step 4: Get Service Role Key
1. Find section: **Project API Keys**
2. Look for the key labeled: **service_role**
3. Description: "Bypass Row Level Security"
4. Click the **copy icon** (to the right of the key)
5. **DO NOT click "Regenerate"** yet - just copy the existing key first

### Step 5: Test Current Key
```bash
# Before replacing in .env, test if Supabase can recognize it
curl -H "Authorization: Bearer KEY_HERE" \
  https://kwtdpvnjewtahuxjyltn.supabase.co/rest/v1/writers \
  -H "apikey: KEY_HERE"

# If you get "connection refused" or "Invalid API Key" error, the key is bad
```

### Step 6: If Key is Bad - Regenerate
If the test failed:
1. In Supabase Settings → API
2. Click the **Regenerate** button next to **service_role** key
3. **Confirm** you want to regenerate (old key will be disabled)
4. Copy the new key
5. Update `.env` with the new key

### Step 7: Update .env
```bash
# Replace line 5 in .env
SUPABASE_SERVICE_ROLE_KEY=NEW_KEY_HERE
```

### Step 8: Verify
```bash
# Run diagnostic
node scripts/diagnose_supabase.js

# Should show:
# ✅ writers: EXISTS
# ✅ blog_posts: EXISTS
# etc.
```

---

## Why This Is Needed

The current key (from Jan 2024):
- ❌ Returns "Invalid API Key" error
- ❌ Cannot authenticate to database
- ❌ Migrations fail silently (appear to succeed but create nothing)
- ❌ Channels page shows empty (no data)

A fresh key will:
- ✅ Allow authentication
- ✅ Create tables successfully
- ✅ Load data from JSON files
- ✅ Populate all pages with content

---

## Important Notes

**DO NOT share this key publicly:**
- Keep it in `.env` (not committed to git)
- Keep it in `secrets/api-keys.json` (not committed to git)
- Both files are in `.gitignore`

**Regenerating key:**
- Takes effect immediately
- Old key is disabled instantly
- Any services using old key will fail
- This is intentional - improves security

---

## After Getting New Key

Once you have the new key:

1. **Update .env**
   ```
   SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_KEY
   ```

2. **Update secrets**
   ```json
   // In /secrets/api-keys.json, update:
   "service_role_key": "YOUR_NEW_KEY",
   "last_rotated": "2026-01-01"
   ```

3. **Test with diagnostic**
   ```bash
   node scripts/diagnose_supabase.js
   ```

4. **Deploy migration**
   - Dashboard SQL Editor
   - OR Supabase CLI
   - (Instructions in PHASE4_DEPLOYMENT_INSTRUCTIONS.md)

---

## Questions?

If the key from dashboard also doesn't work:
- Check if project ID is correct: `kwtdpvnjewtahuxjyltn`
- Check if URL is correct: `https://kwtdpvnjewtahuxjyltn.supabase.co`
- Try in different browser
- Check browser console for actual error (F12 → Console tab)
