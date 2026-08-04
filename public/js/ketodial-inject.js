/**
 * KetoDial Sister Site CTA Injection — Carnivore Weekly
 * Shows on blog posts where keto/carnivore comparison is natural.
 * Requires 5+ keto mentions AND excludes bride/bridal/wedding content.
 * Per Hermes spec: comparison/decision framing, never on calculator page.
 */
(function() {
  var path = window.location.pathname;
  if (!path.startsWith('/blog/') ||
      path === '/blog/' ||
      path === '/blog/index.html') return;

  if (document.querySelector('.cta-box--ketodial')) return;

  // Exclude bride/bridal pages
  if (path.indexOf('bridal') !== -1 || path.indexOf('bride') !== -1) return;

  var content = document.querySelector('.post-content');
  if (!content) return;

  var ketoCount = (content.textContent.match(/\bketo\b/gi) || []).length;
  if (ketoCount < 5) return;

  var slug = path.split('/').pop().replace('.html', '');
  var utm = '?utm_source=carnivoreweekly&utm_medium=blog_banner&utm_campaign=ketodial_crosslink&utm_content=' + encodeURIComponent(slug);

  var box = document.createElement('div');
  box.className = 'cta-box--ketodial';
  box.innerHTML =
    '<span class="sister-label">From our sister site</span>' +
    '<h3>Still deciding between keto and carnivore?</h3>' +
    '<p>KetoDial gives you advanced macro planning for keto, low-carb, and carnivore approaches. Compare your targets and pick the path that fits.</p>' +
    '<a href="https://ketodial.com' + utm + '" class="btn--ketodial" target="_blank" rel="noopener" ' +
    'onclick="try{gtag(\'event\',\'ketodial_banner_click\',{event_category:\'cross_site\',content_id:\'' + slug + '\'})}catch(e){}">' +
    'Compare your targets ›</a>';

  var headings = content.querySelectorAll('h2');
  if (headings.length >= 3) {
    headings[2].parentNode.insertBefore(box, headings[2]);
  } else {
    var related = document.querySelector('.related-content');
    if (related) {
      related.parentNode.insertBefore(box, related);
    } else {
      content.appendChild(box);
    }
  }
})();
