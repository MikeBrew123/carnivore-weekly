/* Plan video (2026-10-13): poster only until the reader taps play. */
(function () {
  document.querySelectorAll('[data-plan-video]').forEach(function (box) {
    var v = box.querySelector('video'), b = box.querySelector('button');
    if (!v || !b) return;
    var name = box.getAttribute('data-plan-video');
    b.addEventListener('click', function () {
      b.hidden = true; v.controls = true;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      v.focus();
      if (window.gtag) window.gtag('event', 'plan_video_play', { video: name, page: location.pathname });
    });
    v.addEventListener('ended', function () {
      if (window.gtag) window.gtag('event', 'plan_video_complete', { video: name, page: location.pathname });
    });
  });
})();
