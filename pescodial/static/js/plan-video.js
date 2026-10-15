/* Plan video (2026-10-13): muted autoplay in view, sound on tap. */
(function(){
  var calm=(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)||(navigator.connection&&navigator.connection.saveData);
  document.querySelectorAll('[data-plan-video]').forEach(function(box){
    var v=box.querySelector('video'),b=box.querySelector('button'),lab=box.querySelector('[data-label]');
    if(!v||!b)return;
    var name=box.getAttribute('data-plan-video'),sound=false;
    v.muted=true;
    if(calm||!('IntersectionObserver' in window)){ if(lab)lab.textContent='Play with sound'; }
    else{
      new IntersectionObserver(function(es){es.forEach(function(e){
        if(sound)return;
        if(e.isIntersecting){var p=v.play();if(p&&p.catch)p.catch(function(){});}else{v.pause();}
      });},{threshold:.4}).observe(v);
    }
    b.addEventListener('click',function(){
      sound=true;b.hidden=true;v.muted=false;v.loop=false;v.currentTime=0;v.controls=true;
      var p=v.play();if(p&&p.catch)p.catch(function(){});
      v.focus();
      if(window.gtag)window.gtag('event','plan_video_play',{video:name,page:location.pathname});
    });
    var seen=false,half=false;
    v.addEventListener('playing',function(){
      if(seen)return;seen=true;
      if(window.gtag)window.gtag('event','plan_video_view',{video:name,page:location.pathname,sound:sound?'on':'off'});
    });
    v.addEventListener('timeupdate',function(){
      if(half||!v.duration||v.currentTime<v.duration/2)return;half=true;
      if(window.gtag)window.gtag('event','plan_video_half',{video:name,page:location.pathname,sound:sound?'on':'off'});
    });
    v.addEventListener('ended',function(){if(sound&&window.gtag)window.gtag('event','plan_video_complete',{video:name,page:location.pathname});});
  });
})();
