/* PescoDial calculator. No dependencies.
   Calories: Mifflin-St Jeor x activity. Weight loss: minus 500 kcal, floor 1200 (F) / 1500 (M).
   Try ?demo=results | errors | under18 | underweight to preview states. */
(function () {
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
    var em = val(f3, 'email');
    var bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em);
    setError('email', bad);
    if (bad) { f3.elements.email.focus(); return; }
    data.email = em;
    // Production: send data to your email service here.
    renderResults();
    show('4');
  });

  function round(n, to) { return Math.max(0, Math.round(n / to) * to); }
  function fmt(n) { return n.toLocaleString('en-US'); }

  function compute(d) {
    var bmr = 10 * d.kg + 6.25 * d.cm - 5 * d.age + (d.sex === 'm' ? 5 : -161);
    var tdee = bmr * d.act;
    var kcal = tdee;
    if (d.goal === 'lose') kcal = Math.max(tdee - 500, d.sex === 'm' ? 1500 : 1200);
    kcal = round(kcal, 10);
    var s = STYLES[d.style];
    var refKg = d.goal === 'lose' ? d.goalKg : d.kg;
    var p = round(refKg * s.protein, 5);
    var fat, carbs, fiber, carbsUnit = 'g', fiberUnit = 'g';
    if (d.style === 'med') {
      fat = round(kcal * 0.35 / 9, 1);
      carbs = round((kcal - p * 4 - fat * 9) / 4, 5);
      fiber = Math.min(38, Math.max(25, Math.round(kcal / 1000 * 14)));
    } else if (d.style === 'lowcarb') {
      carbs = 100; fat = round((kcal - p * 4 - carbs * 4) / 9, 1); fiber = 25;
    } else if (d.style === 'keto') {
      carbs = 25; carbsUnit = 'g net'; fat = round((kcal - p * 4 - carbs * 4) / 9, 1); fiber = 20;
    } else {
      carbs = 'Under 10'; fat = round((kcal - p * 4 - 20) / 9, 1); fiber = 'Not a focus'; fiberUnit = '';
    }
    return { kcal: kcal, protein: p, fat: fat, carbs: carbs, carbsUnit: carbsUnit, fiber: fiber, fiberUnit: fiberUnit, style: s };
  }

  function renderResults() {
    var r = compute(data);
    function set(k, v) { var el = root.querySelector('[data-r="' + k + '"]'); if (el) el.textContent = v; }
    set('kcal', fmt(r.kcal)); set('protein', r.protein); set('fat', r.fat);
    set('carbs', r.carbs); set('carbsunit', r.carbsUnit);
    set('fiber', r.fiber); set('fiberunit', r.fiberUnit);
    var fiberVal = root.querySelector('[data-r="fiber"]');
    fiberVal.style.fontSize = typeof r.fiber === 'string' ? '1.35rem' : '';
    root.querySelector('[data-r="carbs"]').style.fontSize = typeof r.carbs === 'string' ? '1.6rem' : '';
    set('basis', 'Based on ' + r.style.name + ', ' + (data.goal === 'lose' ? 'aiming to lose weight slowly, about 1 lb a week.' : 'aiming to keep your weight steady.'));
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
})();
