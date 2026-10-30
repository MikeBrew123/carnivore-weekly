/**
 * Calculator CTA Injection — Carnivore Weekly
 * Injects a branded calculator promotion into blog posts.
 * Placed after the bottom reaction buttons, before Related Content.
 * Uses topic detection to customize messaging per article.
 */
(function() {
  // Only run on blog post pages
  if (!window.location.pathname.startsWith('/blog/') || window.location.pathname === '/blog/' || window.location.pathname === '/blog/index.html') return;

  // Topic detection from page content
  const body = document.body.innerText.toLowerCase();
  const title = document.title.toLowerCase();

  const topics = {
    weightLoss: /weight loss|fat loss|lose weight|cutting|psmf|body fat/i,
    muscle: /muscle|strength|training|performance|protein|athletic|bulk/i,
    beginner: /getting started|beginner|new to|first week|start|transition/i,
    digestion: /digestion|constipation|gut|bowel|bloat/i,
    electrolyte: /electrolyte|salt|sodium|magnesium|potassium|cramp/i,
    health: /cholesterol|blood work|insulin|hormone|inflammation|autoimmune/i,
    meal: /meal plan|what to eat|recipe|cooking|food list|shopping/i,
  };

  // Promise only what the free calculator gives: targets plus one sample day.
  // The 30-day plan is the paid $29 report; never imply it is free here.
  let headline = 'Know What to Eat, and How Much';
  let subtext = 'Get your daily protein, fat and calorie targets for your age, weight and goal, plus a sample day of meals. Takes about two minutes.';
  let cta = 'Get My Free Targets';

  if (topics.weightLoss.test(title + body.slice(0, 2000))) {
    headline = 'How Much Should You Be Eating?';
    subtext = 'See the protein, fat and calories that fit your age, weight and goal, plus a sample day of meals. Free, and about two minutes.';
    cta = 'See My Free Numbers';
  } else if (topics.muscle.test(title + body.slice(0, 2000))) {
    headline = 'Protein That Protects Your Muscle';
    subtext = 'See how much protein you need each day to hold on to muscle, with fat and calorie targets and a sample day of meals.';
    cta = 'Get My Free Targets';
  } else if (topics.beginner.test(title + body.slice(0, 2000))) {
    headline = 'Not Sure Where to Start?';
    subtext = 'Answer a few questions and get your daily food targets, plus a sample day of meals for carnivore, keto, low carb or pescatarian.';
    cta = 'Show Me Where to Start';
  } else if (topics.digestion.test(title + body.slice(0, 2000))) {
    headline = 'Getting the Balance Right';
    subtext = 'A sudden jump in fat can be hard on your stomach. See a protein and fat balance sized for you, plus a sample day of meals.';
    cta = 'Get My Free Targets';
  } else if (topics.electrolyte.test(title + body.slice(0, 2000))) {
    // Keeps the default copy. Electrolyte doses are withheld for many readers
    // on safety grounds, so this box must not promise anything about them.
  } else if (topics.meal.test(title + body.slice(0, 2000))) {
    headline = 'See a Day of Meals Built for You';
    subtext = 'Get a sample day of meals sized to your own protein, fat and calorie targets. A 30-day plan is an optional paid extra.';
    cta = 'See My Sample Day';
  }

  // Build the CTA HTML — matches Carnivore Weekly brand.
  // The footer line must not claim that no signup is needed: the calculator
  // blocks on an email address at step 1 and enrols it in the free email
  // series. This CTA renders on every blog post, so a stale claim here is the
  // site's most-seen untrue statement (audit 2026-09-10). Guarded by
  // tests/signup-and-retention-copy.test.mjs.
  const ctaHTML = `
    <div class="cw-calculator-cta" style="
      background: linear-gradient(135deg, #1a1a1a 0%, #2c1810 100%);
      border: 2px solid #8b4513;
      border-radius: 12px;
      padding: 40px 32px;
      margin: 40px 0;
      text-align: center;
      position: relative;
      overflow: hidden;
    ">
      <div style="position: relative; z-index: 1;">
        <p style="
          color: #d4a574;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 600;
          margin: 0 0 8px 0;
          font-family: 'Source Sans 3', sans-serif;
        ">Free Carnivore Calculator</p>

        <h3 style="
          color: #f5f5f0;
          font-family: 'Libre Baskerville', Georgia, serif;
          font-size: 1.6rem;
          font-weight: 700;
          margin: 0 0 12px 0;
          line-height: 1.3;
        ">${headline}</h3>

        <p style="
          color: #c4b5a5;
          font-size: 1rem;
          line-height: 1.6;
          margin: 0 auto 24px auto;
          max-width: 520px;
          font-family: 'Source Sans 3', sans-serif;
        ">${subtext}</p>

        <a href="/calculator.html?src=blog-${encodeURIComponent(window.location.pathname.split('/').pop().replace('.html',''))}" style="
          display: inline-block;
          background: linear-gradient(135deg, #ffd700 0%, #e6ac00 100%);
          color: #1a1a1a !important;
          font-weight: 700;
          font-size: 1.05rem;
          padding: 14px 36px;
          border-radius: 8px;
          text-decoration: none !important;
          font-family: 'Source Sans 3', sans-serif;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(255,215,0,0.4)'"
           onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(255,215,0,0.3)'"
           onclick="gtag&&gtag('event','blog_calculator_cta_click',{article:window.location.pathname,cta_text:'${cta.replace(/'/g, "\\'")}'})"
        >${cta} →</a>

        <p style="
          color: #8b7355;
          font-size: 0.8rem;
          margin: 16px 0 0 0;
          font-family: 'Source Sans 3', sans-serif;
        ">Free results in 60 seconds · Email required · Unsubscribe anytime</p>
      </div>
    </div>
  `;

  // Find the insertion point: after bottom reactions, before Related Content
  const relatedContent = document.querySelector('.related-content');
  const bottomReactions = document.querySelector('.post-reactions--bottom');

  const target = relatedContent || bottomReactions;
  if (target) {
    const div = document.createElement('div');
    div.innerHTML = ctaHTML;
    target.parentNode.insertBefore(div, target);
  }

  // Track impression
  if (typeof gtag === 'function') {
    gtag('event', 'blog_calculator_cta_impression', {
      article: window.location.pathname,
      cta_headline: headline
    });
  }
})();
