/* ============================================================
   KetoDial Coach — Member App logic
   View switching + 3 member states + post-a-message thread
   ============================================================ */
(function(){
  "use strict";
  function $(s,c){return (c||document).querySelector(s);}
  function $all(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}

  /* ---------------- MEMBER DATA (3 states) ---------------- */
  var MEMBERS={
    alex:{
      key:'alex',name:'Alex',full:'Alex Rivera',av:'a',avInit:'A',
      state:'thriving',week:8,streak:8,checkins:8,
      start:198,current:186,goal:170,
      weights:[198,197,195,194,192,190,188,186],
      status:{type:'reply',title:'New response from Coach Remy',
        snip:'Great week — 8/10 adherence and you hit your steps target 5 of 7 days. Let’s get ahead of those evening cravings…'},
      focus:'Move your biggest meal to dinner with 30g+ fat to kill evening cravings.',
      checkedIn:true,
      thread:[
        {dir:'coach',t:'Sun 9:14 AM',html:'Hey Alex 👋 Saw your check-in come through — let me take a look and I’ll get back to you today.'},
        {dir:'checkin',data:{Weight:'186',Adherence:'8/10',Cravings:'4/5',Sleep:'4/5',Energy:'4/5',Steps:'8.2k'},
         wins:'Meal-prepped all week, didn’t skip a single workout.',struggle:'Evenings are brutal — I keep wanting something sweet around 9pm.'},
        {dir:'coach',t:'Sun 3:40 PM',html:'Great week, Alex — <b>8/10 adherence</b> and you hit your steps target 5 of 7 days. That’s real momentum, and the scale’s following: you’re down <b>12 lbs</b> in 8 weeks.<br><br>Your cravings jumped to a 4, and you said evenings are the hardest. That tracks with last week.<br><br><b>This week’s focus:</b> move your biggest meal to dinner and make sure it has at least 30g of fat. That usually quiets the 9pm sweet tooth within a few days.<br><br>Still taking magnesium before bed? How’s the sleep holding up?'}
      ]
    },
    jordan:{
      key:'jordan',name:'Jordan',full:'Jordan Lee',av:'j',avInit:'J',
      state:'new',week:1,streak:0,checkins:0,
      start:224,current:224,goal:195,
      weights:[224],
      status:{type:'due',title:'Your first check-in is ready',
        snip:'Coach Remy is expecting your first update. It takes about two minutes.'},
      focus:'Your first focus arrives after your first check-in.',
      checkedIn:false,
      thread:[
        {dir:'coach',t:'Today 8:00 AM',html:'Welcome aboard, Jordan — I’m Remy, your coach. 🎉<br><br>I’ve read through your intake. A 30-lb goal on keto with a desk job is very doable, and the fact that you’ve done this before means you already know the ropes.<br><br>No homework yet. Just settle in, eat to your plan, and I’ll see you at your first Sunday check-in. That’s where the real work starts.'}
      ]
    },
    priya:{
      key:'priya',name:'Priya',full:'Priya Shah',av:'p',avInit:'P',
      state:'struggling',week:6,streak:0,checkins:4,
      start:172,current:168,goal:150,
      weights:[172,170,169,169,168,168],
      status:{type:'overdue',title:'Your check-in is overdue',
        snip:'Coach Remy is expecting your update. No guilt — let’s just pick it back up.'},
      focus:'Protein at breakfast — aim for 30g within an hour of waking.',
      checkedIn:false,
      thread:[
        {dir:'coach',t:'Last Sun 4:10 PM',html:'Hey Priya — the scale’s been flat for a couple of weeks and I know that’s discouraging. It’s almost always one of two things: hidden carbs creeping in, or not enough protein early in the day.<br><br><b>This week’s focus:</b> 30g of protein within an hour of waking. Let’s see if that steadies the afternoon cravings.'},
        {dir:'me',t:'Last Sun 6:32 PM',html:'Yeah the stall is frustrating. I’ll try the protein thing.'},
        {dir:'coach',t:'Mon 9:02 AM',html:'That’s all I ask. One change at a time. I’ll check how it went this weekend — don’t leave me hanging at Sunday’s check-in. 💪'}
      ]
    }
  };

  var current='alex';
  var sleepV=0,energyV=0,cravingV=0;

  /* ---------------- VIEW SWITCHING ---------------- */
  function show(view){
    $all('.view').forEach(function(v){v.classList.toggle('on',v.dataset.view===view);});
    var app=['dashboard','checkin','thread','settings','progress'].indexOf(view)>-1;
    $('#appChrome').classList.toggle('hidden',!app);
    // tab highlight
    $all('.tabbar button').forEach(function(b){b.classList.toggle('on',b.dataset.go===view);});
    // appbar title
    var titles={dashboard:'',progress:'',checkin:'New check-in',thread:'Coach Remy',settings:'Account'};
    $('#appTitle').textContent=titles[view]||'';
    $('#appbarBack').classList.toggle('hidden',!(view==='checkin'||view==='thread'||view==='settings'));
    $('#appbarBrand').classList.toggle('hidden',view==='checkin'||view==='thread'||view==='settings');
    $('.phone-body').scrollTop=0;
    if(view==='thread') setTimeout(scrollThread,40);
  }
  window.__show=show;

  /* ---------------- RENDER MEMBER ---------------- */
  function spark(weights){
    if(weights.length<2) return '<div class="empty-chart">Your weight trend appears after your first check-in.</div>';
    var w=300,h=88,pad=6;
    var min=Math.min.apply(null,weights)-1,max=Math.max.apply(null,weights)+1;
    var pts=weights.map(function(v,i){
      var x=pad+(i/(weights.length-1))*(w-pad*2);
      var y=pad+(1-(v-min)/(max-min))*(h-pad*2);
      return [x,y];
    });
    var line=pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
    var area='M'+pts[0][0].toFixed(1)+','+(h-pad)+' L'+line.replace(/ /g,' L')+' L'+pts[pts.length-1][0].toFixed(1)+','+(h-pad)+' Z';
    var last=pts[pts.length-1];
    return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;display:block" preserveAspectRatio="none">'+
      '<path d="'+area+'" fill="var(--accent-wash)"/>'+
      '<polyline points="'+line+'" fill="none" stroke="var(--accent-deep)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="4" fill="var(--accent-deep)" stroke="#fff" stroke-width="2"/></svg>';
  }

  function statusCard(m){
    var s=m.status;
    var el=$('#statusCard');
    var change=m.current-m.start;
    if(s.type==='reply'){
      el.className='status-card reply';
      el.innerHTML=
        '<div class="sc-top"><span class="coach-av sm">R</span><div><div class="sc-k">Coach Remy replied</div><div class="sc-title">'+s.title+'</div></div><span class="sc-dot"></span></div>'+
        '<p class="sc-snip">'+s.snip+'</p>'+
        '<button class="btn btn-primary btn-block" onclick="__show(\'thread\')">View response</button>';
    } else if(s.type==='due'){
      el.className='status-card due';
      el.innerHTML=
        '<div class="sc-top"><span class="coach-av sm">R</span><div><div class="sc-k">It’s check-in day</div><div class="sc-title">'+s.title+'</div></div></div>'+
        '<p class="sc-snip">'+s.snip+'</p>'+
        '<button class="btn btn-accent btn-block" onclick="__show(\'checkin\')">Start check-in</button>';
    } else if(s.type==='overdue'){
      el.className='status-card overdue';
      el.innerHTML=
        '<div class="sc-top"><span class="coach-av sm">R</span><div><div class="sc-k" style="color:var(--warn)">Check-in overdue</div><div class="sc-title">'+s.title+'</div></div></div>'+
        '<p class="sc-snip">'+s.snip+'</p>'+
        '<button class="btn btn-accent btn-block" onclick="__show(\'checkin\')">Pick it back up</button>';
    }
  }

  function renderThread(m){
    var wrap=$('#threadList');
    wrap.innerHTML='';
    m.thread.forEach(function(msg){ wrap.appendChild(buildMsg(msg,m)); });
  }
  function buildMsg(msg,m){
    if(msg.dir==='checkin'){
      var d=document.createElement('div');
      d.className='checkin-msg';
      var grid=Object.keys(msg.data).map(function(k){
        return '<div class="cm-stat"><div class="k">'+k+'</div><div class="v">'+msg.data[k]+'</div></div>';
      }).join('');
      d.innerHTML='<div class="cm-h"><span>Weekly check-in · Week '+m.week+'</span><span>✓ sent</span></div>'+
        '<div class="cm-grid">'+grid+'</div>'+
        (msg.wins?'<div class="cm-free"><b>Wins:</b> '+msg.wins+'</div>':'')+
        (msg.struggle?'<div class="cm-free"><b>Hard:</b> '+msg.struggle+'</div>':'');
      return d;
    }
    var wrap=document.createElement('div');
    wrap.className='msg '+(msg.dir==='coach'?'coach':'me');
    var inner='';
    if(msg.dir==='coach') inner+='<span class="coach-av sm">R</span>';
    inner+='<div><div class="bub">'+msg.html+'</div><span class="time">'+(msg.t||'')+'</span></div>';
    wrap.innerHTML=inner;
    return wrap;
  }
  function scrollThread(){var b=$('.phone-body');if(b)b.scrollTop=b.scrollHeight;}

  function renderMember(key){
    current=key;
    var m=MEMBERS[key];
    // greeting
    $('#dashHi').textContent='Hi, '+m.name;
    $('#dashWeek').textContent='Week '+m.week+' · '+(m.state==='new'?'just getting started':m.state==='thriving'?'on a roll':'let’s regroup');
    $('#dashAv').className='mem-av '+m.av; $('#dashAv').textContent=m.avInit;
    // status
    statusCard(m);
    // progress
    $('#sparkWrap').innerHTML=spark(m.weights);
    var change=m.current-m.start;
    $('#wChange').textContent=(change<=0?'':'+')+change+' lb';
    $('#wChange').className='pg-delta '+(change<0?'down':'flat');
    $('#wCurrent').textContent=m.current;
    $('#wGoal').textContent=m.goal;
    // streak
    if(m.streak>0){
      $('#streakWrap').innerHTML='<span class="streak"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-1 5-2 6-1.5 1.5-3 3-3 6a5 5 0 0 0 10 0c0-1.5-.5-2.5-1-3.5.5.3 1 .8 1.5 1.5.8-3-1-6.5-3-8-.8-.6-.5-.4-1-1.5-.4-.9-.5-2-.5-3z"/></svg>'+m.streak+' weeks in a row</span>';
    } else {
      $('#streakWrap').innerHTML='<span class="streak" style="color:var(--ink-faint);background:var(--bg)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c1 3-1 5-2 6-1.5 1.5-3 3-3 6a5 5 0 0 0 10 0"/></svg>'+(m.state==='new'?'Streak starts at check-in 1':'Streak reset — restart this week')+'</span>';
    }
    // focus
    $('#focusText').textContent=m.focus;
    // stats
    $('#stWeeks').textContent=m.week;
    $('#stCheckins').textContent=m.checkins;
    $('#stChange').textContent=(change<=0?'':'+')+change;
    // thread
    renderThread(m);
    // thread preview on dash
    var lastCoach=null; m.thread.forEach(function(x){if(x.dir==='coach')lastCoach=x;});
    $('#dashThreadPrev').innerHTML = lastCoach ? '<span class="coach-av sm">R</span><div class="tp-body"><div class="tp-name">Coach Remy</div><div class="tp-snip">'+stripHtml(lastCoach.html).slice(0,90)+'…</div></div>' : '';
    // checkin prefill
    $('#ciWeight').value=m.current;
    // tab badge
    $('#threadBadge').classList.toggle('hidden', m.status.type!=='reply');
  }
  function stripHtml(h){var d=document.createElement('div');d.innerHTML=h;return d.textContent||'';}

  /* ---------------- DEMO STATE SWITCHER ---------------- */
  $all('[data-member]').forEach(function(b){
    b.addEventListener('click',function(){
      $all('[data-member]').forEach(function(x){x.classList.remove('on');});
      b.classList.add('on');
      renderMember(b.dataset.member);
      show('dashboard');
    });
  });
  $all('[data-jump]').forEach(function(b){
    b.addEventListener('click',function(){ show(b.dataset.jump); });
  });

  /* ---------------- ONBOARDING ---------------- */
  var obStep=1;
  function obShow(n){
    obStep=n;
    $all('.ob-step').forEach(function(s){s.classList.toggle('on',+s.dataset.ob===n);});
    $all('.ob-prog i').forEach(function(d,i){d.classList.toggle('on',i<n);});
  }
  $('#obNext1') && $('#obNext1').addEventListener('click',function(){ obShow(2); });
  $('#obNext2') && $('#obNext2').addEventListener('click',function(){ obShow(3); });
  $('#obFinish') && $('#obFinish').addEventListener('click',function(){
    renderMember('jordan');
    $all('[data-member]').forEach(function(x){x.classList.toggle('on',x.dataset.member==='jordan');});
    show('dashboard');
  });
  $('#obWaiver') && $('#obWaiver').addEventListener('change',function(){
    $('#obNext1').disabled=!this.checked;
  });

  /* multi-select chips in onboarding/checkin */
  $all('[data-multi]').forEach(function(g){
    g.querySelectorAll('.checkchip').forEach(function(b){
      b.addEventListener('click',function(){
        if(b.dataset.none!==undefined){g.querySelectorAll('.checkchip').forEach(function(x){x.classList.remove('on');});b.classList.add('on');}
        else{var n=g.querySelector('[data-none]');if(n)n.classList.remove('on');b.classList.toggle('on');}
      });
    });
  });

  /* ---------------- CHECK-IN SCALES ---------------- */
  function wireScale(sel,setter){
    var g=$(sel);
    g.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click',function(){
        g.querySelectorAll('button').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on');
        setter(+b.dataset.v);
      });
    });
  }
  wireScale('#scaleSleep',function(v){sleepV=v;});
  wireScale('#scaleEnergy',function(v){energyV=v;});
  wireScale('#scaleCraving',function(v){cravingV=v;});
  var adh=$('#ciAdh'), adhV=$('#ciAdhV');
  if(adh){ adh.addEventListener('input',function(){adhV.textContent=adh.value;}); }

  /* submit check-in → append to thread → coach typing → response */
  $('#ciSubmit') && $('#ciSubmit').addEventListener('click',function(){
    var m=MEMBERS[current];
    var data={Weight:$('#ciWeight').value||m.current,Adherence:(adh?adh.value:'7')+'/10',
      Cravings:(cravingV||3)+'/5',Sleep:(sleepV||3)+'/5',Energy:(energyV||3)+'/5',Steps:($('#ciSteps').value||'—')};
    m.thread.push({dir:'checkin',data:data,wins:$('#ciWins').value||'—',struggle:$('#ciHard').value||'—'});
    m.checkedIn=true;
    renderThread(m);
    show('thread');
    // coach typing then response
    var list=$('#threadList');
    var typ=document.createElement('div');
    typ.className='msg coach';typ.innerHTML='<span class="coach-av sm">R</span><div class="typing"><i></i><i></i><i></i></div>';
    list.appendChild(typ);scrollThread();
    setTimeout(function(){
      typ.remove();
      m.thread.push({dir:'coach',t:'Just now',html:'Got it, '+m.name+' — thanks for checking in. ✓<br><br>I’m reading through this now and I’ll send your full coaching note back within a day. Quick first reaction: showing up consistently <i>is</i> the win. More soon.'});
      renderThread(m);show('thread');
    },2600);
  });

  /* ---------------- FREE MESSAGE (member posts) ---------------- */
  function sendMessage(text){
    if(!text.trim()) return;
    var m=MEMBERS[current];
    m.thread.push({dir:'me',t:'Just now',html:escapeHtml(text)});
    renderThread(m);scrollThread();
    var list=$('#threadList');
    var typ=document.createElement('div');
    typ.className='msg coach';typ.innerHTML='<span class="coach-av sm">R</span><div class="typing"><i></i><i></i><i></i></div>';
    list.appendChild(typ);scrollThread();
    setTimeout(function(){
      typ.remove();
      m.thread.push({dir:'coach',t:'Just now',html:'Thanks for the message, '+m.name+'. I’ll get you a proper reply within a business day — I read every one of these myself.'});
      renderThread(m);scrollThread();
    },2400);
  }
  function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  $('#threadSend') && $('#threadSend').addEventListener('click',function(){
    var i=$('#threadInput');sendMessage(i.value);i.value='';
  });
  $('#threadInput') && $('#threadInput').addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();var i=$('#threadInput');sendMessage(i.value);i.value='';}
  });
  $('#dashQuick') && $('#dashQuick').addEventListener('click',function(){ show('thread'); });

  /* ---------------- INIT ---------------- */
  renderMember('alex');
  obShow(1);
  show('dashboard');
})();
