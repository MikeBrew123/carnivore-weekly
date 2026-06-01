/* ============================================================
   KetoDial Coach — Admin (review queue + member detail)
   ============================================================ */
(function(){
  "use strict";
  function $(s,c){return (c||document).querySelector(s);}
  function $all(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}

  /* ---------------- QUEUE DATA ---------------- */
  var QUEUE=[
    {id:'q1',name:'Priya Shah',init:'P',av:'p',type:'check-in',wait:'18m',redflag:true,
      flagReason:'Mentions dizziness + blood-pressure medication',
      isNew:false,week:6,tier:'Standard',streak:0,diet:'Keto',
      cur:168,goal:150,start:172,trend:'flat',conditions:['Hypertension'],meds:'Lisinopril 10mg',
      notes:'Stalled ~3 weeks. Gets discouraged by the scale — keep tone encouraging, focus on non-scale wins.',
      data:{Weight:{v:'168',t:'flat',d:'±0'},Steps:{v:'5.1k',t:'down',d:'−1.2k'},Sleep:{v:'2/5',t:'bad'},Energy:{v:'2/5',t:'bad'},Cravings:{v:'4/5',t:'bad'},Adherence:{v:'6/10',t:'warn'}},
      wins:'Hit my protein-at-breakfast goal most mornings.',
      struggle:'Honestly a rough week. Felt dizzy a couple of times getting up and I’m not sure if it’s the diet or my blood pressure meds. Scale still won’t move.',
      help:'Should I be worried about the dizziness?',
      draft:'Hey Priya — first off, you nailed the protein-at-breakfast goal almost every day. That’s a real win and exactly the consistency we’re after, even if the scale’s being stubborn.\n\nAbout the dizziness when you stand up — that\'s a great question for your doctor, and an important one. Because you take a blood-pressure medication, it\'s worth checking in with them: keto can lower blood pressure on its own, and combined with your medication that can sometimes drop it more than intended. Here\'s what I\'d suggest you bring to them: when the dizziness happens, how often, and that you\'ve started eating low-carb. They may want to check your levels.\n\nIn the meantime, make sure you\'re salting your food and staying hydrated — low sodium is a common, fixable cause of that lightheaded feeling early on.\n\nLet\'s keep the protein win going. How are evenings feeling lately?'},
    {id:'q2',name:'Marcus Webb',init:'M',av:'j',type:'check-in',wait:'42m',redflag:false,
      isNew:true,week:1,tier:'Founding',streak:1,diet:'Carnivore',
      cur:236,goal:205,start:238,trend:'down',conditions:[],meds:'—',
      notes:'',
      data:{Weight:{v:'236',t:'down',d:'−2'},Steps:{v:'9.4k',t:'up',d:'+0.8k'},Sleep:{v:'3/5',t:'warn'},Energy:{v:'2/5',t:'bad'},Cravings:{v:'3/5',t:'warn'},Adherence:{v:'8/10',t:'good'}},
      wins:'Down 2 lbs already and the carnivore thing is simpler than I expected.',
      struggle:'Energy crashed mid-week — felt like I hit a wall around Wednesday.',
      help:'Is the low energy normal this early?',
      draft:'Welcome to your first check-in, Marcus — and what a start. 8/10 adherence and down 2 lbs in week one. That simplicity you\'re noticing is exactly why carnivore works for a lot of people.\n\nThat Wednesday wall is incredibly common — it\'s the classic adaptation dip as your body switches fuel sources. The fix is almost always electrolytes: salt your food generously, and consider a pinch of salt in water mid-afternoon. Most people feel the fog lift within a few days.\n\nThis week\'s focus: front-load your sodium. Salt breakfast like you mean it and tell me if Wednesday feels different.'},
    {id:'q3',name:'Alex Rivera',init:'A',av:'a',type:'check-in',wait:'1h 5m',redflag:false,
      isNew:false,week:8,tier:'Founding',streak:8,diet:'Keto',
      cur:186,goal:170,start:198,trend:'down',conditions:['Type 2 diabetes'],meds:'Metformin 500mg',
      notes:'Crushing it. Travels for work ~1 week/month — plan around restaurant eating when it comes up.',
      data:{Weight:{v:'186',t:'down',d:'−2'},Steps:{v:'8.2k',t:'up',d:'+0.4k'},Sleep:{v:'4/5',t:'good'},Energy:{v:'4/5',t:'good'},Cravings:{v:'4/5',t:'warn'},Adherence:{v:'8/10',t:'good'}},
      wins:'Meal-prepped all week, didn’t skip a single workout.',
      struggle:'Evenings are brutal — keep wanting something sweet around 9pm.',
      help:'How do I kill the evening cravings?',
      draft:'Great week, Alex — 8/10 adherence and you hit your steps target 5 of 7 days. The scale\'s following too: down 12 lbs in 8 weeks.\n\nYour cravings jumped to a 4, and you said evenings are the hardest. That tracks with last week.\n\nThis week\'s focus: move your biggest meal to dinner and make sure it has at least 30g of fat. That usually quiets the 9pm sweet tooth within a few days.\n\nStill taking magnesium before bed? How\'s the sleep holding up?'},
    {id:'q4',name:'Dana Kim',init:'D',av:'p',type:'message',wait:'2h 12m',redflag:false,
      isNew:false,week:4,tier:'Standard',streak:4,diet:'Low-carb',
      cur:159,goal:145,start:166,trend:'down',conditions:[],meds:'—',
      notes:'Vegetarian-leaning low-carb. Watch for enough protein variety.',
      data:null,
      message:'Quick one — can I have a glass of red wine on the weekend or will it totally wreck my progress?',
      draft:'Good question, Dana — and a common one. A dry red wine is about 3–4g of carbs per glass, so one glass won\'t knock you out of ketosis. The bigger thing to watch is that alcohol pauses fat-burning while your body processes it, and it can lower your guard around late-night snacks.\n\nVerdict: one glass on the weekend is fine. Have it with dinner rather than on an empty stomach, and keep a glass of water alongside. Enjoy it.'},
    {id:'q5',name:'Sam Ortiz',init:'S',av:'a',type:'check-in',wait:'3h 40m',redflag:false,
      isNew:false,week:12,tier:'Premium',streak:11,diet:'Keto',
      cur:204,goal:190,start:223,trend:'down',conditions:[],meds:'—',
      notes:'Premium — monthly video call. Next call Jun 12.',
      data:{Weight:{v:'204',t:'down',d:'−1'},Steps:{v:'11.2k',t:'up',d:'+1.1k'},Sleep:{v:'4/5',t:'good'},Energy:{v:'5/5',t:'good'},Cravings:{v:'2/5',t:'good'},Adherence:{v:'9/10',t:'good'}},
      wins:'Best week yet. Energy through the roof, ran my first 5k.',
      struggle:'Nothing major — maybe a little bored of my go-to meals.',
      help:'Got any new recipe ideas?',
      draft:'Sam, this is a phenomenal week — 9/10 adherence, energy at a 5, and a first 5k? That\'s the fat-adaptation everyone\'s chasing. You\'re down 19 lbs and clearly thriving.\n\nThe meal boredom is a good problem and an easy fix. Point yourself at the KetoDial recipes page — the sheet-pan and one-skillet dinners are built for variety at your macros. Pick two new ones this week and rotate them in.\n\nWe\'ll dig into your next phase on our call. Keep doing exactly what you\'re doing.'}
  ];

  var selectedId='q1';

  /* ---------------- RENDER QUEUE ---------------- */
  function renderQueue(){
    var list=$('#queueList');
    list.innerHTML='';
    QUEUE.forEach(function(q){
      var item=document.createElement('div');
      item.className='qitem'+(q.id===selectedId?' on':'')+(q.redflag?' flag':'');
      item.onclick=function(){selectedId=q.id;renderQueue();renderDetail();};
      var badges='';
      if(q.redflag) badges+='<span class="qbadge flag">⚑ Red flag</span>';
      if(q.isNew) badges+='<span class="qbadge new">NEW</span>';
      var preview=(q.draft||'').slice(0,72).replace(/\n/g,' ')+'…';
      item.innerHTML=
        '<div class="qi-top"><span class="mem-av '+q.av+' sm">'+q.init+'</span>'+
        '<div class="qi-id"><div class="qi-name">'+q.name+'</div>'+
        '<div class="qi-meta"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="'+(q.type==='check-in'?'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11':'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')+'" stroke-linecap="round" stroke-linejoin="round"/></svg>'+q.type+' · '+q.wait+'</div></div></div>'+
        (badges?'<div class="qi-badges">'+badges+'</div>':'')+
        '<div class="qi-prev">'+preview+'</div>'+
        '<button class="qi-approve" onclick="event.stopPropagation();__approve(\''+q.id+'\')">✓ Approve &amp; send</button>';
      list.appendChild(item);
    });
    // stats
    var pending=QUEUE.length, flags=QUEUE.filter(function(q){return q.redflag;}).length;
    $('#statPending').textContent=pending;
    $('#statFlags').textContent=flags;
  }

  /* ---------------- RENDER DETAIL ---------------- */
  function renderDetail(){
    var q=QUEUE.filter(function(x){return x.id===selectedId;})[0];
    if(!q){ $('#detailWrap').innerHTML='<div class="empty-detail">Queue clear — nice work. 🎉<br><span>All caught up. New items appear here as members check in.</span></div>'; return; }
    var change=q.cur-q.start;
    var conds=q.conditions.length?q.conditions.join(', '):'None on file';

    var ctxNotes='<textarea class="notes-area" placeholder="Add context about this member…">'+q.notes+'</textarea>';

    var dataBlock='';
    if(q.data){
      dataBlock='<div class="d-label">This check-in · Week '+q.week+'</div><div class="dgrid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">'+
        Object.keys(q.data).map(function(k){
          var c=q.data[k];var cls=c.t==='good'?'tgood':c.t==='bad'?'tbad':c.t==='warn'?'twarn':'';
          var tr=c.d?'<span class="trend '+(c.t==='down'&&(k==='Weight')?'up':c.t)+'">'+c.d+'</span>':'';
          return '<div class="cell '+cls+'"><div class="k">'+k+'</div><div class="v">'+c.v+' '+tr+'</div></div>';
        }).join('')+'</div>';
    }

    var story='';
    if(q.type==='check-in'){
      story='<div class="d-label">In their words</div>'+
        '<div class="qa-block"><div class="qa-q">Wins</div><div class="qa-a">'+q.wins+'</div></div>'+
        '<div class="qa-block"><div class="qa-q">Struggle</div><div class="qa-a'+(q.redflag?' hl':'')+'">'+q.struggle+'</div></div>'+
        '<div class="qa-block"><div class="qa-q">Wants help with</div><div class="qa-a">'+q.help+'</div></div>';
    } else {
      story='<div class="d-label">Their message</div><div class="qa-block"><div class="qa-a">'+q.message+'</div></div>';
    }

    var flagBanner=q.redflag?
      '<div class="flag-banner"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>'+
      '<div><b>Medical content detected</b> — '+q.flagReason+'. Human review required; cannot auto-send. The draft already routes them to their doctor.</div></div>':'';

    $('#detailWrap').innerHTML=
      // context card
      '<div class="ctx-card">'+
        '<div class="ctx-top">'+
          '<span class="mem-av '+q.av+' lg">'+q.init+'</span>'+
          '<div class="ctx-id"><div class="ctx-name">'+q.name+' '+(q.isNew?'<span class="tag new">NEW</span>':'')+'</div>'+
          '<div class="ctx-sub">'+q.tier+' member · week '+q.week+' · '+q.diet+'</div></div>'+
          '<button class="profile-btn" onclick="__profile()">Full profile →</button>'+
        '</div>'+
        '<div class="ctx-stats">'+
          '<div class="cs"><div class="csk">Weight</div><div class="csv">'+q.cur+' <span class="trend '+(change<0?'up':'flat')+'">'+(change<=0?'':'+')+change+'</span></div></div>'+
          '<div class="cs"><div class="csk">Goal</div><div class="csv">'+q.goal+'</div></div>'+
          '<div class="cs"><div class="csk">Streak</div><div class="csv">'+(q.streak||0)+'w</div></div>'+
          '<div class="cs"><div class="csk">Conditions</div><div class="csv sm">'+conds+'</div></div>'+
        '</div>'+
        '<div class="ctx-notes"><div class="cn-label">Coach notes <span>editable</span></div>'+ctxNotes+'</div>'+
      '</div>'+
      dataBlock+
      story+
      // AI draft
      '<div class="d-label between"><span>AI draft response</span><span class="draft-tag">'+(q.redflag?'flagged':'ready')+'</span></div>'+
      flagBanner+
      '<textarea class="draft-area" id="draftArea">'+q.draft+'</textarea>'+
      '<div class="action-row">'+
        '<button class="btn btn-coach" onclick="__approve(\''+q.id+'\')">✓ Approve &amp; Send</button>'+
        '<button class="btn btn-ghost" onclick="__edit()">Edit &amp; Send</button>'+
        '<button class="btn btn-ghost" onclick="__flag(\''+q.id+'\')">Flag for later</button>'+
        (q.redflag?'<button class="btn btn-escalate" onclick="__escalate()">Escalate</button>':'')+
      '</div>';
  }

  /* ---------------- ACTIONS ---------------- */
  window.__approve=function(id){
    var i=QUEUE.findIndex(function(x){return x.id===id;});
    if(i<0)return;
    QUEUE.splice(i,1);
    if(selectedId===id) selectedId=QUEUE.length?QUEUE[0].id:null;
    renderQueue();renderDetail();
    toast('Sent ✓');
  };
  window.__flag=function(id){
    var i=QUEUE.findIndex(function(x){return x.id===id;});
    if(i<0)return;
    QUEUE.splice(i,1);
    if(selectedId===id) selectedId=QUEUE.length?QUEUE[0].id:null;
    renderQueue();renderDetail();
    toast('Flagged for follow-up');
  };
  window.__edit=function(){ var d=$('#draftArea'); if(d){d.focus();toast('Editing — make changes, then Approve & Send');} };
  window.__escalate=function(){
    var d=$('#draftArea');
    if(d){ d.value='Hi — thanks for flagging this. Because it involves your medication and a symptom, the right next step is to check in with your doctor before we go further on the coaching side. Please reach out to them about the dizziness, and let me know what they say so I can support you around it. Your health comes first.'; toast('Escalation template inserted'); }
  };
  function toast(msg){
    var t=$('#toast');t.textContent=msg;t.classList.add('show');
    clearTimeout(t._tm);t._tm=setTimeout(function(){t.classList.remove('show');},1900);
  }

  /* ---------------- MEMBER PROFILE (Screen 7) ---------------- */
  window.__profile=function(){
    var q=QUEUE.filter(function(x){return x.id===selectedId;})[0]||QUEUE[0];
    $('#queueMode').classList.add('hidden');
    $('#profileMode').classList.remove('hidden');
    renderProfile(q);
  };
  window.__backToQueue=function(){
    $('#profileMode').classList.add('hidden');
    $('#queueMode').classList.remove('hidden');
  };
  window.__tab=function(t,el){
    $all('.ptab').forEach(function(x){x.classList.remove('on');});
    el.classList.add('on');
    $all('.ptab-panel').forEach(function(p){p.classList.toggle('on',p.dataset.panel===t);});
  };

  function profileSpark(){
    var weights=[198,197,195,194,192,190,188,186];
    var w=620,h=150,pad=14;
    var min=165,max=200;
    var pts=weights.map(function(v,i){return [pad+(i/(weights.length-1))*(w-pad*2), pad+(1-(v-min)/(max-min))*(h-pad*2)];});
    var line=pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
    var goalY=pad+(1-(170-min)/(max-min))*(h-pad*2);
    var area='M'+pts[0][0]+','+(h-pad)+' L'+line.split(' ').join(' L')+' L'+pts[pts.length-1][0]+','+(h-pad)+' Z';
    return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;display:block">'+
      '<line x1="'+pad+'" y1="'+goalY.toFixed(1)+'" x2="'+(w-pad)+'" y2="'+goalY.toFixed(1)+'" stroke="var(--coach)" stroke-width="1.5" stroke-dasharray="4 4"/>'+
      '<text x="'+(w-pad)+'" y="'+(goalY-6).toFixed(1)+'" text-anchor="end" font-family="var(--mono)" font-size="10" fill="var(--coach-deep)">goal 170</text>'+
      '<path d="'+area+'" fill="var(--accent-wash)"/>'+
      '<polyline points="'+line+'" fill="none" stroke="var(--accent-deep)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+
      pts.map(function(p){return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.5" fill="#fff" stroke="var(--accent-deep)" stroke-width="2"/>';}).join('')+
      '</svg>';
  }

  function renderProfile(q){
    var change=q.cur-q.start;
    $('#profHead').innerHTML=
      '<span class="mem-av '+q.av+' lg">'+q.init+'</span>'+
      '<div><div class="prof-name">'+q.name+'</div>'+
      '<div class="prof-sub">Active · '+q.tier+' · member since Apr 2026</div></div>';
    $('#profSpark').innerHTML=profileSpark();
    $('#profMetrics').innerHTML=
      [['Start',q.start+' lb'],['Current',q.cur+' lb'],['Change',(change<=0?'':'+')+change+' lb'],['Avg adherence','7.8/10'],['Streak',(q.streak||0)+' weeks'],['Check-ins',q.week]]
      .map(function(m){return '<div class="pm-cell"><div class="pmk">'+m[0]+'</div><div class="pmv">'+m[1]+'</div></div>';}).join('');
  }

  /* keyboard: Enter approves selected */
  document.addEventListener('keydown',function(e){
    if($('#profileMode') && !$('#profileMode').classList.contains('hidden')) return;
    if(e.key==='Enter' && !e.shiftKey && document.activeElement.tagName!=='TEXTAREA'){
      if(selectedId){e.preventDefault();window.__approve(selectedId);}
    }
  });

  renderQueue();renderDetail();
})();
