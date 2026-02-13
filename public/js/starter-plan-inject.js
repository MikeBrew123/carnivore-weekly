/**
 * Starter Plan CTA Injection — Carnivore Weekly
 * Adds a "New to carnivore?" banner linking to /starter-plan.html
 * Injected above the newsletter signup on blog posts.
 */
(function() {
  // Only run on blog post pages
  if (!window.location.pathname.startsWith('/blog/') ||
      window.location.pathname === '/blog/' ||
      window.location.pathname === '/blog/index.html') return;

  // Don't double-inject
  if (document.querySelector('.starter-plan-cta')) return;

  var html = '<div class="starter-plan-cta" style="' +
    'background:#faf8f4;border:1px solid #e8e2d8;border-left:4px solid #ffbf00;' +
    'padding:1.25rem 1.5rem;margin:2rem 0;border-radius:0 8px 8px 0;' +
    'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">' +
    '<div>' +
    '<strong style="color:#1a1a1a;font-size:1.05rem;">New to carnivore?</strong>' +
    '<span style="color:#4a4a4a;font-size:0.95rem;margin-left:0.5rem;">Get our free 7-day starter plan — one email per day.</span>' +
    '</div>' +
    '<a href="/starter-plan.html" style="' +
    'background:#4a0404;color:#f5f5f0;text-decoration:none;padding:0.6rem 1.25rem;' +
    'border-radius:6px;font-weight:600;font-size:0.9rem;white-space:nowrap;' +
    'transition:background 0.2s ease;" ' +
    'onmouseover="this.style.background=\'#5c0808\'" ' +
    'onmouseout="this.style.background=\'#4a0404\'">' +
    'Start Free' +
    '</a>' +
    '</div>';

  var wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  // Insert before the newsletter signup (which is injected by newsletter-inject.js)
  // If newsletter isn't there yet, insert before calculator CTA or related content
  var newsletter = document.querySelector('.newsletter-signup[data-source="blog_inline"]');
  var calcCta = document.querySelector('.cw-calculator-cta');
  var relatedContent = document.querySelector('.related-content');
  var bottomReactions = document.querySelector('.post-reactions--bottom');

  var target = newsletter || calcCta || relatedContent || bottomReactions;
  if (target && target.parentNode) {
    target.parentNode.insertBefore(wrapper.firstChild, target);
  }

  // Track impression
  if (typeof gtag === 'function') {
    gtag('event', 'starter_plan_cta_impression', {
      article: window.location.pathname
    });
  }
})();
