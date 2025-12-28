# AI Report Generation API

This backend endpoint generates comprehensive carnivore diet reports using Claude AI.

## Quick Deploy to Cloudflare Workers (Free)

### 1. Sign Up for Cloudflare Workers
- Go to https://workers.cloudflare.com/
- Sign up for free account (100,000 requests/day free tier)

### 2. Get Claude API Key
- Go to https://console.anthropic.com/
- Sign up / log in
- Navigate to API Keys
- Create a new key
- Copy it (starts with `sk-ant-`)

### 3. Deploy the Worker

**Option A: Wrangler CLI (Recommended)**
```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create new worker
wrangler init carnivore-report-api
cd carnivore-report-api

# Copy the code from generate-report.js into src/index.js

# Add your Claude API key as secret
wrangler secret put ANTHROPIC_API_KEY
# Paste your Claude API key when prompted

# Deploy
wrangler deploy
```

**Option B: Dashboard (Easier)**
1. Go to Cloudflare Dashboard → Workers & Pages
2. Click "Create Application" → "Create Worker"
3. Name it: `carnivore-report-api`
4. Click "Deploy"
5. Click "Quick Edit"
6. Paste the code from `generate-report.js`
7. Click "Save and Deploy"
8. Go to Settings → Variables
9. Add Environment Variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Claude API key
   - Click "Encrypt" to make it a secret
10. Save

### 4. Get Your API URL

After deployment, you'll get a URL like:
```
https://carnivore-report-api.YOUR-SUBDOMAIN.workers.dev
```

Copy this URL - you'll need it for the frontend.

### 5. Update Frontend

In `public/questionnaire.html`, update the API endpoint:

```javascript
// Line ~670, change this:
const response = await fetch('/api/generate-report', {

// To this (use your worker URL):
const response = await fetch('https://carnivore-report-api.YOUR-SUBDOMAIN.workers.dev', {
```

### 6. Test It

1. Go to your calculator
2. Click upgrade (use test mode: card `4242 4242 4242 4242`)
3. Fill out questionnaire
4. Submit
5. Report should generate in 30-60 seconds

## Cost Estimate

**Cloudflare Workers:**
- Free tier: 100,000 requests/day
- Paid: $5/month for 10 million requests

**Claude API:**
- Model: Claude Sonnet 4.5
- Input: ~2,000 tokens per report
- Output: ~12,000 tokens per report
- Cost per report: ~$0.40
- 100 reports = $40

**Total monthly cost (estimated):**
- 100 reports/month: ~$40
- 500 reports/month: ~$200
- 1,000 reports/month: ~$400

## Monitoring

Check Cloudflare Workers dashboard for:
- Request volume
- Error rates
- Response times

Check Anthropic dashboard for:
- API usage
- Token consumption
- Costs

## Troubleshooting

**CORS Error:**
- Make sure the worker is deployed and accessible
- Check that the frontend URL is correct

**API Key Error:**
- Verify ANTHROPIC_API_KEY is set in Cloudflare environment variables
- Make sure it's encrypted (secret)

**Report Generation Fails:**
- Check Cloudflare Workers logs
- Verify Claude API key is valid
- Check if you hit rate limits

## Next Steps

1. ✅ Deploy worker
2. ✅ Test with test payment
3. ⏭️ Set up email delivery (optional - can manually send for now)
4. ⏭️ Add PDF generation (optional - HTML report works for now)
5. ⏭️ Set up Stripe webhook for automation (optional)

## Support

Questions? Check:
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Claude API docs: https://docs.anthropic.com/
