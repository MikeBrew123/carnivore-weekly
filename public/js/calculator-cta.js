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

  let headline = 'Know Exactly What to Eat';
  let subtext = 'Get your personalized carnivore macros, 30-day meal plan, and custom protocol — built from your body stats and goals.';
  let cta = 'Get Your Free Macros';

  if (topics.weightLoss.test(title + body.slice(0, 2000))) {
    headline = 'Ready to Dial In Your Fat Loss?';
    subtext = 'Get your exact fat-loss macros, a 30-day meal plan, and a custom protocol built for your body and goals.';
    cta = 'Calculate Your Fat-Loss Macros';
  } else if (topics.muscle.test(title + body.slice(0, 2000))) {
    headline = 'Optimize Your Performance';
    subtext = 'Get precise muscle-building macros, meal timing, and a custom protocol tailored to your training.';
    cta = 'Get Your Performance Macros';
  } else if (topics.beginner.test(title + body.slice(0, 2000))) {
    headline = 'Not Sure Where to Start?';
    subtext = 'Our free calculator gives you exact macros and a sample meal plan in 60 seconds — no guesswork required.';
    cta = 'Start Your Personalized Plan';
  } else if (topics.digestion.test(title + body.slice(0, 2000))) {
    headline = 'Get the Ratios Right';
    subtext = 'Many digestion issues come from incorrect fat-to-protein ratios. Get your exact macros dialed in.';
    cta = 'Calculate Your Ideal Ratios';
  } else if (topics.electrolyte.test(title + body.slice(0, 2000))) {
    headline = 'Your Protocol Is Incomplete';
    subtext = 'Electrolytes are just one piece. Get your complete protocol — macros, meal timing, and supplementation.';
    cta = 'Get Your Complete Protocol';
  } else if (topics.meal.test(title + body.slice(0, 2000))) {
    headline = 'Your Personalized Meal Plan';
    subtext = 'Stop guessing. Get a 30-day meal plan built from your exact macros, preferences, and goals.';
    cta = 'Build Your Meal Plan';
  }

  // Build the CTA HTML — matches Carnivore Weekly brand
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

        <a href="/calculator.html" style="
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
        ">Free results in 60 seconds · No signup required</p>
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
