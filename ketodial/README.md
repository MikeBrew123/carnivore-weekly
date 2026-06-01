# KetoDial

Keto/carnivore macro calculator and coaching platform.

## Structure

```
ketodial/
  public/            # Live site (GitHub Pages at ketodial.com) — don't edit directly
  worker/            # Cloudflare Worker (calculator API, Stripe checkout)
  coach-app/         # KetoDial Coach web app (Next.js, Vercel at coach.ketodial.com)
  design/            # Claude Design prototypes (reference only, not served)
    coach/           # Coach app prototypes — Landing, Member App, Admin
    homepage/        # Homepage prototype (implemented)
    blog/            # Blog prototypes (implemented)
    recipes/         # Recipe prototypes (implemented)
    newsletter/      # Newsletter templates
  PLAN-coach-app.md          # Coach product spec
  DESIGN-BRIEF-coach-app.md  # Coach design brief
  stripe-products.json       # Stripe product config
```

## Coach App

Text-based accountability coaching. AI-drafted, human-reviewed by a carnivore nutrition reviewer.

- Weekly: $49/mo (Sunday check-in, one coached response/week)
- Daily: $129/mo (Phase 2)
- Tech: Next.js + Supabase + Stripe + Claude API
- Domain: coach.ketodial.com
