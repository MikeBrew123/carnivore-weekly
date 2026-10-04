/* PescoDial calculator. Screens from Brew's Claude Design (site-v1); maths from the shared engine. */
/* Numbers come from window.PDMacros (the shared engine), never a local formula.
   Try ?demo=results | errors | under18 | underweight to preview states. */
/* Email typo autocorrect, mirrored from correctEmailTypo/stutterMatch in
   api/calculator-api.js (CW/KD, 2026-09-30). The worker is the authority and
   corrects again; this fixes the field in front of the reader so the address
   they see is the one we save. A real PD signup arrived as 'aol..ccoom' on
   2026-10-04. Returns the address unchanged when nothing is clearly wrong. */
var pdFixEmail = (function () {
  var TYPOS = {
    'gnail.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com',
    'gmai.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmsil.com': 'gmail.com', 'gmaul.com': 'gmail.com',
    'gmali.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com',
    'gmail.cmo': 'gmail.com', 'gmail.vom': 'gmail.com', 'gmail.xom': 'gmail.com', 'gmail.comm': 'gmail.com',
    'gmail.om': 'gmail.com', 'googlemail.co': 'googlemail.com',
    'yagoo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahho.com': 'yahoo.com', 'yhoo.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com', 'uahoo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.cm': 'yahoo.com',
    'yahoo.vom': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
    'hotmil.com': 'hotmail.com', 'hotnail.com': 'hotmail.com', 'hotmaill.com': 'hotmail.com',
    'hotmail.con': 'hotmail.com', 'hotmail.cm': 'hotmail.com', 'outlok.com': 'outlook.com',
    'outllok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'iclod.com': 'icloud.com',
    'icoud.com': 'icloud.com', 'icloud.con': 'icloud.com', 'aol.con': 'aol.com', 'aoll.com': 'aol.com',
    'comcast.com': 'comcast.net', 'sbcglobal.com': 'sbcglobal.net'
  };
  var COMMON = ['gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'proton.me',
    'protonmail.com', 'duck.com', 'comcast.net', 'bellsouth.net', 'sbcglobal.net', 'msn.com', 'live.com',
    'me.com', 'yahoo.ca', 'shaw.ca', 'rogers.com', 'telus.net', 'verizon.net'];
  function runs(s) { return s.replace(/(.)\1+/g, '$1'); }
  function stutter(d) {
    for (var i = 0; i < COMMON.length; i++) if (COMMON[i] !== d && runs(COMMON[i]) === runs(d)) return COMMON[i];
    return null;
  }
  return function (email) {
    var raw = String(email || '').trim(), clean = raw.toLowerCase(), at = clean.lastIndexOf('@');
    if (at < 1) return raw;
    var domain = clean.slice(at + 1);
    var malformed = /\.\.|^\.|\.$/.test(domain);
    if (malformed) domain = domain.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
    var fixed = TYPOS[domain] || (malformed ? (stutter(domain) || domain) : null);
    return fixed ? clean.slice(0, at) + '@' + fixed : raw;
  };
})();

(function () {
  var API = 'https://carnivore-report-api-production.iambrew.workers.dev';
  var root = document.querySelector('.calc');
  if (!root) return;
  var steps = root.querySelectorAll('[data-step], [data-state]');
  var bars = root.querySelectorAll('.steps span');
  var f1 = root.querySelector('[data-step="1"]');
  var f2 = root.querySelector('[data-step="2"]');
  var f3 = root.querySelector('[data-step="3"]');
  var data = {};

  var STYLES = {
    med: { name: 'Pescatarian Mediterranean', protein: 1.2,
      sample: [['Breakfast', 'Greek yogurt with berries and a few walnuts'], ['Lunch', 'Lentil and vegetable soup, wholegrain bread'], ['Snack', 'An apple and a small handful of almonds'], ['Dinner', 'Baked salmon, roasted vegetables in olive oil, brown rice']] },
    lowcarb: { name: 'Pescatarian Low Carb', protein: 1.4,
      sample: [['Breakfast', 'Two eggs scrambled with spinach and feta'], ['Lunch', 'Tuna salad with olive oil, cucumber and chickpeas'], ['Snack', 'Cheese and cherry tomatoes'], ['Dinner', 'Grilled cod, green beans and a small baked sweet potato']] },
    keto: { name: 'Pescatarian Keto', protein: 1.4,
      sample: [['Breakfast', 'Eggs cooked in butter with avocado'], ['Lunch', 'Sardines on salad leaves with olive oil'], ['Snack', 'A few olives and some cheese'], ['Dinner', 'Pan-fried salmon with broccoli and garlic butter']] },
    carn: { name: 'Pescatarian Carnivore', protein: 1.6,
      sample: [['Breakfast', 'Three eggs and smoked salmon'], ['Lunch', 'Canned mackerel or sardines'], ['Snack', 'Hard-boiled eggs'], ['Dinner', 'Seared scallops or shrimp cooked in butter']] }
  };

  function show(name) {
    steps.forEach(function (el) {
      el.hidden = el.getAttribute('data-step') !== name && el.getAttribute('data-state') !== name;
    });
    var n = parseInt(name, 10) || 2;
    bars.forEach(function (b, i) { b.classList.toggle('on', i < n); });
    var active = root.querySelector('[data-step="' + name + '"], [data-state="' + name + '"]');
    var h = active && active.querySelector('[tabindex="-1"]');
    if (h && name !== '1') h.focus({ preventScroll: true });
    var top = root.getBoundingClientRect().top + window.pageYOffset - 12;
    if (name !== '1' && window.pageYOffset > top) window.scrollTo(0, top);
  }

  function val(form, n) {
    var el = form.elements[n];
    return el ? (el.value || '').trim() : '';
  }
  function num(form, n) { var v = val(form, n); return v === '' ? NaN : Number(v); }

  function setError(field, on, msg) {
    var el = f2.querySelector('[data-field="' + field + '"]') || f3.querySelector('[data-field="' + field + '"]');
    el.classList.toggle('has-error', on);
    if (msg) el.querySelector('.field-error').textContent = msg;
  }

  function units() { return val(f2, 'units') || 'imp'; }

  f2.querySelectorAll('input[name="units"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var m = units() === 'met';
      f2.querySelector('[data-units="imp"]').hidden = m;
      f2.querySelector('[data-units="met"]').hidden = !m;
      f2.querySelectorAll('[data-wunit]').forEach(function (u) { u.textContent = m ? 'kg' : 'lb'; });
    });
  });

  f1.addEventListener('submit', function (e) {
    e.preventDefault();
    data.style = val(f1, 'style') || 'med';
    if (window.pdTrack) window.pdTrack('calc_style_chosen', { style: data.style });
    show('2');
  });

  function validate2() {
    var errs = [];
    var met = units() === 'met';
    var age = num(f2, 'age');
    var ageBad = !(age >= 1 && age <= 120 && Math.round(age) === age);
    setError('age', ageBad);
    if (ageBad) errs.push(['age', 'Age']);

    var sex = val(f2, 'sex');
    setError('sex', !sex); if (!sex) errs.push(['sex', 'Sex']);

    var cm;
    if (met) { cm = num(f2, 'cm'); }
    else {
      var ft = num(f2, 'ft'), inch = num(f2, 'in'); if (isNaN(inch)) inch = 0;
      cm = (ft * 12 + inch) * 2.54;
      if (inch < 0 || inch > 11) cm = NaN;
    }
    var hBad = !(cm >= 120 && cm <= 230);
    setError('height', hBad, met ? 'Enter your height in centimetres, between 120 and 230.' : 'Enter your height in feet and inches, for example 5 ft 4 in.');
    if (hBad) errs.push([met ? 'cm' : 'ft', 'Height']);

    var k = met ? 1 : 0.45359237;
    var lo = met ? 30 : 70, hi = met ? 320 : 700, u = met ? 'kg' : 'lb';
    var w = num(f2, 'weight'), gw = num(f2, 'goalweight');
    var wBad = !(w >= lo && w <= hi);
    setError('weight', wBad, 'Enter your current weight in ' + u + ', between ' + lo + ' and ' + hi + '.');
    if (wBad) errs.push(['weight', 'Current weight']);

    var goal = val(f2, 'goal');
    var gBad = !(gw >= lo && gw <= hi), gMsg = 'Enter your goal weight in ' + u + '.';
    if (!gBad && goal === 'lose' && !wBad && gw >= w) { gBad = true; gMsg = 'For a weight-loss goal, your goal weight should be lower than your current weight. Or choose Maintain.'; }
    if (!gBad && !hBad && goal === 'lose') {
      var gBmi = (gw * k) / Math.pow(cm / 100, 2);
      var minW = 18.5 * Math.pow(cm / 100, 2) / k;
      if (gBmi < 18.5) { gBad = true; gMsg = 'That goal is below the healthy weight range for your height. The lowest goal we can use is ' + Math.ceil(minW) + ' ' + u + '.'; }
    }
    setError('goalweight', gBad, gMsg);
    if (gBad) errs.push(['goalweight', 'Goal weight']);

    var act = val(f2, 'activity');
    setError('activity', !act); if (!act) errs.push(['activity', 'How active you are']);

    var sum = f2.querySelector('.error-summary');
    if (errs.length) {
      sum.querySelector('ul').innerHTML = errs.map(function (x) { return '<li><a href="#' + x[0] + '">' + x[1] + '</a></li>'; }).join('');
      sum.hidden = false;
      sum.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          var t = f2.elements[a.getAttribute('href').slice(1)];
          (t && t.length ? t[0] : t).focus();
        });
      });
      return { errs: errs, age: age };
    }
    sum.hidden = true;
    return { errs: [], age: age, sex: sex, cm: cm, kg: w * k, goalKg: gw * k, goal: goal, act: Number(act) };
  }

  f2.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = validate2();
    if (!isNaN(r.age) && r.age >= 1 && r.age < 18) { show('under18'); return; }
    if (r.errs.length) { var s = f2.querySelector('.error-summary'); s.focus && s.setAttribute('tabindex', '-1'); s.focus(); return; }
    Object.assign(data, r);
    if (window.pdTrack) window.pdTrack('calc_numbers_entered', { style: data.style, goal: data.goal });
    var bmi = r.kg / Math.pow(r.cm / 100, 2);
    if (r.goal === 'lose' && bmi < 18.5) { show('underweight'); return; }
    show('3');
  });

  root.querySelector('[data-maintain]').addEventListener('click', function () {
    f2.querySelector('input[name="goal"][value="maintain"]').checked = true;
    f2.elements.goalweight.value = f2.elements.weight.value;
    data.goal = 'maintain'; data.goalKg = data.kg;
    show('3');
  });

  f3.addEventListener('submit', function (e) {
    e.preventDefault();
    var em = pdFixEmail(val(f3, 'email'));
    if (em !== val(f3, 'email')) f3.elements.email.value = em;
    var bad = !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(em);
    setError('email', bad);
    if (bad) { f3.elements.email.focus(); return; }
    data.email = em;
    // Sign-up goes to the shared worker: pesco-* routes to the PescoDial
    // newsletter + drip (tests/pd-subscribe-routing). Results show either way;
    // a failed sign-up never blocks someone's numbers.
    try {
      fetch(API + '/api/v1/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, site: 'pd', source: 'calculator', diet_type: DIET[data.style] || DIET.med }) })
        .catch(function () {});
    } catch (err) { /* offline */ }
    if (renderResults() === false) { if (window.pdTrack) window.pdTrack('calc_no_target', { style: data.style }); return; }
    show('4');
    if (window.pdTrack) window.pdTrack('calc_results_viewed', { style: data.style, goal: data.goal });
    if (window.pdTrack) window.pdTrack('generate_lead', { method: 'calculator', style: data.style });
  });

  function round(n, to) { return Math.max(0, Math.round(n / to) * to); }
  function fmt(n) { return n.toLocaleString('en-US'); }

  // The ONE engine (window.PDMacros, bundled from calculator2-demo/src/lib/calculations.ts,
  // parity-tested against the worker). The design's own formula is not used.
  var DIET = { med: 'pesco-mediterranean', lowcarb: 'pesco-lowcarb', keto: 'pesco-keto', carn: 'pesco-carnivore' };
  var ACTIVITY = { '1.2': 'sedentary', '1.375': 'light', '1.55': 'moderate', '1.725': 'very' };
  var LB_PER_KG = 1 / 0.453592;
  function engineInput(d) {
    return {
      diet: DIET[d.style] || DIET.med, sex: d.sex === 'm' ? 'male' : 'female', age: d.age,
      weight: d.kg * LB_PER_KG, heightCm: d.cm, lifestyle: ACTIVITY[String(d.act)] || 'sedentary',
      goal: d.goal === 'lose' ? 'lose' : 'maintain', goalWeight: (d.goalKg || d.kg) * LB_PER_KG,
    };
  }
  function compute(d) {
    var m = window.PDMacros.calculateMacrosCanonical(engineInput(d));
    var s = STYLES[d.style] || STYLES.med;
    if (m.targetSuppressed) return { suppressed: m.suppressionReason || 'suppressed', style: s };
    // Fiber guide only where it is sourced (Pescatarian Mediterranean: 14 g per 1,000 kcal).
    var fiber = d.style === 'med' ? Math.round(m.calories / 1000 * 14) : null;
    return { kcal: m.calories, protein: m.protein, fat: m.fat, carbs: m.carbs, carbsUnit: 'g',
             fiber: fiber, fiberUnit: fiber === null ? '' : 'g', floorApplied: m.floorApplied, style: s };
  }

  function renderResults() {
    var r = compute(data);
    if (r.suppressed) { show(r.suppressed === 'underweight_weight_loss' ? 'underweight' : 'nottarget'); return false; }
    function set(k, v) { var el = root.querySelector('[data-r="' + k + '"]'); if (el) el.textContent = v; }
    set('kcal', fmt(r.kcal)); set('protein', r.protein); set('fat', r.fat);
    set('carbs', r.carbs); set('carbsunit', r.carbsUnit);
    set('fiber', r.fiber); set('fiberunit', r.fiberUnit);
    var fiberVal = root.querySelector('[data-r="fiber"]');
    var fiberCard = fiberVal && fiberVal.closest('.stat, .card, li, div');
    if (fiberCard) fiberCard.hidden = r.fiber === null;
    root.querySelector('[data-r="carbs"]').style.fontSize = typeof r.carbs === 'string' ? '1.6rem' : '';
    set('basis', 'Based on ' + r.style.name + ', ' + (data.goal === 'lose' ? 'aiming to lose weight slowly' + (r.floorApplied ? ', held at the lowest daily amount we use for a self-guided plan.' : '.') : 'aiming to keep your weight steady.'));
    root.querySelector('[data-r="sample"]').innerHTML = r.style.sample.map(function (m) {
      return '<li><b>' + m[0] + '</b><span>' + m[1] + '</span></li>';
    }).join('');
  }

  root.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-back')); });
  });
  root.querySelector('[data-restart]').addEventListener('click', function () {
    f2.reset(); f3.reset(); f1.reset(); data = {}; show('1');
  });

  // Demo states for review
  var demo = new URLSearchParams(location.search).get('demo');
  if (demo) {
    data = { style: 'med', age: 58, sex: 'f', cm: 163, kg: 77, goalKg: 68, goal: 'lose', act: 1.375 };
    if (demo === 'results') { renderResults(); show('4'); }
    else if (demo === 'under18') show('under18');
    else if (demo === 'underweight') show('underweight');
    else if (demo === 'errors') { show('2'); f2.elements.age.value = '5x'; f2.elements.weight.value = '40'; validate2(); }
  }

  // ===== PAID PLAN =====
  // Contract: same worker endpoints as the CW calculator. Price is set on the
  // server; form_data.diet (pesco-*) is what makes the worker treat this as a
  // PescoDial order (return URL, emails, report design). Never send a price.
  var KEY = 'pd_assessment';
  function store(v) { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (e) {} }
  function stored() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }

  function formData(d) {
    var f = engineInput(d);
    return { diet: f.diet, sex: f.sex, age: f.age, weight: Math.round(f.weight * 10) / 10, heightCm: Math.round(f.heightCm * 10) / 10,
             lifestyle: f.lifestyle, goal: f.goal, goalWeight: Math.round(f.goalWeight * 10) / 10, email: d.email, site: 'pd' };
  }

  var checkoutBtn = root.querySelector('[data-checkout]');
  if (checkoutBtn) checkoutBtn.addEventListener('click', function () {
    var err = root.querySelector('[data-checkout-error]');
    if (err) err.textContent = '';
    if (window.pdTrack) window.pdTrack('upgrade_click', { style: data.style });
    var codeEl = root.querySelector('[data-coupon]');
    var code = codeEl ? codeEl.value.trim().toUpperCase() : '';
    // A code is checked by the worker (/validate-coupon) and applied by the worker
    // at checkout; the page never sets a price. discount_percent is sent only so
    // the worker can take its own Stripe-verified free path for a 100% code.
    var check = code
      ? fetch(API + '/validate-coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      : Promise.resolve(null);
    show('checkout-wait');
    check.then(function (c) {
      if (c && !c.ok) { var e = new Error('coupon'); e.userMsg = 'That code is not valid. Check it, or leave the box empty.'; throw e; }
      var body = { email: data.email, form_data: formData(data), tier_id: 'bundle', site: 'pd' };
      if (c) { body.coupon_code = code; if (Number(c.j.percent) === 100) body.discount_percent = 100; }
      return fetch(API + '/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        var url = res.j && (res.j.url || res.j.checkout_url);
        if (res.ok && url) { if (res.j.session_uuid) store(res.j.session_uuid); if (window.pdTrack) window.pdTrack('begin_checkout', { value: 29, currency: 'USD' }); window.location.assign(url); return; }
        show('4');
        if (err) err.textContent = (res.j && res.j.message) || 'We could not start checkout. Please try again in a minute.';
      })
      .catch(function (e) { show('4'); if (err) err.textContent = (e && e.userMsg) || 'We could not reach checkout. Please check your connection and try again.'; });
  });

  var params = new URLSearchParams(window.location.search);
  var payState = params.get('payment');
  var assessmentId = params.get('session_id') || params.get('assessment_id') || stored();

  function waitForPayment(tries) {
    fetch(API + '/get-session?id=' + encodeURIComponent(assessmentId))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var st = j && (j.payment_status || (j.session && j.session.payment_status));
        if (st === 'completed' || st === 'success') {
          var fd = (j.form_data || (j.session && j.session.form_data)) || {};
          // The page reloaded after Stripe: the order's email comes back from the server,
          // and email-report only sends to that stored address.
          data.email = j.email || fd.email || data.email;
          var first = root.querySelector('#pd-first'); if (first && fd.firstName) first.value = fd.firstName;
          show('5'); return;
        }
        if (tries > 20) {
          root.querySelector('[data-paid-wait-msg]').textContent = 'This is taking longer than usual. Your payment is safe: we have emailed you a link to come back and finish.';
          return;
        }
        setTimeout(function () { waitForPayment(tries + 1); }, 3000);
      })
      .catch(function () { setTimeout(function () { waitForPayment(tries + 1); }, 4000); });
  }

  if (assessmentId && (payState === 'success' || payState === 'resume' || payState === 'free')) {
    store(assessmentId);
    if (window.pdTrack) window.pdTrack('payment_returned', { state: payState });
    show('paid-wait');
    waitForPayment(0);
  } else if (payState === 'cancelled') {
    store(null);
  }

  var f5 = root.querySelector('[data-step="5"]');
  if (f5) f5.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { var el = f5.elements[n]; return el ? String(el.value || '').trim() : ''; };
    var conditions = Array.prototype.slice.call(f5.querySelectorAll('input[name="conditions"]:checked')).map(function (c) { return c.value; });
    var meds = g('medications');
    if (f5.querySelector('input[name="bloodthinner"]:checked')) meds = (meds ? meds + '; ' : '') + 'blood thinner';
    var other = g('otherConditions');
    if (f5.querySelector('input[name="pregnant"]:checked')) other = (other ? other + '; ' : '') + 'pregnant or breastfeeding';
    var payload = { firstName: g('firstName'), medications: meds, conditions: conditions.length ? conditions : ['none'],
                    otherConditions: other, allergies: g('allergies'), avoidFoods: g('avoidFoods') };
    var err = f5.querySelector('[data-plan-error]'); err.textContent = '';
    show('building');
    if (window.pdTrack) window.pdTrack('plan_answers_submitted', {});
    fetch(API + '/api/v1/calculator/step/4', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment_id: assessmentId, data: payload }) })
      .then(function (r) { if (!r.ok) throw new Error('step4 ' + r.status); return r.json(); })
      .then(function () {
        return fetch(API + '/api/v1/calculator/report/init', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: assessmentId }) });
      })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) {
          show('5'); err.textContent = (res.j && res.j.message) || 'We could not build your plan. Please try again.'; return;
        }
        if (res.j.report_html) return showReport(res.j.report_html, res.j.access_token);
        if (res.j.access_token) {
          return fetch(API + '/api/v1/calculator/report/' + res.j.access_token + '/content').then(function (r) { return r.text(); })
            .then(function (html) { showReport(html, res.j.access_token); });
        }
        throw new Error('no report');
      })
      .catch(function () { show('paid-error'); });
  });

  function showReport(html, token) {
    var frame = root.querySelector('[data-report-frame]');
    // The sandboxed frame runs no scripts, so the report's own print button would be dead;
    // the page's button above prints instead.
    frame.srcdoc = String(html).replace('</head>', '<style>.toolbar{display:none}</style></head>');
    show('report');
    if (window.pdTrack) window.pdTrack('plan_viewed', {});
    store(null);
    root.querySelector('[data-report-print]').onclick = function () { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) {} };
    root.querySelector('[data-report-email]').onclick = function () {
      var msg = root.querySelector('[data-report-email-msg]');
      fetch(API + '/api/v1/calculator/email-report', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: assessmentId }) })
        .then(function (r) { if (r.ok) if (window.pdTrack) window.pdTrack('plan_emailed', {}); msg.textContent = r.ok ? 'Sent. Check your inbox in a minute or two.' : 'We could not send it just now. Your plan is saved; try again later.'; })
        .catch(function () { msg.textContent = 'We could not send it just now.'; });
    };
  }
})();

/* Newsletter sign-up (homepage). Same worker endpoint; site 'pd'. */
(function () {
  var form = document.querySelector('[data-signup]');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input[type="email"]');
    var em = pdFixEmail(input && input.value);
    if (input && em !== input.value.trim()) input.value = em;
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(em)) { input.focus(); input.setAttribute('aria-invalid', 'true'); return; }
    input.removeAttribute('aria-invalid');
    fetch('https://carnivore-report-api-production.iambrew.workers.dev/api/v1/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, site: 'pd', source: 'homepage' })
    }).catch(function () {});
    if (window.pdTrack) window.pdTrack('sign_up', { method: 'newsletter' });
    var ok = form.querySelector('[data-ok]'); if (ok) ok.hidden = false;
  });
})();
