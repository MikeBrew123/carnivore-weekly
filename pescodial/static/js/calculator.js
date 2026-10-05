/* PescoDial calculator. Screens from Brew's Claude Design (site-v1); maths from the shared engine. */
/* Numbers come from window.PDMacros (the shared engine), never a local formula.
   Try ?demo=results | errors | under18 | underweight to preview states. */
/* Email checks shared by the calculator and the homepage sign-up (Brew, 2026-10-04).
   A reader typed "name@aol..ccoom" and it was accepted. isPlausible mirrors the
   worker's isPlausibleEmail in api/calculator-api.js: keep the two in step.
   suggest() only offers a fix for a close misspelling of a common domain; the
   reader can ignore it and still submit a well-formed address. Never flags "+". */
window.pdEmail = (function () {
  var DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.ca', 'aol.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'me.com', 'msn.com', 'live.com', 'comcast.net', 'sbcglobal.net', 'att.net',
    'verizon.net', 'shaw.ca', 'telus.net', 'rogers.com', 'sympatico.ca', 'bellsouth.net'];

  function isPlausible(email) {
    if (typeof email !== 'string' || !email.length || email.length > 254) return false;
    var parts = email.split('@');
    if (parts.length !== 2) return false;
    var local = parts[0], domain = parts[1];
    if (!local || local.length > 64 || !/^[A-Za-z0-9._%+'-]+$/.test(local)) return false;
    if (local.charAt(0) === '.' || local.slice(-1) === '.' || local.indexOf('..') !== -1) return false;
    var labels = domain.split('.');
    if (labels.length < 2) return false;
    for (var i = 0; i < labels.length; i++) {
      if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(labels[i])) return false;
    }
    return /^[A-Za-z]{2,24}$/.test(labels[labels.length - 1]);
  }

  // Edit distance where swapping two neighbours (gmial) counts as one slip.
  function dist(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 99;
    var d = [];
    for (var i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (var j = 0; j <= b.length; j++) { d[0][j] = j; }
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }
  function undouble(s) { return s.replace(/(.)\1+/g, '$1'); }

  // Returns the corrected address, or '' when nothing common is close.
  function suggest(email) {
    email = String(email || '').trim();
    var at = email.lastIndexOf('@');
    if (at < 1) return '';
    var local = email.slice(0, at).replace(/^@+|@+$/g, '');
    var raw = email.slice(at + 1).toLowerCase().replace(/\s+/g, '');
    if (!local || !raw || DOMAINS.indexOf(raw) !== -1) return '';
    var tidy = raw.replace(/,/g, '.').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
    var best = '', bestD = 99;
    for (var i = 0; i < DOMAINS.length; i++) {
      var c = DOMAINS[i];
      // Doubled letters and dots ("aol..ccoom", "yaho.com") match outright.
      var d = undouble(tidy) === undouble(c) ? 0 : Math.min(dist(raw, c), dist(tidy, c));
      // One slip on any domain; two only on longer ones, so gmx.com is never pulled to me.com.
      if (d < bestD && (d <= 1 || (d === 2 && c.length >= 9))) { best = c; bestD = d; }
    }
    if (!best) return '';
    var fixed = local + '@' + best;
    return fixed === email ? '' : fixed;
  }

  var TYPO = "Check your email address. It looks like there's a typo.";

  // Shows "Did you mean x?" in `box` (an aria-live element). Clicking the address
  // puts it in the field. Returns the suggestion shown, or ''.
  function offer(input, box, onAccept) {
    var s = suggest(input.value);
    box.textContent = '';
    if (!s) return '';
    box.appendChild(document.createTextNode('Did you mean '));
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-link';
    b.setAttribute('data-email-fix', '');
    b.textContent = s;
    b.addEventListener('click', function () {
      input.value = s;
      box.textContent = '';
      if (onAccept) onAccept(s);
      input.focus();
    });
    box.appendChild(b);
    box.appendChild(document.createTextNode('?'));
    return s;
  }

  // Offer the fix once she pauses typing. Not on blur: the line appearing under the
  // field while she presses the button moves the button out from under the click.
  function watch(input, box, onAccept) {
    var t;
    input.addEventListener('input', function () {
      clearTimeout(t);
      if (!input.value.trim()) { box.textContent = ''; return; }
      t = setTimeout(function () { offer(input, box, onAccept); }, 600);
    });
  }

  return { isPlausible: isPlausible, suggest: suggest, offer: offer, watch: watch, TYPO: TYPO };
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
      fish: ['About 5 fish meals a week', 'Build about 5 meals a week around fish or seafood. Make at least 2 of them oily fish such as salmon, sardines, trout or Atlantic mackerel. Canned and frozen fish count.'],
      sample: [['Breakfast', 'Greek yogurt with berries and a few walnuts'], ['Lunch', 'Lentil and vegetable soup, wholegrain bread'], ['Snack', 'An apple and a small handful of almonds'], ['Dinner', 'Baked salmon, roasted vegetables in olive oil, brown rice']] },
    lowcarb: { name: 'Pescatarian Low Carb', protein: 1.4,
      fish: ['About 5 fish meals a week', 'Build about 5 meals a week around fish or seafood. Make at least 2 of them oily fish such as salmon, sardines, trout or Atlantic mackerel. Canned and frozen fish count.'],
      sample: [['Breakfast', 'Two eggs scrambled with spinach and feta'], ['Lunch', 'Tuna salad with olive oil, cucumber and chickpeas'], ['Snack', 'Cheese and cherry tomatoes'], ['Dinner', 'Grilled cod, green beans and a small baked sweet potato']] },
    keto: { name: 'Pescatarian Keto', protein: 1.4,
      fish: ['Fish or seafood every day', 'Have fish or seafood at least once every day. Try to make oily fish such as salmon, sardines, trout or Atlantic mackerel part of at least 2 or 3 of those days. Canned and frozen fish count.'],
      sample: [['Breakfast', 'Eggs cooked in butter with avocado'], ['Lunch', 'Sardines on salad leaves with olive oil'], ['Snack', 'A few olives and some cheese'], ['Dinner', 'Pan-fried salmon with broccoli and garlic butter']] },
    carn: { name: 'Pescatarian Carnivore', protein: 1.6,
      fish: ['Fish or seafood every day', 'Have fish or seafood at least once every day. Try to make oily fish such as salmon, sardines, trout or Atlantic mackerel part of at least 2 or 3 of those days. Canned and frozen fish count.'],
      sample: [['Breakfast', 'Three eggs and smoked salmon'], ['Lunch', 'Canned mackerel or sardines'], ['Snack', 'Hard-boiled eggs'], ['Dinner', 'Seared scallops or shrimp with a fried egg']] }
  };

  var barRow = root.querySelector('.steps');
  function show(name) {
    steps.forEach(function (el) {
      el.hidden = el.getAttribute('data-step') !== name && el.getAttribute('data-state') !== name;
    });
    var n = parseInt(name, 10) || 2;
    bars.forEach(function (b, i) { b.classList.toggle('on', i < n); });
    // The results are the payoff, not a step: no progress bar there (review #22).
    if (barRow) barRow.hidden = name === '4';
    var active = root.querySelector('[data-step="' + name + '"], [data-state="' + name + '"]');
    var h = active && active.querySelector('[tabindex="-1"]');
    if (h) h.focus({ preventScroll: true });
    // Every step change, Back included, brings the top of the calculator into view (review #12).
    var top = root.getBoundingClientRect().top + window.pageYOffset - 12;
    window.scrollTo(0, Math.max(0, top));
  }

  function val(form, n) {
    var el = form.elements[n];
    return el ? (el.value || '').trim() : '';
  }
  function num(form, n) { var v = val(form, n); return v === '' ? NaN : Number(v); }

  // Screen readers hear the error only while it is showing (review #26).
  function describe(input, id, on) {
    var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== id; });
    if (on) ids.push(id);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
  }
  function setError(field, on, msg) {
    var el = f2.querySelector('[data-field="' + field + '"]') || f3.querySelector('[data-field="' + field + '"]');
    el.classList.toggle('has-error', on);
    var errEl = el.querySelector('.field-error');
    if (msg) errEl.textContent = msg;
    if (!errEl.id) errEl.id = field + '-err';
    if (el.tagName === 'FIELDSET') { if (on) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
    el.querySelectorAll('input').forEach(function (i) {
      describe(i, errEl.id, on);
      if (i.type !== 'radio') { if (on) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
    });
  }
  function clearErrors() {
    ['age', 'sex', 'height', 'weight', 'goalweight', 'activity'].forEach(function (f) { setError(f, false); });
    f2.querySelector('.error-summary').hidden = true;
  }

  function units() { return val(f2, 'units') || 'imp'; }

  // The unit UI always follows the checked radio: one place, used by the toggle and by Start over (review #1).
  function applyUnits() {
    var m = units() === 'met';
    f2.querySelector('[data-units="imp"]').hidden = m;
    f2.querySelector('[data-units="met"]').hidden = !m;
    f2.querySelectorAll('[data-wunit]').forEach(function (u) { u.textContent = m ? 'kg' : 'lb'; });
    shownUnits = units();
  }
  var shownUnits = 'imp';
  function trim1(n) { return String(Math.round(n * 10) / 10); }
  // Switching units converts what she already typed instead of relabelling it (review #6).
  function convertUnits(to) {
    var e = f2.elements;
    if (to === 'met') {
      var ft = num(f2, 'ft'), inch = num(f2, 'in');
      if (!isNaN(ft)) e.cm.value = String(Math.round((ft * 12 + (isNaN(inch) ? 0 : inch)) * 2.54));
      ['weight', 'goalweight'].forEach(function (n) { var v = num(f2, n); if (!isNaN(v)) e[n].value = trim1(v * 0.45359237); });
    } else {
      var cm = num(f2, 'cm');
      if (!isNaN(cm)) { var tot = Math.round(cm / 2.54); e.ft.value = String(Math.floor(tot / 12)); e['in'].value = String(tot % 12); }
      ['weight', 'goalweight'].forEach(function (n) { var v = num(f2, n); if (!isNaN(v)) e[n].value = String(Math.round(v / 0.45359237)); });
    }
  }
  f2.querySelectorAll('input[name="units"]').forEach(function (r) {
    r.addEventListener('change', function () {
      if (units() !== shownUnits) convertUnits(units());
      applyUnits();
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
      var ft = num(f2, 'ft'), inch = num(f2, 'in');
      // A blank inches box is not 0: ask for it (review #15). A typed 0 is fine.
      var inchBlank = !isNaN(ft) && isNaN(inch);
      cm = (ft * 12 + inch) * 2.54;
      if (inch < 0 || inch > 11) cm = NaN;
    }
    var hBad = !(cm >= 120 && cm <= 230);
    var hMsg = met ? 'Enter your height in centimetres, between 120 and 230.' : 'Enter your height in feet and inches, for example 5 ft 4 in.';
    if (!met && inchBlank) hMsg = "Enter inches too, even if it's 0.";
    setError('height', hBad, hMsg);
    if (hBad) errs.push([met ? 'cm' : (inchBlank ? 'in' : 'ft'), 'Height']);

    var k = met ? 1 : 0.45359237;
    var lo = met ? 30 : 70, hi = met ? 320 : 700, u = met ? 'kg' : 'lb';
    var w = num(f2, 'weight'), gw = num(f2, 'goalweight');
    var wBad = !(w >= lo && w <= hi);
    setError('weight', wBad, 'Enter your current weight in ' + u + ', between ' + lo + ' and ' + hi + '.');
    if (wBad) errs.push(['weight', 'Current weight']);

    var goal = val(f2, 'goal');
    // Maintain: no goal weight to ask for, the current weight is the goal (Brew 2026-10-04).
    if (goal !== 'lose') gw = w;
    // Already under BMI 18.5 and choosing Lose: no goal-weight check at all. She goes to the
    // underweight panel, never to a "lowest goal" above her current weight (review #2).
    var underweight = goal === 'lose' && !hBad && !wBad && (w * k) / Math.pow(cm / 100, 2) < 18.5;
    var gBad = goal === 'lose' && !underweight && !(gw >= lo && gw <= hi), gMsg = 'Enter your goal weight in ' + u + '.';
    if (underweight) gw = w;
    if (!gBad && goal === 'lose' && !underweight && !wBad && gw >= w) { gBad = true; gMsg = 'For a weight-loss goal, your goal weight should be lower than your current weight. Or choose Maintain.'; }
    if (!gBad && !hBad && goal === 'lose' && !underweight) {
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
    return { errs: [], age: age, sex: sex, cm: cm, kg: w * k, goalKg: gw * k, goal: goal, act: Number(act),
             underweight: underweight, units: u, weightShown: w, goalShown: gw };
  }

  // The goal weight box only shows for a weight-loss goal.
  function syncGoalWeight() {
    var lose = val(f2, 'goal') === 'lose';
    f2.querySelector('[data-field="goalweight"]').hidden = !lose;
    if (!lose) setError('goalweight', false);
  }
  f2.querySelectorAll('input[name="goal"]').forEach(function (r) { r.addEventListener('change', syncGoalWeight); });
  syncGoalWeight();

  f2.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = validate2();
    if (!isNaN(r.age) && r.age >= 1 && r.age < 18) { show('under18'); return; }
    if (r.errs.length) { var s = f2.querySelector('.error-summary'); s.focus && s.setAttribute('tabindex', '-1'); s.focus(); return; }
    Object.assign(data, r);
    if (window.pdTrack) window.pdTrack('calc_numbers_entered', { style: data.style, goal: data.goal });
    if (r.underweight) { show('underweight'); return; }
    // Run the engine now: a suppressed target is shown here, before any email is asked
    // for, so nobody signs up for results that never come (review #3).
    var c = compute(data);
    if (c.suppressed) {
      if (window.pdTrack) window.pdTrack('calc_no_target', { style: data.style });
      show(c.suppressed === 'underweight_weight_loss' ? 'underweight' : 'nottarget');
      return;
    }
    show('3');
  });

  root.querySelector('[data-maintain]').addEventListener('click', function () {
    f2.querySelector('input[name="goal"][value="maintain"]').checked = true;
    f2.elements.goalweight.value = f2.elements.weight.value;
    data.goal = 'maintain'; data.goalKg = data.kg; data.goalShown = data.weightShown;
    show('3');
  });

  var emailSuggest = f3.querySelector('[data-email-suggest]');
  var emailPaused = '';
  function clearEmailError() { setError('email', false); }
  window.pdEmail.watch(f3.elements.email, emailSuggest, clearEmailError);

  f3.addEventListener('submit', function (e) {
    e.preventDefault();
    var em = val(f3, 'email');
    var bad = !window.pdEmail.isPlausible(em);
    setError('email', bad, em ? window.pdEmail.TYPO : 'Enter an email address like name@example.com.');
    var offered = window.pdEmail.offer(f3.elements.email, emailSuggest, clearEmailError);
    if (bad) { f3.elements.email.focus(); return; }
    // A well-formed address that looks like a misspelling pauses once so she sees
    // the suggestion; submitting again with the same address goes through.
    if (offered && emailPaused !== em) { emailPaused = em; return; }
    data.email = em;
    // Belt and braces: the target was checked at step 2; if it is somehow suppressed now,
    // show the refusal and do NOT sign her up.
    if (compute(data).suppressed) { renderResults(); if (window.pdTrack) window.pdTrack('calc_no_target', { style: data.style }); return; }
    // Sign-up goes to the shared worker: pesco-* routes to the PescoDial
    // newsletter + drip (tests/pd-subscribe-routing). Results show either way;
    // a failed sign-up never blocks someone's numbers.
    try {
      fetch(API + '/api/v1/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, site: 'pd', source: 'calculator', diet_type: DIET[data.style] || DIET.med }) })
        .catch(function () {});
    } catch (err) { /* offline */ }
    renderResults();
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
             fiber: fiber, fiberUnit: fiber === null ? '' : 'g', floorApplied: m.floorApplied, style: s,
             tdee: m.tdee, deficitPct: m.requestedDeficitPct, floor: m.selfServiceFloor, proteinBasisKg: m.proteinBasisKg };
  }

  // Results explainer (Sarah, pescodial/drafts/pages/calculator-copy-fixes.md #7). Every number
  // comes from the engine result: tdee, the floor, and the weight protein was actually set from.
  function basisText(r, d) {
    var u = d.units || 'lb';
    var typedKg = d.goalKg || d.kg;
    var basisKg = r.proteinBasisKg;
    // The engine swaps in a BMI-25 or BMI-18.5 reference weight in some cases; then say so.
    var swapped = typeof basisKg === 'number' && Math.abs(basisKg - typedKg) > 0.05;
    var shown = d.goal === 'lose' ? d.goalShown : d.weightShown;
    var protein;
    if (swapped) {
      var b = u === 'kg' ? Math.round(basisKg) : Math.round(basisKg / 0.453592);
      protein = 'Your protein is based on ' + fmt(b) + ' ' + u + ', a weight in the healthy range for your height.';
    } else {
      protein = 'Your protein is based on your ' + (d.goal === 'lose' ? 'goal' : 'current') + ' weight of ' + fmt(shown) + ' ' + u + '.';
    }
    var lead = 'Based on ' + r.style.name + '. You burn about ' + fmt(r.tdee) + ' calories a day';
    if (d.goal !== 'lose') return lead + ", so that's your target for keeping your weight steady. " + protein;
    if (r.floorApplied) return lead + '. A ' + r.deficitPct + '% cut would take you under ' + fmt(r.floor) + ", the lowest we'll suggest without a doctor, so we kept you at " + fmt(r.floor) + '. ' + protein;
    if (swapped) return lead + '. Your target of ' + fmt(r.kcal) + ' is ' + r.deficitPct + '% less than that. ' + protein;
    return lead + '. Your target of ' + fmt(r.kcal) + ' is ' + r.deficitPct + '% less than that, and your protein is based on your goal weight of ' + fmt(shown) + ' ' + u + '.';
  }

  function renderResults() {
    var r = compute(data);
    if (r.suppressed) { show(r.suppressed === 'underweight_weight_loss' ? 'underweight' : 'nottarget'); return false; }
    function set(k, v) { var el = root.querySelector('[data-r="' + k + '"]'); if (el) el.textContent = v; }
    set('kcal', fmt(r.kcal)); set('protein', r.protein); set('fat', r.fat);
    set('carbs', r.carbs); set('carbsunit', r.carbsUnit);
    set('fiber', r.fiber); set('fiberunit', r.fiberUnit);
    var fiberVal = root.querySelector('[data-r="fiber"]');
    var fiberCard = fiberVal && fiberVal.closest('.stat');
    if (fiberCard) fiberCard.hidden = r.fiber === null;
    root.querySelector('.results-grid').classList.toggle('no-fiber', r.fiber === null);
    root.querySelector('[data-r="carbs"]').style.fontSize = typeof r.carbs === 'string' ? '1.6rem' : '';
    set('basis', basisText(r, data));
    set('fishhead', r.style.fish[0]); set('fishbody', r.style.fish[1]);
    root.querySelector('[data-r="sample"]').innerHTML = r.style.sample.map(function (m) {
      return '<li><b>' + m[0] + '</b><span>' + m[1] + '</span></li>';
    }).join('');
  }

  root.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-back')); });
  });
  root.querySelector('[data-restart]').addEventListener('click', function () {
    f2.reset(); f3.reset(); f1.reset(); data = {};
    applyUnits(); clearErrors(); syncGoalWeight();
    var ce = root.querySelector('[data-checkout-error]'); if (ce) ce.textContent = '';
    show('1');
  });

  // Demo states for review
  var demo = new URLSearchParams(location.search).get('demo');
  if (demo) {
    data = { style: 'med', age: 58, sex: 'f', cm: 163, kg: 77, goalKg: 68, goal: 'lose', act: 1.375, units: 'kg', weightShown: 77, goalShown: 68 };
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
  // A checkout problem keeps her on the results, next to the box or button that caused it,
  // with the message visible and focus on the place to fix it (review #11).
  function checkoutProblem(msg, target) {
    var err = root.querySelector('[data-checkout-error]');
    if (root.querySelector('[data-step="4"]').hidden) show('4');
    if (err) err.textContent = msg;
    var codeEl = root.querySelector('[data-coupon]');
    if (codeEl) { if (target === codeEl) codeEl.setAttribute('aria-invalid', 'true'); else codeEl.removeAttribute('aria-invalid'); }
    checkoutBtn.disabled = false;
    (target || checkoutBtn).scrollIntoView({ block: 'center' });
    (target || checkoutBtn).focus({ preventScroll: true });
  }
  if (checkoutBtn) checkoutBtn.addEventListener('click', function () {
    var err = root.querySelector('[data-checkout-error]');
    if (err) err.textContent = '';
    if (window.pdTrack) window.pdTrack('upgrade_click', { style: data.style });
    var codeEl = root.querySelector('[data-coupon]');
    var code = codeEl ? codeEl.value.trim().toUpperCase() : '';
    checkoutBtn.disabled = true;
    // A code is checked by the worker (/validate-coupon) and applied by the worker
    // at checkout; the page never sets a price. discount_percent is sent only so
    // the worker can take its own Stripe-verified free path for a 100% code.
    // The code is checked BEFORE the checkout panel shows, so a bad code never
    // flashes "Taking you to secure checkout" and jumps her to the top.
    var check = code
      ? fetch(API + '/validate-coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      : Promise.resolve(null);
    check.then(function (c) {
      if (c && !c.ok) { checkoutProblem('That code is not valid. Check it, or leave the box empty.', codeEl); return; }
      if (codeEl) codeEl.removeAttribute('aria-invalid');
      show('checkout-wait');
      var body = { email: data.email, form_data: formData(data), tier_id: 'bundle', site: 'pd' };
      if (c) { body.coupon_code = code; if (Number(c.j.percent) === 100) body.discount_percent = 100; }
      return fetch(API + '/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          var url = res.j && (res.j.url || res.j.checkout_url);
          if (res.ok && url) { if (res.j.session_uuid) store(res.j.session_uuid); if (window.pdTrack) window.pdTrack('begin_checkout', { value: 29, currency: 'USD' }); window.location.assign(url); return; }
          checkoutProblem((res.j && res.j.message) || 'We could not start checkout. Please try again in a minute.');
        });
    }).catch(function () { checkoutProblem('We could not reach checkout. Please check your connection and try again.'); });
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
  var field = form.querySelector('[data-signup-field]');
  var err = form.querySelector('.field-error');
  var box = form.querySelector('[data-email-suggest]');
  var paused = '';
  function setBad(on, em) {
    var input = form.querySelector('input[type="email"]');
    if (field) field.classList.toggle('has-error', on);
    if (err && on) err.textContent = em ? window.pdEmail.TYPO : 'Enter an email address like name@example.com.';
    if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  window.pdEmail.watch(form.querySelector('input[type="email"]'), box, function () { setBad(false); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input[type="email"]');
    var em = (input && input.value || '').trim();
    var bad = !window.pdEmail.isPlausible(em);
    setBad(bad, em);
    var offered = window.pdEmail.offer(input, box, function () { setBad(false); });
    if (bad) { input.focus(); return; }
    if (offered && paused !== em) { paused = em; return; }
    fetch('https://carnivore-report-api-production.iambrew.workers.dev/api/v1/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, site: 'pd', source: 'homepage' })
    }).catch(function () {});
    if (window.pdTrack) window.pdTrack('sign_up', { method: 'newsletter' });
    var ok = form.querySelector('[data-ok]'); if (ok) ok.hidden = false;
  });
})();
