/* PescoDial analytics: GA4 property 557125657 (G-FWZ3VJ6D32).
   Runs only on the live site, so previews and tests never pollute the numbers.
   Never send an email address, a name or a health answer: events carry the step,
   the eating style and the goal only. */
(function () {
  var ID = 'G-FWZ3VJ6D32';
  var live = location.hostname === 'www.pescodial.com';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.pdTrack = function (name, params) {
    if (!live) return;
    var safe = {};
    for (var k in (params || {})) if (['style', 'goal', 'step', 'state', 'method', 'value', 'currency'].indexOf(k) >= 0) safe[k] = params[k];
    gtag('event', name, safe);
  };
  if (!live) return;
  gtag('js', new Date());
  gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
})();
