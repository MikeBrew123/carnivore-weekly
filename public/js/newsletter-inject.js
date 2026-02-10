/**
 * Newsletter Signup Injection — Carnivore Weekly
 * Loads the newsletter-signup component into blog posts.
 * Placed after bottom reaction buttons, before the calculator CTA.
 * Source is set to "blog_inline" for tracking.
 */
(function() {
  // Only run on blog post pages
  if (!window.location.pathname.startsWith('/blog/') ||
      window.location.pathname === '/blog/' ||
      window.location.pathname === '/blog/index.html') return;

  // Don't double-inject
  if (document.querySelector('.newsletter-signup[data-source="blog_inline"]')) return;

  // Load the component
  fetch('/components/newsletter-signup.html')
    .then(function(res) { return res.text(); })
    .then(function(html) {
      // Create a container
      var wrapper = document.createElement('div');
      wrapper.innerHTML = html;

      // Override the source to track blog signups separately
      var signup = wrapper.querySelector('.newsletter-signup');
      if (signup) {
        signup.setAttribute('data-source', 'blog_inline');
      }

      // Find insertion point: before calculator CTA or before related content
      var calcCta = document.querySelector('.cw-calculator-cta');
      var relatedContent = document.querySelector('.related-content');
      var bottomReactions = document.querySelector('.post-reactions--bottom');

      var target = calcCta || relatedContent || bottomReactions;
      if (target && target.parentNode) {
        target.parentNode.insertBefore(wrapper, target);
      }

      // Track impression
      if (typeof gtag === 'function') {
        gtag('event', 'newsletter_inline_impression', {
          article: window.location.pathname
        });
      }
    })
    .catch(function(err) {
      // Silent fail — don't break the page
    });
})();
