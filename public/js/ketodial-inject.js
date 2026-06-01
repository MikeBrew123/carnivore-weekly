/**
 * KetoDial Sister Site CTA Injection — Carnivore Weekly
 * Adds a contextual "Looking for keto?" banner on keto-adjacent blog posts.
 * Only shows on posts whose content mentions "keto" 3+ times.
 */
(function() {
  if (!window.location.pathname.startsWith('/blog/') ||
      window.location.pathname === '/blog/' ||
      window.location.pathname === '/blog/index.html') return;

  if (document.querySelector('.cta-box--ketodial')) return;

  var content = document.querySelector('.post-content');
  if (!content) return;

  var ketoCount = (content.textContent.match(/\bketo\b/gi) || []).length;
  if (ketoCount < 3) return;

  var slug = window.location.pathname.split('/').pop().replace('.html', '');
  var utm = '?utm_source=carnivoreweekly&utm_medium=blog_banner&utm_campaign=ketodial_crosslink&utm_content=' + encodeURIComponent(slug);

  var box = document.createElement('div');
  box.className = 'cta-box--ketodial';
  box.innerHTML =
    '<span class="sister-label">From our sister site</span>' +
    '<h4>Looking for keto macros?</h4>' +
    '<p>We built KetoDial for the meat-forward keto crowd. Free calculator, real recipes, no fluff.</p>' +
    '<a href="https://ketodial.com' + utm + '" class="btn--ketodial" target="_blank" rel="noopener" ' +
    'onclick="try{gtag(\'event\',\'ketodial_banner_click\',{event_category:\'cross_site\',content_id:\'' + slug + '\'})}catch(e){}">' +
    'Try KetoDial Free</a>';

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
