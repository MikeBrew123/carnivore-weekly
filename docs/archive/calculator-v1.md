# Calculator v1 Archive

## Architecture

Two-path system:
- **Free path**: 3-step macro calculator → instant results
- **Paid path**: $9.99 → Claude-generated personalized protocol → PDF report

### Flow
1. User fills calculator form (physical stats, lifestyle, goals)
2. Free: instant macro calculation displayed
3. Paid: Stripe Checkout → Cloudflare Worker calls Claude API → report stored in Supabase → Resend emails access link → 48h expiry

### API Endpoint
`POST /api/v1/calculator/submit` → Cloudflare Worker (`api/generate-report.js`)

### Database Tables
- `calculator2_sessions` — form submissions (JSONB form_data)
- `generated_reports` — Claude-generated reports with token access
- `report_access_log` — tracks report views
- `user_sessions` — session management

### Form Steps
- Step 1: Physical stats (age, weight, height, activity level)
- Step 2: Lifestyle & diet preferences
- Step 3: Health profile (medications, conditions, symptoms)
- Step 4: Results + Stripe CTA

### Coupon System (2026-01)
- `TEST999` coupon: 100% off for testing
- Coupon validation in Stripe Checkout session
- Issues found and fixed: coupon not applying on first attempt, validation timing

### Submission Flow
Submit button → loading overlay with progress bar → polling for completion → success modal with "View Report" and "Download PDF" buttons.

### Key Files
- `public/calculator.html` — calculator form + choice screen
- `public/questionnaire.html` — paid path form
- `public/report.html` — report display (token-based access)
- `api/generate-report.js` — Cloudflare Worker
- `calculator2-demo/` — React-based calculator v2

### Validation
```bash
cd calculator2-demo && node validate-robust.mjs
```
Button text: "Continue to Next Step" (Step 1), "See Your Results" (Step 2), "Upgrade for Full Personalized Protocol" (CTA).
