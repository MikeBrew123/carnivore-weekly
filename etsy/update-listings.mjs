#!/usr/bin/env node
/**
 * Update all CarnivoreWeekly Etsy listings
 * Fixes: pricing, tags (13 each), descriptions, titles
 * Deactivates duplicate listing
 */
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;
const SHARED_SECRET = ETSY_SHARED_SECRET;
const SHOP_ID = 63916912;

// ─── LISTING DATA ────────────────────────────────────────────
const DEACTIVATE = [4451058273]; // duplicate 30-Day Bundle

const listings = [
  // ── MACROS ──────────────────────────────────
  {
    id: 4451046699,
    title: 'Carnivore Macros Calculator (Desktop PDF) | Set Your Macros in 5 Minutes | Printable',
    price: 7.99,
    tags: ['carnivore macros','carnivore diet guide','macro calculator pdf','keto macros','low carb macros','protein calculator','printable worksheet','zero carb','meat based diet','animal based','fat loss guide','carnivore pdf','instant download'],
    description: `CARNIVORE MACROS IN 5 MINUTES — DESKTOP PDF

I spent years overthinking macros. Tracking apps, conflicting advice, endless recalculations every time my weight changed. Then I figured out a simpler way.

This guide gives you a framework that actually sticks:

Protein = Your Anchor (this stays consistent — it protects your muscle)
Carbs = Your Ceiling (a hard limit, not a target to hit)
Fat = Your Dial (turn it up or down based on hunger and goals)

That's it. Three numbers. Once you understand why each one matters, you stop second-guessing yourself.

WHAT'S INSIDE
• Step-by-step calculator: BMR, activity level, and how to set a reasonable deficit
• Printable worksheet with space for your own notes
• A worked example so you can see exactly how the math works
• Sanity checks to catch common mistakes before they trip you up

THIS VERSION IS FOR
• Printing out and keeping by your fridge or desk
• People who like to write things down
• Desktop or tablet viewing

A NOTE ON EXPECTATIONS
This isn't a magic formula. It's a starting point. Your body will tell you what needs adjusting — this guide helps you understand what those signals mean.

Educational content only, not medical advice. If you have health conditions, talk to your doctor.

---
WANT BOTH VERSIONS?
The Complete Macros Bundle (Desktop + Mobile) is our best value.
Plan on desktop. Follow on your phone.`
  },
  {
    id: 4451051190,
    title: 'Carnivore Macros Calculator (Mobile PDF) | Phone-Ready Macro Guide | Instant Download',
    price: 7.99,
    tags: ['carnivore macros','mobile pdf','macro calculator','keto macros','low carb macros','phone friendly','protein calculator','zero carb','meat based diet','carnivore diet guide','animal based','carnivore pdf','instant download'],
    description: `CARNIVORE MACROS IN 5 MINUTES — MOBILE PDF

You're standing in front of the meat counter. How much ribeye do you actually need today?

This is the version you keep on your phone. Swipe through it, check your numbers, move on. No printing, no app logins, no subscription.

THE SAME SIMPLE FRAMEWORK
• Protein = Your Anchor (the one number you hit consistently)
• Carbs = Your Ceiling (stay under it without obsessing)
• Fat = Your Dial (adjust based on how you feel)

WHAT'S INSIDE
• Phone-optimized layout — easy to read without zooming
• A Daily Data Card you can screenshot for your home screen
• Quick-reference steps you can check in 30 seconds
• The same sanity checks from the desktop version

BEST FOR
• Checking targets while grocery shopping
• Quick reference at restaurants
• People who don't want to print anything

Educational content only, not medical advice.

---
WANT BOTH VERSIONS?
The Complete Macros Bundle (Desktop + Mobile) is our best value.
Plan at home. Reference on the go.`
  },
  {
    id: 4451051221,
    title: 'Carnivore Macros Bundle (Desktop + Mobile PDF) | BEST VALUE | Complete Macro System',
    price: 14.97,
    tags: ['carnivore bundle','macro calculator','desktop mobile pdf','printable pdf','keto macros','low carb macros','carnivore diet guide','protein calculator','zero carb','meat based diet','animal based','fat loss guide','instant download'],
    description: `BEST VALUE — MOST POPULAR

CARNIVORE MACROS — COMPLETE BUNDLE

Plan at home. Reference on the go.

This bundle includes both versions of the macros guide — the printable desktop PDF for planning and note-taking, plus the phone-optimized version you can pull up anywhere.

THE FRAMEWORK THAT SIMPLIFIES EVERYTHING
• Protein = Your Anchor (consistent, non-negotiable)
• Carbs = Your Ceiling (a limit, not a goal)
• Fat = Your Dial (your main adjustment lever)

Once this clicks, you stop needing apps and trackers. You just know your numbers.

WHAT YOU GET (2 FILES)
• Desktop PDF: For printing, writing notes, working through calculations
• Mobile PDF: Phone-optimized for quick reference anywhere

HOW PEOPLE USE THIS
• Sunday: Print the desktop version, calculate your numbers, plan your week
• Tuesday at Costco: Check the mobile version for portion sizing
• Friday night out: Quick glance at your Daily Data Card before ordering

This bundle saves you a few dollars over buying separately, and having both versions just makes the whole system work better.

Educational content only, not medical advice.

---
READY FOR THE COMPLETE SYSTEM?
The Complete Carnivore Starter Kit includes food lists, a 30-day guide, and troubleshooting — everything to get you started right.`
  },

  // ── FIRST 30 DAYS ──────────────────────────
  {
    id: 4451053635,
    title: 'First 30 Days on Carnivore (Desktop PDF) | Week-by-Week Adaptation Guide | Printable',
    price: 7.99,
    tags: ['carnivore 30 days','carnivore beginner','first month carni','keto transition','carnivore adaptation','meat based diet','carnivore meal plan','zero carb guide','carnivore diet guide','printable pdf','animal based diet','carnivore lifestyle','instant download'],
    description: `YOUR FIRST 30 DAYS ON CARNIVORE — DESKTOP PDF

Most people who try carnivore quit in the first month. Not because it doesn't work — because nobody told them what to expect.

Day 3: headaches. Day 7: weird energy. Day 14: you're bored of steak. Day 21: someone at work asks if you're "okay." These are all predictable. And they're all solvable.

This guide walks you through week by week so nothing catches you off guard.

WHAT'S INSIDE
• Week-by-week breakdown of what to expect
• Common adaptation symptoms and what they actually mean
• When to push through vs. when to adjust
• Practical tips for social situations and meal prep

THIS VERSION IS FOR
• Printing and keeping as a daily reference
• Writing notes and tracking your own experience
• Desktop or tablet viewing

The first month is when most people quit. This guide makes sure you don't quit for the wrong reasons.

Educational content only, not medical advice. If you have health conditions, work with your doctor.

---
WANT BOTH VERSIONS?
The First 30 Days Bundle (Desktop + Mobile) lets you plan at home and check in on the go.`
  },
  {
    id: 4451056127,
    title: 'First 30 Days on Carnivore (Mobile PDF) | Phone-Ready Adaptation Guide | Instant Download',
    price: 7.99,
    tags: ['carnivore 30 days','mobile pdf','first month carni','carnivore beginner','keto transition','phone friendly','carnivore adaptation','meat based diet','zero carb guide','carnivore diet guide','animal based diet','carnivore lifestyle','instant download'],
    description: `YOUR FIRST 30 DAYS ON CARNIVORE — MOBILE PDF

It's day 4. You feel like garbage. Is this normal?

Yes. And this guide tells you exactly why, what to do about it, and when it gets better.

Keep this on your phone for those moments when you need a quick reality check during your first month on carnivore.

WHAT'S INSIDE
• Phone-optimized week-by-week adaptation guide
• Quick-check symptom reference — what's normal, what's not
• Practical tips you can read in 30 seconds
• Social situation survival guide

BEST FOR
• Checking symptoms during adaptation
• Quick reference when doubt kicks in
• People who want reassurance on the go

The first month is the hardest. Having answers in your pocket makes the difference between quitting and pushing through.

Educational content only, not medical advice.

---
WANT BOTH VERSIONS?
The First 30 Days Bundle (Desktop + Mobile) gives you the complete guide.`
  },
  {
    id: 4451067690, // keeping newer duplicate
    title: 'First 30 Days Carnivore Bundle (Desktop + Mobile PDF) | BEST VALUE | Adaptation Guide',
    price: 14.97,
    tags: ['carnivore 30 bundle','first month carni','carnivore beginner','keto transition','desktop mobile pdf','carnivore adaptation','meat based diet','carnivore meal plan','zero carb guide','carnivore diet guide','animal based diet','printable pdf','instant download'],
    description: `BEST VALUE — FIRST 30 DAYS BUNDLE

YOUR FIRST 30 DAYS ON CARNIVORE — COMPLETE BUNDLE

The guide at home. The quick reference in your pocket.

This bundle includes both versions of the First 30 Days guide — the printable desktop PDF for planning and tracking, plus the phone version you can check anytime doubt kicks in.

WEEK-BY-WEEK BREAKDOWN
• Week 1: What adaptation feels like and why it's happening
• Week 2: Energy changes, digestion shifts, and common concerns
• Week 3: When things start clicking (and new challenges that appear)
• Week 4: How to evaluate your results and decide what's next

WHAT YOU GET (2 FILES)
• Desktop PDF: For printing, note-taking, and tracking your experience
• Mobile PDF: Phone-optimized for quick symptom checks and reassurance

WHY THIS MATTERS
Most people quit carnivore in the first month because they hit a rough patch and assume something is wrong. This guide tells you what's coming so you can prepare instead of panic.

Educational content only, not medical advice.

---
READY FOR THE COMPLETE SYSTEM?
The Complete Carnivore Starter Kit includes macros, food framework, and troubleshooting — everything for your journey.`
  },

  // ── FOOD FRAMEWORK ─────────────────────────
  {
    id: 4451067037,
    title: 'Carnivore Food Framework (Desktop PDF) | What to Eat on Carnivore | Printable Guide',
    price: 7.99,
    tags: ['carnivore food list','carnivore diet guide','food framework pdf','keto food list','carnivore foods','meat based diet','animal based diet','carnivore shopping','zero carb foods','carnivore meals','low carb foods','printable pdf','instant download'],
    description: `CARNIVORE FOOD FRAMEWORK — DESKTOP PDF

The hardest part of carnivore isn't willpower. It's standing in the grocery store wondering what the hell to buy.

Most people start with ribeye and eggs. That works for about two weeks. Then you get bored, start making exceptions, and suddenly you're back to ordering pizza.

This guide gives you a framework for building variety without overthinking it.

WHAT'S INSIDE
• A tiered food list organized by priority (not just "eat meat")
• How to rotate proteins so you don't burn out on one cut
• Practical shopping strategies that keep costs reasonable
• When and how to include organs, seafood, and dairy

THIS VERSION IS FOR
• Printing and keeping in your kitchen
• Reference while meal planning
• Desktop or tablet viewing

This isn't a rigid meal plan. It's a decision framework. You learn the logic once, then you stop needing the guide.

Educational content only, not medical advice.

---
WANT BOTH VERSIONS?
The Food Framework Bundle (Desktop + Mobile) lets you plan at home and reference on the go.`
  },
  {
    id: 4451070758,
    title: 'Carnivore Food Framework (Mobile PDF) | Phone-Ready Food Guide | Instant Download',
    price: 7.99,
    tags: ['carnivore food list','mobile pdf','food framework','keto food list','carnivore foods','phone friendly','carnivore shopping','zero carb foods','meat based diet','animal based diet','carnivore meals','carnivore pdf','instant download'],
    description: `CARNIVORE FOOD FRAMEWORK — MOBILE PDF

You're at the butcher counter. Or Costco. Or that weird specialty shop your friend told you about. What do you actually need?

This is the version you keep on your phone. Quick reference for what to buy, what to rotate, and how to keep things interesting without falling back on the same three meals.

THE SAME PRACTICAL FRAMEWORK
• Proteins organized by tier — not just "eat meat"
• Rotation strategies so you don't burn out
• Shopping tips that keep your budget in check
• Guidelines for organs, seafood, and dairy

WHAT'S INSIDE
• Phone-optimized layout — no zooming required
• Quick-reference food tiers you can check in seconds
• The same framework from the desktop version, reformatted for mobile

BEST FOR
• Grocery shopping reference
• Quick check at restaurants or butcher shops
• People who want everything on their phone

Educational content only, not medical advice.

---
WANT BOTH VERSIONS?
The Food Framework Bundle (Desktop + Mobile) gives you the complete system.`
  },
  {
    id: 4451072926,
    title: 'Carnivore Food Framework Bundle (Desktop + Mobile PDF) | BEST VALUE | Complete Food Guide',
    price: 14.97,
    tags: ['carnivore food pdf','food framework','carnivore food list','keto food list','desktop mobile pdf','carnivore foods','carnivore shopping','zero carb foods','meat based diet','animal based diet','carnivore meals','printable pdf','instant download'],
    description: `BEST VALUE — FOOD FRAMEWORK BUNDLE

CARNIVORE FOOD FRAMEWORK — COMPLETE BUNDLE

Plan at home. Reference at the store.

This bundle includes both versions of the Food Framework — the printable desktop PDF for meal planning and the phone-optimized version you can pull up anywhere.

THE FRAMEWORK THAT ENDS FOOD CONFUSION
• Proteins organized by tier — not just "eat meat"
• Rotation strategies so you don't get bored after week two
• Shopping strategies that keep costs reasonable
• Clear guidelines for organs, seafood, and dairy

WHAT YOU GET (2 FILES)
• Desktop PDF: For printing, meal planning, kitchen reference
• Mobile PDF: Phone-optimized for shopping and quick checks

HOW PEOPLE USE THIS
• Saturday morning: Print the desktop version, plan your week's meals
• Monday at Costco: Check the mobile version for what to grab
• Wednesday dinner: Quick reference for how to cook that organ meat you bought

Having both versions means you actually use the framework instead of forgetting about it.

Educational content only, not medical advice.

---
READY FOR THE COMPLETE SYSTEM?
The Complete Carnivore Starter Kit includes macros, meal planning, and troubleshooting — everything to get you started right.`
  },

  // ── TROUBLESHOOTING ────────────────────────
  {
    id: 4451073001,
    title: 'Carnivore Troubleshooting Guide (Desktop PDF) | Fix Common Diet Problems | Printable',
    price: 7.99,
    tags: ['carnivore problems','diet problems','keto side effects','carnivore adaptation','fat loss stall','meat diet issues','carnivore cravings','digestive issues','zero carb guide','carnivore diet guide','printable pdf','animal based diet','instant download'],
    description: `CARNIVORE TROUBLESHOOTING GUIDE — DESKTOP PDF

Something's not working. Weight stalled. Energy tanked. Digestion is... different. Cravings won't quit.

Before you blame the diet, check the usual suspects. Most carnivore problems have straightforward causes and practical fixes.

This guide walks through the most common issues people hit and what to do about them.

WHAT'S INSIDE
• Weight loss stalls: why they happen and how to break through
• Energy crashes: common causes beyond "just eat more fat"
• Digestive changes: what's normal adaptation vs. what needs attention
• Persistent cravings: the difference between habit and deficiency
• Electrolyte and hydration troubleshooting

THIS VERSION IS FOR
• Printing and keeping as a reference
• Working through problems systematically
• Desktop or tablet viewing

Most problems on carnivore have simple solutions. This guide helps you find them without spiraling into Reddit threads at 2am.

Educational content only, not medical advice.

---
WANT BOTH VERSIONS?
The Troubleshooting Bundle (Desktop + Mobile) gives you answers at home and on the go.`
  },
  {
    id: 4451076646,
    title: 'Carnivore Troubleshooting Guide (Mobile PDF) | Quick Problem Solver | Instant Download',
    price: 7.99,
    tags: ['carnivore problems','mobile pdf','diet problems','keto side effects','phone friendly','carnivore adaptation','fat loss stall','meat diet issues','carnivore cravings','digestive issues','zero carb guide','carnivore diet guide','instant download'],
    description: `CARNIVORE TROUBLESHOOTING GUIDE — MOBILE PDF

Something feels off. You need answers now, not a research project.

This is the phone version of our troubleshoot guide. Quick reference for when you're mid-stall, mid-craving, or mid-panic about whether this is still working.

WHAT'S INSIDE
• Phone-optimized symptom checker
• Quick-reference fixes for common problems
• When to adjust vs. when to wait it out
• The same solutions from the desktop version, reformatted for mobile

COMMON ISSUES COVERED
• Weight loss stalls
• Energy and mood changes
• Digestive adaptation
• Persistent cravings
• Electrolyte imbalances

BEST FOR
• Quick answers when something feels wrong
• Reference during adaptation rough patches
• People who troubleshoot from their phone

Educational content only, not medical advice.

---
WANT BOTH VERSIONS?
The Troubleshooting Bundle (Desktop + Mobile) gives you the complete reference.`
  },
  {
    id: 4451077866,
    title: 'Carnivore Troubleshooting Bundle (Desktop + Mobile PDF) | BEST VALUE | Problem Solver',
    price: 14.97,
    tags: ['carnivore problems','diet problems','keto side effects','desktop mobile pdf','carnivore adaptation','fat loss stall','meat diet issues','carnivore cravings','digestive issues','zero carb guide','carnivore diet guide','printable pdf','instant download'],
    description: `BEST VALUE — TROUBLESHOOTING BUNDLE

CARNIVORE TROUBLESHOOTING GUIDE — COMPLETE BUNDLE

The diagnostic tool at home. The quick fix in your pocket.

This bundle includes both versions of the Troubleshooting guide — the detailed desktop PDF for working through problems systematically, plus the phone version for quick answers when you need them.

COMMON ISSUES COVERED
• Weight loss stalls: why they happen and practical solutions
• Energy crashes: causes and fixes beyond generic advice
• Digestive changes: normal adaptation vs. red flags
• Persistent cravings: habit vs. deficiency
• Electrolyte and hydration problems

WHAT YOU GET (2 FILES)
• Desktop PDF: For systematic problem-solving and detailed reference
• Mobile PDF: Phone-optimized for quick symptom checks and fixes

MOST PROBLEMS ARE SOLVABLE
The carnivore diet works. But adaptation has speed bumps, and some tweaks make a big difference. This guide covers the problems that make people quit — and the fixes that keep them going.

Educational content only, not medical advice.

---
READY FOR THE COMPLETE SYSTEM?
The Complete Carnivore Starter Kit includes macros, food framework, and your first 30 days — the full package.`
  },

  // ── COMPLETE KIT ───────────────────────────
  {
    id: 4451079282,
    title: 'Complete Carnivore Starter Kit (8 PDFs) | Macros + Food + First 30 Days + Troubleshooting',
    price: 29.97,
    tags: ['carnivore kit','carnivore bundle','keto bundle','macro calculator','food framework','first 30 days','troubleshoot guide','fat loss guide','meat based diet','zero carb','animal based','carnivore diet guide','instant download'],
    description: `THE COMPLETE CARNIVORE STARTER KIT

Most people who try carnivore quit in the first month. Not because it doesn't work — because nobody told them what to expect.

The headaches around day 3. The weird energy dip in week 2. The moment you realize you're bored of steak and need ideas. These are all solvable problems, but only if you know they're coming.

This kit gives you everything I wish I'd had when I started.

WHAT'S INCLUDED (8 FILES — DESKTOP + MOBILE VERSIONS OF EACH)

1. MACROS GUIDE
The Anchor/Ceiling/Dial framework. Calculate your protein, set your carb limit, understand how to adjust fat. Stop guessing.

2. FOOD FRAMEWORK
Not a meal plan — a decision framework. What to stock, what to rotate, how to keep things interesting. Removes the "what do I eat?" paralysis.

3. FIRST 30 DAYS GUIDE
Week-by-week breakdown of what to expect. Adaptation symptoms that scare people off are predictable. This tells you what's normal, what's not, and when to adjust.

4. TROUBLESHOOTING GUIDE
Stalled weight loss. Persistent cravings. Energy crashes. Digestive changes. These have causes and solutions — this guide walks through the common ones.

WHY THIS WORKS
Each piece solves a specific problem:
• Macros give you targets so you're not guessing
• Food framework removes daily decision fatigue
• 30-day guide keeps you from quitting during adaptation
• Troubleshooting fixes problems that make people give up

Every file comes in both desktop (printable) and mobile (phone-optimized) versions.

Educational content based on research and experience — not medical advice. If you have health conditions, work with your doctor.`
  }
];

// ─── API HELPERS ─────────────────────────────────────────────

async function getToken() {
  // Delegates to the shared Supabase-backed token store (single source of truth).
  return getEtsyToken();
}

function headers(token) {
  return {
    'x-api-key': `${CLIENT_ID}:${SHARED_SECRET}`,
    'Authorization': `Bearer ${token}`
  };
}

async function updateListing(token, listing) {
  const url = `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${listing.id}`;

  const body = new URLSearchParams();
  body.append('title', listing.title);
  body.append('description', listing.description);
  body.append('price', listing.price.toFixed(2));
  body.append('tags', listing.tags.join(','));

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...headers(token),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await res.json();
  if (res.ok) {
    return { success: true, id: listing.id, title: data.title, price: data.price };
  } else {
    return { success: false, id: listing.id, error: data };
  }
}

async function deactivateListing(token, listingId) {
  const url = `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${listingId}`;
  const body = new URLSearchParams();
  body.append('state', 'inactive');

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...headers(token),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const data = await res.json();
  return res.ok ? { success: true } : { success: false, error: data };
}

// ─── MAIN ────────────────────────────────────────────────────

async function main() {
  console.log('Getting fresh access token...');
  const token = await getToken();
  console.log('Token acquired.\n');

  // Deactivate duplicates
  for (const id of DEACTIVATE) {
    console.log(`Deactivating duplicate listing ${id}...`);
    const result = await deactivateListing(token, id);
    console.log(result.success ? '  Deactivated.' : `  FAILED: ${JSON.stringify(result.error)}`);
  }

  console.log(`\nUpdating ${listings.length} listings...\n`);

  let success = 0;
  let failed = 0;

  for (const listing of listings) {
    process.stdout.write(`  ${listing.id} — ${listing.title.substring(0, 50)}...`);
    const result = await updateListing(token, listing);
    if (result.success) {
      console.log(' OK');
      success++;
    } else {
      console.log(` FAILED`);
      console.log(`    Error: ${JSON.stringify(result.error)}`);
      failed++;
    }
    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${success} updated, ${failed} failed`);
  console.log(`Duplicate deactivated: ${DEACTIVATE.length}`);
  console.log(`Mug listing (4439612470): left unchanged`);
}

main().catch(e => console.error('Fatal:', e));
