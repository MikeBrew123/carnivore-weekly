// PescoDial paid report: Pescatarian Mediterranean (Brew, 2026-10-03).
//
// NOT a second report generator. This module only RENDERS. The one entry point is
// still generateAllReports() in api/calculator-api.js, which runs the input gate,
// derives the medical context, applies calorie guidance, builds the week, and runs
// every section returned here through the same four copy gates as the CW report.
// tests/deploy-tripwire.test.mjs keeps calculator-api.js the only deployed generator.
//
// Layout and theme: Brew's Claude Design report (pescodial/design/report-v2/plan.html).
// Fixed copy: Sarah, fact-checked (pescodial/drafts/report/*.md). Change the copy
// there first, then here; nothing in this file is new clinical guidance.
//
// Two variants, decided by the caller from the medical context:
//   numbers shown   daily numbers, 7-day table with portions, grocery list with amounts
//   numbers hidden  no number cards, dishes only, grocery list with no amounts.
//                   Nothing here sizes food from a withheld value: the caller passes a
//                   dish-only week built without any calorie or protein figure.

import { formatQty } from './pd-meal-plan.js';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmtInt = n => Math.round(n).toLocaleString('en-US');

export const PD_REPORT_STYLE = 'Pescatarian Mediterranean';
const DAY_LONG = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];

// ---------------------------------------------------------------------------
// Copy (Sarah, pescodial/drafts/report/)
// ---------------------------------------------------------------------------
const COPY = {
  coverSub: 'Your daily numbers, a weekly fish plan, seven days of meals, a grocery list and five easy recipes, built from the answers you gave in the PescoDial calculator.',
  coverSubHidden: 'Your weekly fish plan, seven days of meals, a grocery list and five easy recipes, built from the answers you gave in the PescoDial calculator.',
  doctorBox: "Talk to your doctor before you start a new way of eating or change the one you're on. This matters most if you take medication, especially a blood thinner, a blood pressure medicine or a diabetes medicine, because what you eat can change how some medicines work. The questions at the back of this plan are a good place to start that conversation.",
  numbersIntro: "These numbers come from the answers you gave. Use them as a guide, not a rule. Close is good enough, and a day that runs a little high or low doesn't undo your week. Look at how the week averages out, not at any single day.",
  howToRead: [
    ['Calories', 'a rough size for your day. Use it to check your portions, not to count every bite.'],
    ['Protein', 'spread it across your meals instead of saving it all for dinner.'],
    ['Fat', 'most of it comes from your cooking fat and your fish.'],
    ['Carbs', 'the number that changes most between eating styles, so check yours against your meal plan.'],
    ['Fiber', 'comes only from plant foods, so it rises and falls with how many plants your style includes.'],
  ],
  cardNotes: { cal: 'Three meals and a snack', pro: 'Fish, eggs, yogurt, beans', fat: 'Olive oil, nuts, fish', carb: 'Vegetables, fruit, grains, beans', fib: 'Beans, vegetables, whole grains' },
  numbersHidden: "Based on your health answers, we've left the daily numbers out of your plan. That isn't a judgment about your health. Your doctor or a registered dietitian can see your full picture, and they're the right people to set your numbers. Until then, use the fish plan, the plate guide and the grocery list, and take the questions at the back of this plan to your next visit.",
  bloodThinner: 'Because you told us you take a blood thinner, try to keep the amount of leafy greens you eat about the same from week to week. Ask your prescriber before you change how much of them you eat.',
  // Medical warning box (Sarah, gap-copy.md, Brew 2026-10-04). One line per concern.
  warn: {
    heading: "Why we're flagging your numbers",
    intro: "These numbers are a starting point, and your health answers mean there are a few things to check with a professional before you use them.",
    bloodThinner: "Your meal plan has leafy greens like spinach, salad greens and broccoli in different amounts on different days, and the vitamin K in those foods can change how warfarin-type blood thinners work. Try to keep the greens you eat about the same from week to week, and ask your prescriber before you change how much of them you eat.",
    diabetes: "On some diabetes medicines, eating less than usual or eating fewer carbs can make your blood sugar drop too low. This plan may change both, so talk to your doctor or pharmacist before you start.",
    otherMedicine: "What you eat can change how some medicines work, including some blood pressure medicines. Ask your doctor or pharmacist whether anything in this plan could affect the medicine you take.",
    maintenance: "Because of your health answers, we set your calories at about what your body uses now, not the lower weight-loss number you picked. Eating less to lose weight is a decision for you and your doctor to make together, not one this plan makes for you.",
    close: "Before you start, bring this page and the questions at the back of this plan to your doctor, pharmacist or a registered dietitian.",
  },
  plate: [
    ['var(--olive-2)', 'Half the plate:', 'vegetables or salad'],
    ['var(--sea-2)', 'A quarter:', 'fish, eggs or other protein, about the size of your palm'],
    ['#c79a3e', 'A quarter:', 'whole grains, beans or potatoes'],
  ],
  plateFinish: 'Finish with a drizzle of olive oil and a glass of water.',
  fishIntro: 'Your fish meals for the week are below, built around fish that are low in mercury. One serving is about 4 ounces before cooking, roughly the size and thickness of your palm.',
  fishHowOften: [
    'The American Heart Association recommends eating fish at least twice a week, especially fatty fish like salmon, sardines, herring and Atlantic mackerel.',
    'The FDA and EPA advise 2 to 3 servings a week (8 to 12 ounces) from their Best Choices list. That advice is written for people who are pregnant, breastfeeding or might become pregnant, and for children, but the FDA says anyone can follow it. If you weigh less than about 165 pounds, they suggest smaller portions, or just 2 servings a week from Best Choices.',
    'Many pescatarians eat fish more often than that. If you do, lean on the fish the FDA names as even lower in mercury than the rest of its Best Choices list: salmon, sardines, anchovies, Atlantic mackerel, trout, shrimp, scallops, clams, oysters, crab, haddock, pollock, sole, flounder, tilapia and squid. Mix the kinds through the week instead of eating the same one every day. On fish-free days, eggs carry the meal (plus beans or yogurt if your style includes them).',
  ],
  fishStyle: 'Salmon, sardines, anchovies, cod, shrimp and clams pair well with olive oil, beans, tomatoes and grains. Canned sardines and anchovies keep the cost down.',
  fishCards: {
    salmon: 'Sheet-pan dinner or grain bowl. Fresh, frozen or canned all work.',
    sardines: 'Canned in olive oil, on toast with white beans and lemon.',
    shrimp: 'Frozen, peeled shrimp thaw in 10 minutes under cold water.',
    cod: 'Baked with tomatoes and olives. Haddock or pollock swap in easily.',
    trout: 'Baked with lemon and herbs, or flaked into a salad.',
    tuna: 'Tossed with olive oil, white beans and lemon.',
    tilapia: 'Pan-seared with tomatoes and olives. Frozen fillets work well.',
  },
  mercury: {
    best: ['Salmon', 'Sardines, anchovies, herring', 'Shrimp, scallops, clams, oysters, crab', 'Cod, haddock, pollock, hake', 'Trout (freshwater)', 'Tilapia, sole, flounder', 'Atlantic mackerel', 'Canned light tuna, including skipjack'],
    good: ['Albacore (white) tuna, canned or fresh', 'Yellowfin tuna', 'Halibut', 'Mahi mahi', 'Snapper, grouper', 'Chilean sea bass', 'Spanish mackerel'],
    avoid: ['King mackerel', 'Marlin', 'Orange roughy', 'Shark', 'Swordfish', 'Tilefish from the Gulf of Mexico', 'Bigeye tuna'],
  },
  mercuryIntro: 'Based on the FDA and EPA Advice about Eating Fish. Take it with you when you shop or order out.',
  watchNames: '<b>Watch the names.</b> "Tuna" and "mackerel" each cover several fish. Canned light tuna is a Best Choice, albacore is a Good Choice and bigeye is one to avoid. Atlantic mackerel is a Best Choice, Spanish mackerel is a Good Choice and king mackerel is one to avoid.',
  familyFish: "<b>Fish caught by family or friends.</b> Check the local advisory for that lake, river or coast. If there isn't one, the FDA says to eat just one serving that week, no more than 6 ounces for an adult, and no other fish that week.",
  pregnancy: 'Eat 2 to 3 servings a week from the Best Choices list (or 1 from Good Choices), with each serving about 4 ounces. Skip the Choices to Avoid list completely, and skip raw fish such as sushi and sashimi. Cook fish, shellfish and eggs all the way through. Your doctor or midwife can help you plan the amounts that suit you.',
  mealIntro: 'Portions are for one person. Swap any two days, or repeat a meal you liked.',
  mealIntroHidden: 'Swap any two days, or repeat a meal you liked.',
  fishSwapped: 'Because of the allergies and foods you asked us to leave out, we swapped one or more of this week\'s fish meals for a dish without fish.',
  groceryIntro: 'Everything for the 7-day plan, grouped by store section. Check off what you already have at home. Frozen fish and canned sardines, salmon and light tuna all count, and they keep longer.',
  recipesIntro: 'Each recipe serves one. Double everything to cook for two or to save a portion for tomorrow. If your meal plan lists a different portion, use the one in your plan.',
  eatingOutIntro: 'Most restaurants already serve something that fits your plan. A few simple requests make it easier.',
  atRestaurant: ["Look for fish that's grilled, baked, broiled, steamed or pan-seared.", 'Ask for vegetables or a salad in place of fries.', 'Order sauces and dressings on the side.', 'Check the low-mercury guide before you order swordfish, shark or a tuna steak.', 'Box half your meal when the portion is large.'],
  menuPicks: [
    ['Seafood restaurant', 'grilled or broiled fish, steamed clams or oysters, a side salad.'],
    ['Italian', 'grilled fish or shrimp, a green salad, roasted vegetables.'],
    ['Greek or Middle Eastern', 'grilled fish or shrimp, Greek salad, a side of olives.'],
    ['Japanese', 'grilled salmon or cooked shrimp dishes, miso soup, seaweed salad. Ask which tuna is used, since bigeye is on the avoid list.'],
    ['Mexican', 'grilled fish or shrimp, fajita-style with the vegetables, salsa and guacamole.'],
    ['Steakhouse', 'the fish of the day or shrimp, with a vegetable side.'],
    ['Diner or breakfast spot', 'eggs any style, an omelet, a side of smoked salmon if they have it.'],
  ],
  // Shellfish-free versions (gap-copy.md), used only when the original line names a
  // food the reader excluded, and only if the replacement names none itself.
  menuPicksAlt: {
    'Seafood restaurant': 'grilled or broiled fish, blackened salmon or trout, a side salad.',
    Italian: 'grilled fish or salmon, a green salad, roasted vegetables.',
    'Greek or Middle Eastern': 'grilled whole fish or salmon, Greek salad, a side of olives.',
    Japanese: 'grilled or teriyaki salmon, miso soup, seaweed salad. Ask which tuna is used, since bigeye is on the avoid list.',
    Mexican: 'grilled mahi-mahi or the fish of the day, fajita-style with the vegetables, salsa and guacamole.',
    Steakhouse: 'the fish of the day or grilled salmon, with a vegetable side.',
  },
  travelAlt: { 'Grocery stores sell cooked shrimp, smoked salmon and ready-made salads.': 'Grocery stores sell smoked salmon, hard-boiled eggs and ready-made salads.' },
  travel: ['Pack pouches of salmon or tuna, which need no fridge until opened.', 'Hard-boiled eggs and cheese travel well in a small cooler bag.', 'At hotel breakfasts, start with the eggs.', 'Grocery stores sell cooked shrimp, smoked salmon and ready-made salads.', 'Carry a refillable water bottle.', 'If a meal goes off plan, get back to it at the next one.'],
  sayLines: ['Could I have the fish grilled, with vegetables instead of the fries?', "Is the fish cooked in butter or oil? Either is fine, I'd just like to know.", 'Could I get the sauce on the side, please?'],
  eatingOutStyle: 'Beans, lentils, whole grains and fruit are all on your menu, so a lentil soup, a grain bowl or hummus with vegetables makes an easy side. Ask for olive oil and lemon on your fish.',
  doctorIntro: 'Bring this page to your next appointment. Write the answers on the lines.',
  footer: 'This plan is general education based on the answers you gave. It is not medical advice and it does not replace care from your doctor.',
  howMade: 'This plan was put together by software from the answers you gave, with meals and portions calculated using nutrition values from USDA FoodData Central. No AI wrote any part of it, and it was not written by a doctor or a dietitian.',
};

// Doctor questions (doctor-questions.md). `when` narrows who sees a question; it only
// ever sharpens what the reader is told and never decides whether a number prints.
const DOCTOR_QUESTIONS = [
  { q: 'Is this eating style a good fit for my health and the medicines I take?' },
  { q: 'What daily calories and protein should I aim for?', when: v => v.hidden },
  { q: 'Which blood tests should I have before I start, and when should we check them again? (For example: cholesterol, blood sugar, kidney function.)' },
  { q: 'My kidneys: is it safe for me to eat more protein than I do now?' },
  { q: 'Do any of my medicines need to be watched or adjusted if I change how I eat, especially my blood pressure or diabetes medicines?' },
  { q: 'If I eat fewer carbs, could any of my diabetes medicines make my blood sugar drop too low?', when: v => v.ctx.glucoseLowering },
  { q: 'I take a blood thinner. Should I keep leafy greens, olive oil and other foods steady from week to week?', when: v => v.ctx.anticoagulant },
  { q: 'Is a fish oil or omega-3 supplement safe with my medicines, especially a blood thinner?' },
  { q: 'Do any of my medicines interact with grapefruit or grapefruit juice?' },
  { q: 'Do I need vitamin D, B12, calcium or another supplement on this eating style?' },
];
const PREGNANCY_QUESTION = "If you're pregnant, breastfeeding or might become pregnant, add: Which fish should I eat, how much, and what should I avoid?";

// sources.md, plus USDA FoodData Central (every nutrition value in the plan, api/pd-foods.js).
const SOURCES = [
  ['U.S. Food and Drug Administration and U.S. Environmental Protection Agency.', 'Advice about Eating Fish (revised October 2021).', 'fda.gov/food/consumers/advice-about-eating-fish'],
  ['U.S. Food and Drug Administration.', 'Questions & Answers from the FDA/EPA Advice about Eating Fish for Those Who Might Become or Are Pregnant or Breastfeeding and Children Ages 1 - 11 Years.', 'fda.gov/food/consumers/questions-answers-fdaepa-advice-about-eating-fish-those-who-might-become-or-are-pregnant-or'],
  ['American Heart Association.', 'Fish and Omega-3 Fatty Acids (last reviewed August 23, 2024).', 'heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids'],
  ['National Institutes of Health, Office of Dietary Supplements.', 'Omega-3 Fatty Acids: Fact Sheet for Consumers.', 'ods.od.nih.gov/factsheets/Omega3FattyAcids-Consumer'],
  ['MedlinePlus, U.S. National Library of Medicine.', 'Taking warfarin (Coumadin).', 'medlineplus.gov/ency/patientinstructions/000292.htm'],
  ['U.S. Food and Drug Administration.', "Grapefruit Juice and Some Drugs Don't Mix.", 'fda.gov/consumers/consumer-updates/grapefruit-juice-and-some-drugs-dont-mix'],
  ['MedlinePlus, U.S. National Library of Medicine.', 'Low blood sugar.', 'medlineplus.gov/ency/article/000386.htm'],
  ['National Institute of Diabetes and Digestive and Kidney Diseases.', 'Healthy Eating for Adults with Chronic Kidney Disease.', 'niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease'],
  ['U.S. Department of Agriculture, Agricultural Research Service.', 'FoodData Central (SR Legacy).', 'fdc.nal.usda.gov'],
];

// recipes-pesco-mediterranean.md. `dish` ties a recipe to the plan's dish so the label
// can name the day it lands on; `foods` are the plan foods it uses, so a recipe built
// on an excluded food is dropped with that food; `lines` are also checked as text.
const RECIPES = [
  { dish: 'sheet-pan-salmon', slot: 'dinner', title: 'Sheet-pan salmon with lemon and green beans', time: '30 min', tool: '1 sheet pan',
    foods: ['salmon', 'green_beans', 'potatoes', 'olive_oil', 'lemon'],
    lines: ['4 oz salmon fillet', '1½ cups green beans, trimmed', '½ cup small potatoes, halved', '1 tbsp extra-virgin olive oil', '½ lemon, sliced', 'Salt, pepper and a pinch of garlic powder'],
    steps: ['Heat the oven to 425°F. Toss the potatoes with half the oil and a pinch of salt, and roast for 10 minutes.', 'Push the potatoes to one side. Add the green beans and the salmon, drizzle with the rest of the oil and season everything.', 'Lay the lemon slices on the salmon.', 'Roast 12 to 15 minutes, until the salmon flakes easily with a fork.'],
    swap: 'Trout or arctic char cook in about the same time.' },
  { dish: 'sardine-bean-toast', slot: 'lunch', title: 'Sardine and white bean toast', time: '10 min', tool: 'A toaster, no stove',
    foods: ['sardines', 'white_beans', 'wholegrain_bread', 'lemon'],
    lines: ['1 can sardines in olive oil (about 3.75 oz), drained', '½ cup canned white beans, rinsed', '1 slice whole-grain bread', '½ lemon', 'A few thin slices of red onion', 'Fresh parsley, salt and black pepper'],
    steps: ['Toast the bread.', 'Mash the beans with a squeeze of lemon and a pinch of salt.', 'Spread the beans on the toast and lay the sardines on top.', 'Finish with the onion, parsley, another squeeze of lemon and black pepper.'],
    swap: 'Canned salmon or canned light tuna instead of sardines.' },
  { dish: 'shrimp-chickpea-skillet', slot: 'dinner', title: 'Shrimp and chickpea skillet', time: '20 min', tool: '1 skillet',
    foods: ['shrimp', 'chickpeas', 'bell_pepper', 'olive_oil', 'lemon'], shellfish: true,
    lines: ['4 oz peeled shrimp, thawed if frozen', '½ cup canned chickpeas, rinsed', '1 cup sliced bell pepper', '1 tbsp extra-virgin olive oil', '1 clove garlic, sliced', '½ tsp smoked paprika', '½ lemon, salt and pepper'],
    steps: ['Warm the oil in a skillet over medium heat. Cook the peppers for 5 minutes, until soft.', 'Add the garlic, paprika and chickpeas and stir for 2 minutes.', 'Add the shrimp and cook 2 to 3 minutes per side, until pink and opaque.', 'Season with salt and pepper and squeeze the lemon over the top.'],
    swap: 'Scallops cook the same way. Frozen peeled shrimp thaw in about 10 minutes in a bowl of cold water.' },
  { dish: 'cod-tomato-olive', slot: 'dinner', title: 'Baked cod with tomatoes and olives', time: '25 min', tool: '1 small baking dish',
    foods: ['cod', 'tomatoes', 'olives', 'olive_oil', 'bulgur'],
    lines: ['4 oz cod fillet', '1 cup cherry tomatoes, halved', '6 Kalamata olives, halved', '1 tbsp extra-virgin olive oil', '½ tsp dried oregano', '½ cup cooked farro or brown rice (precooked is fine)', 'Salt and pepper'],
    steps: ['Heat the oven to 400°F. Toss the tomatoes, olives, oil and oregano in the baking dish.', 'Nestle the cod in the middle and season it with salt and pepper.', 'Bake 15 to 18 minutes, until the cod flakes easily.', 'Warm the farro and spoon the tomatoes and pan juices over the fish and grains.'],
    swap: 'Haddock, pollock or tilapia.' },
  { dish: 'lentil-feta-salad', slot: 'lunch', title: 'Lentil, cucumber and feta salad', time: '10 min', tool: '1 bowl, no cooking',
    foods: ['lentils', 'cucumber', 'tomatoes', 'feta', 'olive_oil', 'lemon'],
    lines: ['1 cup cooked lentils (canned and rinsed is fine)', '1 cup chopped cucumber', '½ cup cherry tomatoes, halved', '1 oz feta, crumbled', '1 tbsp extra-virgin olive oil', '½ lemon', 'Fresh parsley or mint, salt and pepper'],
    steps: ['Put the lentils, cucumber and tomatoes in a bowl.', 'Whisk the oil with the lemon juice and a pinch of salt and pepper.', 'Pour the dressing over the salad and toss.', 'Top with feta and herbs.'],
    swap: 'Add a can of sardines or a hard-boiled egg to make it a bigger meal. Chickpeas work in place of lentils.' },
];

const AISLES = [
  ['Seafood', 'sea', 'Seafood', 'Counter or freezer'],
  ['Produce', 'olive', 'Produce', ''],
  ['Dairy and eggs', 'terra', 'Dairy and eggs', ''],
  ['Pantry', 'cream', 'Pantry', ''],
  ['Bakery', 'cream', 'Bread', ''],
];
const SEAFOOD_NAMES = { salmon: 'Salmon', sardines: 'Sardines', shrimp: 'Shrimp', cod: 'Cod', trout: 'Trout', tuna: 'Canned light tuna', tilapia: 'Tilapia' };
const LEGUMES = ['lentils', 'chickpeas', 'white_beans', 'hummus'];

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------
const opener = (num, word, color, title, lede) => `
    <header class="opener ${color}">
      <div class="sec-num">${num}</div>
      <div class="eyebrow">Section ${word}</div>
      <h2>${title}</h2>
      ${lede ? `<p class="lede">${lede}</p>` : ''}
    </header>`;

function renderCover(v) {
  return `
  <section class="page cover" data-pd-section="cover">
    <div class="cover-top">
      <div class="brand">
        <div class="brand-name">Pesco<em>Dial</em></div>
        <div class="brand-tag">Personal plan</div>
      </div>
      <div class="cover-title">
        <div class="for">Prepared for</div>
        <h1>${esc(v.name)}</h1>
      </div>
    </div>
    <div class="cover-mid">
      <div class="photo" aria-hidden="true"></div>
      <div class="cover-style">
        <div class="label">Your eating style</div>
        <div class="style-name">${PD_REPORT_STYLE}</div>
        <p>${v.hidden ? COPY.coverSubHidden : COPY.coverSub}</p>
      </div>
    </div>
    <dl class="cover-meta">
      <div><dt>Name</dt><dd>${esc(v.name)}</dd></div>
      <div><dt>Style</dt><dd>${PD_REPORT_STYLE}</dd></div>
      <div><dt>Date</dt><dd>${esc(v.date)}</dd></div>
    </dl>
  </section>`;
}

function renderNumbers(v) {
  const notice = `
    <div class="page-body" style="padding-bottom:28px">
      <div class="notice" role="note">
        <div class="notice-icon" aria-hidden="true">!</div>
        <div><div class="kicker">Before you begin</div><p>${COPY.doctorBox}</p></div>
      </div>
    </div>`;
  const plate = `
      <div class="plate">
        <div class="plate-disc" role="img" aria-label="Plate: half vegetables, a quarter protein, a quarter grains or beans"></div>
        <div>
          <h3>Build every plate the same way</h3>
          <ul>
            ${COPY.plate.map(([c, b, t]) => `<li><i class="dot" style="background:${c}"></i><b>${b}</b> ${t}</li>`).join('\n            ')}
            <li>${COPY.plateFinish}</li>
          </ul>
        </div>
      </div>`;

  if (v.hidden) {
    return `
  <section class="page" data-pd-section="numbers">${notice}
    ${opener('01', 'one', 'sea', 'Your plan focuses on food choices', '')}
    <div class="page-body">
      <div class="calm-note" role="note" style="display:grid">
        <div class="calm-mark" aria-hidden="true">~</div>
        <div>
          <p>${COPY.numbersHidden}</p>
          ${v.ctx.anticoagulant ? `<p>${COPY.bloodThinner}</p>` : ''}
        </div>
      </div>${plate}
    </div>
  </section>`;
  }

  const m = v.macros;
  const kc = { p: m.protein_grams * 4, f: m.fat_grams * 9, c: m.carbs_grams * 4 };
  const tot = kc.p + kc.f + kc.c;
  let pp = Math.round(100 * kc.p / tot), fp = Math.round(100 * kc.f / tot);
  const cp = 100 - pp - fp;
  const card = (cls, label, value, unit, note) => `
        <div class="num-card ${cls}">
          <div class="num-label">${label}</div>
          <div class="num-value"><span>${value}</span><span class="num-unit">${unit}</span></div>
          <div class="num-note">${note}</div>
        </div>`;
  return `
  <section class="page" data-pd-section="numbers">${notice}
    ${opener('01', 'one', 'sea', 'Your daily numbers', COPY.numbersIntro)}
    <div class="page-body">
      <div class="numbers">
        <div class="num-card cal">
          <div><div class="num-label">Calories per day</div><div class="num-value">${fmtInt(m.calories)}</div></div>
          <div class="num-note">${COPY.cardNotes.cal}</div>
        </div>${card('pro', 'Protein', fmtInt(m.protein_grams), 'g', COPY.cardNotes.pro)}${card('fat', 'Fat', fmtInt(m.fat_grams), 'g', COPY.cardNotes.fat)}${card('carb', 'Carbs', fmtInt(m.carbs_grams), 'g', COPY.cardNotes.carb)}${card('fib', 'Fiber', fmtInt(v.avgFiber), 'g', 'Your 7-day plan averages this. ' + COPY.cardNotes.fib)}
      </div>
      ${renderWarningBox(v)}
      <div class="split">
        <h4>Where your calories come from</h4>
        <div class="split-bar" role="img" aria-label="Protein ${pp} percent, fat ${fp} percent, carbs ${cp} percent">
          <span style="width:${pp}%;background:var(--terra)"></span><span style="width:${fp}%;background:var(--olive)"></span><span style="width:${cp}%;background:#c79a3e"></span>
        </div>
        <div class="split-key">
          <span><i class="dot" style="background:var(--terra)"></i>Protein <b>${pp}%</b></span>
          <span><i class="dot" style="background:var(--olive)"></i>Fat <b>${fp}%</b></span>
          <span><i class="dot" style="background:#c79a3e"></i>Carbs <b>${cp}%</b></span>
        </div>
      </div>
      <div>
        <h3>How to read each number</h3>
        <ul class="read-list">${COPY.howToRead.map(([k, t]) => `<li><b>${k}:</b> ${t}</li>`).join('')}</ul>
      </div>${plate}
    </div>
  </section>`;
}

/**
 * Which concerns this reader's answers raise (Brew, 2026-10-04). Empty for a reader
 * who told us nothing that needs one, and then no warning box renders at all.
 * Keyword flags here only choose what the reader is told; they never decide whether
 * a number prints (pdNumbersHidden does that, from the blunt signals).
 */
export function pdConcerns(v) {
  const ctx = v.ctx || {};
  const c = [];
  if (ctx.anticoagulant) c.push('bloodThinner');
  if (ctx.glucoseLowering) c.push('diabetes');
  if (ctx.hasDeclaredMedications && !ctx.anticoagulant && !ctx.glucoseLowering) c.push('otherMedicine');
  if (v.maintenance) c.push('maintenance');
  return c;
}

function renderWarningBox(v) {
  const concerns = pdConcerns(v);
  if (!concerns.length) return '';
  return `
      <div class="warn-box" role="note" data-pd-warning>
        <div class="notice-icon" aria-hidden="true">!</div>
        <div>
          <h3>${COPY.warn.heading}</h3>
          <p>${COPY.warn.intro}</p>
          <ul>${concerns.map(k => `<li data-concern="${k}">${COPY.warn[k]}</li>`).join('')}</ul>
          <p>${COPY.warn.close}</p>
        </div>
      </div>`;
}

function seafoodOf(meal) {
  const it = meal.items.find(i => SEAFOOD_NAMES[i.food]);
  return it ? it.food : null;
}

function renderFishPlan(v) {
  const strip = v.week.days.map(d => {
    const fishMeal = d.meals.find(m => m.fish);
    if (fishMeal) {
      const sp = seafoodOf(fishMeal);
      return `<div class="day fish${sp === 'shrimp' ? ' shell' : ''}"><div class="d">${d.day}</div><div class="f">${esc(SEAFOOD_NAMES[sp] || 'Fish')}</div><div class="m">${cap(fishMeal.slot)}</div></div>`;
    }
    const dinner = d.meals.find(m => m.slot === 'dinner');
    const foods = (dinner ? dinner.items : []).map(i => i.food);
    const anchor = foods.includes('eggs') ? 'Eggs' : foods.some(f => LEGUMES.includes(f)) ? 'Beans' : 'Vegetables';
    return `<div class="day"><div class="d">${d.day}</div><div class="f">${anchor}</div><div class="m">Fish-free</div></div>`;
  }).join('\n        ');
  const counts = new Map();
  for (const d of v.week.days) for (const m of d.meals) if (m.fish) {
    const sp = seafoodOf(m);
    if (sp) counts.set(sp, (counts.get(sp) || 0) + 1);
  }
  const cards = [...counts.entries()].map(([sp, n]) =>
    `<div class="fish-card"><div class="times">${n}<small>a week</small></div><div><h4>${esc(SEAFOOD_NAMES[sp])}</h4><p>${COPY.fishCards[sp] || ''}</p></div></div>`).join('\n        ');
  const tier = (cls, title, sub, items) => `
          <div class="tier ${cls}">
            <div class="tier-head"><h4>${title}</h4><div class="tier-sub">${sub}</div></div>
            <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
          </div>`;
  return `
  <section class="page" data-pd-section="fish">
    ${opener('02', 'two', 'olive', 'Your weekly fish plan', COPY.fishIntro)}
    <div class="page-body">
      <div class="week-strip">
        ${strip}
      </div>
      <div class="fish-list">
        ${cards}
      </div>
      <p class="fineprint">${COPY.fishStyle}</p>
      <div style="display:grid;gap:12px">
        <h3>How often to eat fish</h3>
        ${COPY.fishHowOften.map(p => `<p>${p}</p>`).join('\n        ')}
      </div>
      <div style="display:grid;gap:12px">
        <h3>Low-mercury guide</h3>
        <p class="fineprint">${COPY.mercuryIntro}</p>
        <div class="mercury">${tier('best', 'Best choices', '2 to 3 servings a week', COPY.mercury.best)}${tier('good', 'Good choices', '1 serving a week, in place of Best Choices', COPY.mercury.good)}${tier('avoid', 'Avoid', 'Highest in mercury', COPY.mercury.avoid)}
        </div>
        <p class="fineprint">${COPY.watchNames}</p>
        <p class="fineprint">${COPY.familyFish}</p>
      </div>
      <div class="calm-note" role="note" style="display:grid">
        <div class="calm-mark" aria-hidden="true">~</div>
        <div><h3>If you're pregnant, breastfeeding or might become pregnant</h3><p>${COPY.pregnancy}</p></div>
      </div>
    </div>
  </section>`;
}

function renderMealPlan(v) {
  const rows = v.week.days.map(d => {
    const cells = ['breakfast', 'lunch', 'dinner', 'snack'].map(slot => {
      const m = d.meals.find(x => x.slot === slot);
      const portion = v.hidden ? '' : `<span class="portion">${esc(m.items.map(i => formatQty(i.qty, i.unit, i.name)).join(', '))}</span>`;
      return `<td data-label="${cap(slot)}"${m.fish ? ' class="fishy"' : ''}>${m.fish ? '<span class="tag">Fish</span><br>' : ''}<b>${esc(m.name)}</b>${portion}</td>`;
    }).join('');
    return `<tr><th scope="row">${d.day}</th>${cells}</tr>`;
  }).join('\n          ');
  return `
  <section class="page" data-pd-section="meals">
    ${opener('03', 'three', 'terra', 'Your 7-day meal plan', v.hidden ? COPY.mealIntroHidden : COPY.mealIntro)}
    <div class="page-body">
      <div class="legend"><span class="tag" style="margin:0">Fish</span> marks your fish meals</div>
      ${v.week.warnings.length ? `<p class="fineprint">${COPY.fishSwapped}</p>` : ''}
      <table class="meal-table">
        <thead><tr><th scope="col">Day</th><th scope="col">Breakfast</th><th scope="col">Lunch</th><th scope="col">Dinner</th><th scope="col">Snack</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </section>`;
}

function renderGrocery(v) {
  const aisles = AISLES.filter(([sec]) => v.grocery[sec] && v.grocery[sec].length).map(([sec, color, label, sub]) => {
    const items = v.grocery[sec].map(it => {
      const qty = v.hidden ? '' : esc(formatQty(it.qty, it.unit, '').trim());
      return `<li><span class="box"></span><span>${esc(cap(it.name))}</span><span class="qty">${qty}</span></li>`;
    }).join('\n            ');
    return `
        <div class="aisle ${color}">
          <h3>${label}${sub ? ` <small>${sub}</small>` : ''}</h3>
          <ul class="check">
            ${items}
          </ul>
        </div>`;
  }).join('');
  return `
  <section class="page" data-pd-section="grocery">
    ${opener('04', 'four', 'cream', 'Your grocery list', COPY.groceryIntro)}
    <div class="page-body">
      <div class="grocery">${aisles}
      </div>
    </div>
  </section>`;
}

function renderRecipes(v) {
  const kept = RECIPES.filter(r => !v.isRecipeExcluded(r));
  if (!kept.length) return '';
  const firstUse = dishId => {
    for (const d of v.week.days) for (const m of d.meals) if (m.dishId === dishId) return `${DAY_LONG[d.day]} ${m.slot}`;
    return null;
  };
  const cards = kept.map((r, i) => `
        <article class="recipe">
          <div class="recipe-main">
            <div class="recipe-num">Recipe ${i + 1} · ${esc(firstUse(r.dish) || cap(r.slot))}</div>
            <h3>${esc(r.title)}</h3>
            <div class="recipe-meta"><span class="chip">${r.time}</span><span class="chip">Serves 1</span><span class="chip">${esc(r.tool)}</span></div>
            <div class="recipe-cols">
              <div><h4>You need</h4><ul>${r.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>
              <div><h4>Steps</h4><ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
            </div>
            ${v.isTextExcluded(r.swap) ? '' : `<p class="recipe-swap"><b>Swap:</b> ${esc(r.swap)}</p>`}
          </div>
        </article>`).join('');
  return `
  <section class="page" data-pd-section="recipes">
    ${opener('05', 'five', 'sea', `${COUNT_WORDS[kept.length]} easy recipe${kept.length === 1 ? '' : 's'}`, COPY.recipesIntro)}
    <div class="page-body">
      <div class="recipes">${cards}
      </div>
    </div>
  </section>`;
}

function renderEatingOut(v) {
  // Fixed copy that names a food the reader excluded is left out, never reworded.
  const ok = t => !v.isTextExcluded(t);
  const orAlt = (line, alt) => (ok(line) ? line : alt && ok(alt) ? alt : null);
  const picks = COPY.menuPicks
    .map(([k, t]) => [k, ok(`${k} ${t}`) ? t : (COPY.menuPicksAlt[k] && ok(`${k} ${COPY.menuPicksAlt[k]}`) ? COPY.menuPicksAlt[k] : null)])
    .filter(([, t]) => t);
  const travel = COPY.travel.map(l => orAlt(l, COPY.travelAlt[l])).filter(Boolean);
  return `
  <section class="page" data-pd-section="eating-out">
    ${opener('06', 'six', 'olive', 'Eating out and travel', COPY.eatingOutIntro)}
    <div class="page-body">
      <div class="out-grid">
        <div class="out-card order"><h3>At a restaurant</h3><ul>${COPY.atRestaurant.filter(ok).map(l => `<li>${l}</li>`).join('')}</ul></div>
        <div class="out-card menu"><h3>Easy menu picks</h3><ul>${picks.map(([k, t]) => `<li><b>${k}:</b> ${t}</li>`).join('')}</ul></div>
        <div class="out-card travel"><h3>When you travel</h3><ul>${travel.map(l => `<li>${l}</li>`).join('')}</ul></div>
      </div>
      <p>${COPY.eatingOutStyle}</p>
      <div style="display:grid;gap:14px">
        <h3>What to say when you order</h3>
        <div class="say-wrap">${COPY.sayLines.filter(ok).map(l => `<div class="say">${esc(l)}</div>`).join('')}</div>
      </div>
    </div>
  </section>`;
}

function renderDoctorQuestions(v) {
  const qs = DOCTOR_QUESTIONS.filter(x => !x.when || x.when(v));
  const li = q => `<li><div><p class="q">${esc(q)}</p><div class="write-lines"><i></i><i></i></div></div></li>`;
  return `
  <section class="page" data-pd-section="doctor">
    ${opener('07', 'seven', 'terra', 'Questions for your doctor', COPY.doctorIntro)}
    <div class="page-body">
      <ol class="questions">
        ${qs.map(x => li(x.q)).join('\n        ')}
        ${li('My own question:')}
      </ol>
      <p class="fineprint">${esc(PREGNANCY_QUESTION)}</p>
      <div class="visit-box">
        <h3>My visit</h3>
        <div class="visit-fields"><div>Date</div><div>Doctor</div><div>Next check-in</div></div>
      </div>
    </div>
  </section>`;
}

function renderSources(v) {
  return `
  <section class="page" data-pd-section="sources">
    ${opener('08', 'eight', 'cream', 'Sources', '')}
    <div class="page-body">
      <ol class="sources">
        ${SOURCES.map(([who, what, url]) => `<li><div><span class="src-title">${esc(who)}</span> ${esc(what)} <span class="src-url">${esc(url)}</span></div></li>`).join('\n        ')}
      </ol>
      <div class="colophon">
        <div class="mark">Pesco<em>Dial</em></div>
        <div>
          <p>${COPY.footer}</p>
          <p>${COPY.howMade}</p>
          <p>A sister site of KetoDial.com. Prepared for ${esc(v.name)} on ${esc(v.date)}.</p>
        </div>
      </div>
    </div>
  </section>`;
}

/**
 * Render the PD report sections, in order, as HTML fragments keyed 1..9.
 * The caller decides everything that matters for safety and passes it in:
 *   v.hidden           numbers withheld (no cards, no portions, no amounts)
 *   v.maintenance      numbers shown at maintenance (deficit removed); adds that line to the warning box
 *   v.macros           the macro set this reader may be shown (null when hidden)
 *   v.week / v.grocery the week and list built for this variant
 *   v.ctx              the medical context (only narrows doctor questions and notes)
 *   v.isRecipeExcluded drops a recipe that uses an excluded food
 *   v.isTextExcluded   drops a fixed copy line that names an excluded food
 */
export function renderPescoMedSections(v) {
  if (v.hidden && v.macros) throw new Error('renderPescoMedSections: numbers are hidden but a macro set was passed.');
  if (!v.hidden && !(v.macros && Number.isFinite(Number(v.macros.calories)))) {
    throw new Error('renderPescoMedSections: numbers are shown but there is no usable macro set.');
  }
  if (v.hidden && v.week.days.some(d => d.meals.some(m => m.items.some(i => i.qty != null)))) {
    throw new Error('renderPescoMedSections: numbers are hidden but the week carries quantities.');
  }
  const sections = {
    1: renderCover(v),
    2: renderNumbers(v),
    3: renderFishPlan(v),
    4: renderMealPlan(v),
    5: renderGrocery(v),
    6: renderRecipes(v),
    7: renderEatingOut(v),
    8: renderDoctorQuestions(v),
    9: renderSources(v),
  };
  for (const k of Object.keys(sections)) if (!sections[k]) delete sections[k];
  return sections;
}

/** Visible text of a fragment, for the copy gates. */
export function pdSectionText(html) {
  return String(html).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Document wrapper (theme from plan.html; fonts from Google Fonts, the same
// families the design ships as local files)
// ---------------------------------------------------------------------------
const PD_FONTS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&family=Source+Serif+4:wght@400;700&display=swap';

export const PD_REPORT_CSS = `
:root{--sea:#1d4a66;--sea-2:#2f6a8c;--sea-soft:#dfeaf0;--olive:#5f6e33;--olive-2:#7d8c47;--olive-soft:#e9edd8;--cream:#f7efdd;--cream-2:#fbf7ee;--terra:#b5552f;--terra-soft:#f5dfd3;--ink:#1d2830;--ink-2:#4a5560;--line:#ddd2ba;--display:"DM Serif Display",Georgia,serif;--serif:"Source Serif 4",Georgia,serif;--sans:"Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif;--wave:radial-gradient(circle at 10px -4px,transparent 12px,#fff 13px) 0 0/20px 12px repeat-x}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:#ebe2cd;color:var(--ink);font:400 18px/1.6 var(--sans)}
a{color:var(--sea);text-underline-offset:3px}
h1,h2,h3,h4{margin:0;line-height:1.15;text-wrap:balance;color:var(--sea)}
h2{font:400 2.5rem/1.05 var(--display)}h3{font:700 1.3rem/1.2 var(--serif)}h4{font:700 1.05rem/1.25 var(--serif)}
p{margin:0;text-wrap:pretty}ul,ol{margin:0;padding-left:1.2em}li+li{margin-top:.35em}
.toolbar{position:sticky;top:0;z-index:10;display:flex;gap:8px;justify-content:center;padding:10px 16px;background:rgba(247,239,221,.95);border-bottom:1px solid var(--line)}
.toolbar button{font:700 15px var(--sans);color:var(--terra);background:#fff;border:1.5px solid var(--terra);border-radius:999px;padding:8px 16px;min-height:44px;cursor:pointer}
.report{max-width:880px;margin:0 auto;padding:24px 14px 64px;display:grid;gap:28px}
.page{background:#fff;border-radius:4px;overflow:hidden;display:grid;align-content:start;box-shadow:0 1px 0 var(--line),0 14px 32px rgba(29,74,102,.10)}
.page-body{padding:clamp(22px,5vw,52px);display:grid;gap:30px;align-content:start}
.opener{position:relative;background:var(--accent,var(--cream));padding:clamp(26px,5vw,48px) clamp(22px,5vw,52px) clamp(34px,6vw,56px);display:grid;grid-template-columns:auto 1fr;gap:6px 24px;align-items:end}
.opener::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:12px;background:var(--wave)}
.opener .sec-num{grid-row:span 2;font:400 clamp(4rem,13vw,6.5rem)/.8 var(--display);color:var(--num,var(--terra))}
.opener .eyebrow{font:700 .78rem/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-2)}
.opener h2{color:var(--head,var(--sea))}
.opener .lede{grid-column:1/-1;margin-top:14px;font-size:1.08rem;color:var(--ink);max-width:62ch}
.opener.sea{--accent:var(--sea-soft);--num:var(--sea-2)}.opener.olive{--accent:var(--olive-soft);--num:var(--olive-2);--head:var(--olive)}.opener.terra{--accent:var(--terra-soft);--num:var(--terra);--head:var(--terra)}.opener.cream{--accent:var(--cream)}
.photo{position:relative;background:repeating-linear-gradient(135deg,rgba(29,74,102,.07) 0 10px,transparent 10px 20px),var(--cream);min-height:180px}
.cover{min-height:min(94vh,1060px);grid-template-rows:auto 1fr auto}
.cover-top{background:var(--sea);color:#fff;padding:clamp(24px,5vw,52px);display:grid;gap:clamp(40px,8vw,80px);position:relative}
.cover-top::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:12px;background:var(--wave)}
.brand{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand-name{font:400 1.6rem var(--display);color:#fff}.brand-name em{font-style:italic;color:#d8e3a8}
.brand-tag{font:700 .75rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:#bcd3e0}
.cover-title{display:grid;gap:14px;padding-bottom:20px}
.cover-title .for{font:400 1.4rem var(--display);font-style:italic;color:#f3c9b5}
.cover-title h1{font:400 clamp(3rem,10vw,5.4rem)/.95 var(--display);color:#fff;letter-spacing:-.01em;overflow-wrap:anywhere}
.cover-mid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}.cover-mid .photo{min-height:300px}
.cover-style{padding:clamp(24px,5vw,44px);display:grid;gap:16px;align-content:center;background:var(--cream-2)}
.cover-style .label{font:700 .78rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--olive)}
.cover-style .style-name{font:400 clamp(1.8rem,5vw,2.4rem)/1.05 var(--display);color:var(--olive)}
.cover-style p{color:var(--ink-2)}
.cover-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:3px solid var(--terra);margin:0}
.cover-meta>div{padding:18px clamp(18px,4vw,32px);border-left:1px solid var(--line)}.cover-meta>div:first-child{border-left:0}
.cover-meta dt{font:700 .75rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--terra)}
.cover-meta dd{margin:4px 0 0;font:700 1.1rem var(--serif);color:var(--ink)}
@media (max-width:640px){.cover-mid{grid-template-columns:1fr}.cover-mid .photo{min-height:120px}.cover-meta{grid-template-columns:1fr}.cover-meta>div{border-left:0;border-top:1px solid var(--line)}}
.notice{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;background:var(--terra-soft);border:2px solid var(--terra);border-radius:10px;padding:22px 24px}
.notice-icon{width:52px;height:52px;border-radius:50%;background:var(--terra);color:#fff;display:grid;place-items:center;font:400 1.9rem var(--display)}
.notice .kicker{font:700 .78rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--terra);margin-bottom:4px}
.notice p{font:700 1.1rem/1.45 var(--sans);color:var(--ink)}
.warn-box{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start;background:var(--terra-soft);border:2px solid var(--terra);border-radius:10px;padding:22px 24px;break-inside:avoid}
.warn-box h3{font:400 1.6rem/1.1 var(--display);color:var(--terra);margin-bottom:10px}
.warn-box p{font-size:1.05rem}.warn-box ul{margin:12px 0;padding-left:1.2em}.warn-box li{font-size:1.05rem}
.numbers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.num-card{border-radius:10px;padding:18px 18px 20px;display:grid;gap:6px;align-content:start;background:var(--bg);border-top:6px solid var(--bar)}
.num-card.cal{grid-column:1/-1;background:var(--sea);color:#fff;border:0;grid-template-columns:1fr auto;align-items:center;padding:24px 26px}
.num-card.cal .num-label{color:#bcd3e0}.num-card.cal .num-value{color:#fff;font-size:clamp(3.4rem,10vw,4.6rem)}.num-card.cal .num-note{color:#d6e4ec;text-align:right;max-width:22ch}
.num-card.pro{--bg:var(--terra-soft);--bar:var(--terra)}.num-card.fat{--bg:var(--olive-soft);--bar:var(--olive)}.num-card.carb{--bg:var(--cream);--bar:#c79a3e}.num-card.fib{--bg:var(--sea-soft);--bar:var(--sea-2)}
.num-label{font:700 .8rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.num-value{font:400 2.8rem/1 var(--display);color:var(--ink)}.num-unit{font:400 1rem var(--sans);color:var(--ink-2);margin-left:4px}
.num-note{font-size:.95rem;color:var(--ink-2)}
@media (max-width:640px){.numbers{grid-template-columns:repeat(2,minmax(0,1fr))}.num-card.cal{grid-template-columns:1fr}.num-card.cal .num-note{text-align:left}}
.split{display:grid;gap:10px}.split-bar{display:flex;height:22px;border-radius:999px;overflow:hidden}.split-bar span{display:block}
.split-key{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:.95rem;color:var(--ink-2)}.split-key b{color:var(--ink)}
.dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px}
.read-list{margin-top:10px}
.calm-note{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start;background:var(--olive-soft);border-radius:12px;padding:30px}
.calm-mark{width:56px;height:56px;border-radius:50%;background:var(--olive);color:#fff;display:grid;place-items:center;font:400 1.8rem var(--display)}
.calm-note h3{font:400 1.6rem/1.1 var(--display);color:var(--olive);margin-bottom:10px}
.calm-note p{font-size:1.08rem}.calm-note p+p{margin-top:10px;color:var(--ink-2)}
.plate{display:grid;grid-template-columns:170px 1fr;gap:28px;align-items:center;background:var(--cream-2);border-radius:12px;padding:24px}
.plate-disc{width:160px;height:160px;border-radius:50%;border:6px solid #fff;box-shadow:0 0 0 1px var(--line);background:conic-gradient(var(--olive-2) 0 50%,var(--sea-2) 50% 75%,#c79a3e 75% 100%)}
.plate h3{margin-bottom:10px}.plate ul{list-style:none;padding:0;display:grid;gap:6px}.plate li{margin:0}
@media (max-width:560px){.plate{grid-template-columns:1fr;justify-items:start}}
.week-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.day{border-radius:10px;padding:12px 8px 14px;text-align:center;background:var(--cream-2);border:1.5px dashed var(--line);display:grid;gap:6px;align-content:start;min-height:104px}
.day .d{font:700 .78rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.day .f{font:400 1.15rem/1.1 var(--display);color:var(--ink-2)}.day .m{font-size:.8rem;color:var(--ink-2)}
.day.fish{background:var(--sea);border:0}.day.fish .d,.day.fish .m{color:#bcd3e0}.day.fish .f{color:#fff}.day.fish.shell{background:var(--sea-2)}
@media (max-width:640px){.week-strip{grid-template-columns:repeat(4,minmax(0,1fr))}}
.fish-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.fish-card{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;padding:16px 18px;border:1px solid var(--line);border-radius:10px}
.times{font:400 2.4rem/.9 var(--display);color:var(--terra);min-width:44px}
.times small{display:block;font:700 .7rem var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);margin-top:4px}
.fish-card h4{font-size:1.2rem;margin-bottom:4px}.fish-card p{color:var(--ink-2);font-size:.98rem}
@media (max-width:640px){.fish-list{grid-template-columns:1fr}}
.mercury{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:12px;overflow:hidden;border:1px solid var(--line)}
.tier{padding:20px;display:grid;gap:10px;align-content:start}
.tier-head{display:grid;gap:2px;padding-bottom:10px;border-bottom:2px solid currentColor}
.tier-head h4{font:400 1.5rem/1.05 var(--display);color:inherit}.tier-sub{font:700 .82rem var(--sans)}
.tier ul{list-style:none;padding:0;color:var(--ink)}.tier li{margin:0;padding:4px 0;border-bottom:1px dotted var(--line)}
.tier.best{background:var(--olive-soft);color:var(--olive)}.tier.good{background:var(--sea-soft);color:var(--sea)}.tier.avoid{background:var(--terra-soft);color:var(--terra)}
.tier.avoid li{text-decoration:line-through;text-decoration-color:rgba(181,85,47,.5)}
@media (max-width:680px){.mercury{grid-template-columns:1fr}}
.fineprint{font-size:.95rem;color:var(--ink-2)}
.meal-table{width:100%;border-collapse:separate;border-spacing:0;font-size:.95rem}
.meal-table th,.meal-table td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid var(--line)}
.meal-table thead th{font:700 .78rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--terra);border-bottom:2px solid var(--terra);padding-top:0}
.meal-table tbody th{background:var(--sea);color:#fff;font:400 1.35rem var(--display);width:64px;border-bottom-color:var(--sea-2)}
.meal-table td.fishy{background:var(--sea-soft)}
.portion{display:block;color:var(--ink-2);font-size:.86rem;margin-top:3px}
.tag{display:inline-block;font:700 .68rem var(--sans);letter-spacing:.1em;text-transform:uppercase;background:var(--sea);color:#fff;padding:2px 7px;border-radius:3px;margin-bottom:4px}
.legend{display:flex;gap:10px;align-items:center;font-size:.95rem;color:var(--ink-2)}
@media (max-width:680px){.meal-table thead{display:none}.meal-table,.meal-table tbody,.meal-table tr,.meal-table th,.meal-table td{display:block;width:100%}.meal-table tr{border:1px solid var(--line);border-radius:10px;margin-bottom:16px;overflow:hidden}.meal-table tbody th{font-size:1.5rem;width:100%}.meal-table td{display:grid;grid-template-columns:90px 1fr;gap:10px;font-size:1rem}.meal-table td::before{content:attr(data-label);font:700 .75rem var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--terra);padding-top:3px}.meal-table td:last-child{border-bottom:0}}
.grocery{columns:2 280px;column-gap:28px}
.aisle{break-inside:avoid;margin-bottom:22px;border-radius:10px;overflow:hidden;border:1px solid var(--line)}
.aisle h3{display:flex;justify-content:space-between;align-items:baseline;padding:10px 16px;background:var(--hd,var(--cream));color:var(--hc,var(--sea));font:400 1.35rem var(--display)}
.aisle h3 small{font:700 .75rem var(--sans);letter-spacing:.08em;text-transform:uppercase;opacity:.85}
.aisle.sea{--hd:var(--sea);--hc:#fff}.aisle.olive{--hd:var(--olive);--hc:#fff}.aisle.terra{--hd:var(--terra);--hc:#fff}.aisle.cream{--hd:var(--cream);--hc:var(--sea)}
.check{list-style:none;padding:8px 16px 12px;display:grid}
.check li{margin:0;padding:7px 0;display:grid;grid-template-columns:22px 1fr auto;gap:12px;align-items:start;border-bottom:1px dotted var(--line)}
.check li:last-child{border-bottom:0}
.box{width:20px;height:20px;border:2px solid var(--sea);border-radius:4px;margin-top:3px;background:#fff}
.qty{color:var(--ink-2);font-size:.9rem;text-align:right}
.recipes{display:grid;gap:26px}
.recipe{border-radius:12px;overflow:hidden;border:1px solid var(--line);break-inside:avoid}
.recipe-main{display:grid;gap:14px;padding:22px 24px 24px;align-content:start}
.recipe-num{font:700 .76rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--terra)}
.recipe-main h3{font:400 1.85rem/1.05 var(--display);color:var(--sea)}
.recipe-meta{display:flex;flex-wrap:wrap;gap:8px}
.chip{font:700 .82rem var(--sans);color:var(--olive);background:var(--olive-soft);padding:4px 11px;border-radius:999px}
.recipe-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:22px}
.recipe-cols h4{font:700 .76rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--olive);margin-bottom:8px}
.recipe-cols ul{list-style:none;padding:0}.recipe-cols ul li{padding-left:14px;position:relative}
.recipe-cols ul li::before{content:"";position:absolute;left:0;top:.62em;width:6px;height:6px;border-radius:50%;background:var(--terra)}
.recipe-cols ol{padding-left:1.3em}.recipe-cols ol li::marker{font:400 1.1rem var(--display);color:var(--sea)}
.recipe-swap{font-size:.95rem;border-top:1px dashed var(--line);padding-top:12px;color:var(--ink-2)}.recipe-swap b{color:var(--terra)}
@media (max-width:680px){.recipe-cols{grid-template-columns:1fr}}
.out-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.out-card{border-radius:12px;padding:22px;display:grid;gap:12px;align-content:start;background:var(--bg)}
.out-card h3{color:var(--c);font:400 1.6rem var(--display)}.out-card ul{padding-left:1.1em}.out-card li::marker{color:var(--c)}
.out-card.order{--bg:var(--terra-soft);--c:var(--terra)}.out-card.menu{--bg:var(--sea-soft);--c:var(--sea)}.out-card.travel{--bg:var(--olive-soft);--c:var(--olive)}
@media (max-width:760px){.out-grid{grid-template-columns:1fr}}
.say-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.say{position:relative;padding:22px 22px 22px 60px;border:1.5px solid var(--sea);border-radius:12px;font:400 1.2rem/1.3 var(--display);font-style:italic;color:var(--sea)}
.say::before{content:"\\201C";position:absolute;left:16px;top:4px;font:400 4rem/1 var(--display);color:var(--terra)}
@media (max-width:640px){.say-wrap{grid-template-columns:1fr}}
.questions{list-style:none;padding:0;display:grid;gap:20px;counter-reset:q}
.questions li{counter-increment:q;display:grid;grid-template-columns:48px 1fr;gap:14px;margin:0}
.questions li::before{content:counter(q);width:44px;height:44px;border-radius:50%;background:var(--sea);color:#fff;display:grid;place-items:center;font:400 1.4rem var(--display)}
.questions .q{font:700 1.1rem/1.35 var(--serif);color:var(--ink);padding-top:8px}
.write-lines{margin-top:14px;display:grid;gap:28px}.write-lines i{display:block;border-bottom:1px solid #b9ad94}
.visit-box{border-radius:12px;background:var(--cream);padding:20px 22px;display:grid;gap:16px}.visit-box h3{font:400 1.5rem var(--display)}
.visit-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 24px}
.visit-fields div{display:grid;gap:26px;font:700 .78rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.visit-fields div::after{content:"";border-bottom:1px solid #a99d84}
@media (max-width:560px){.visit-fields{grid-template-columns:1fr}}
.sources{list-style:none;padding:0;display:grid;counter-reset:s}
.sources li{counter-increment:s;margin:0;display:grid;grid-template-columns:40px 1fr;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}
.sources li::before{content:counter(s);font:400 1.6rem/1 var(--display);color:var(--terra)}
.src-title{font-weight:700}.src-url{display:block;font-size:.9rem;color:var(--sea-2);word-break:break-word}
.colophon{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;background:var(--sea-soft);border-radius:12px;padding:20px 22px;font-size:.95rem;color:var(--ink)}
.colophon .mark{font:400 1.5rem var(--display);color:var(--sea)}.colophon .mark em{color:var(--olive)}
.colophon p+p{margin-top:6px;color:var(--ink-2)}
@page{size:letter;margin:.5in .55in .6in}
@media print{html,body{background:#fff}body{font-size:11.5pt;line-height:1.42;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none!important}.report{max-width:none;padding:0;gap:0;display:block}.page{box-shadow:none;border-radius:0;overflow:visible;break-before:page}.page:first-child{break-before:auto}.page-body{padding:18pt 0 0;gap:16pt}.opener{padding:18pt 20pt 24pt;border-radius:6pt}.opener .sec-num{font-size:54pt}h2{font-size:26pt}.opener .lede{font-size:11.5pt;margin-top:8pt}.cover{min-height:9.8in}.cover-mid .photo{min-height:3.2in}.num-value{font-size:26pt}.num-card.cal .num-value{font-size:40pt}.meal-table{font-size:9.5pt}.meal-table th,.meal-table td{padding:6pt 7pt}.meal-table tbody th{font-size:14pt}.portion{font-size:8.5pt}.recipes{gap:12pt}.recipe-main{padding:12pt 14pt;gap:8pt;font-size:10.5pt}.recipe-main h3{font-size:17pt}.recipe,.tier,.num-card,.aisle,.out-card,.questions li,.notice,.fish-card,.plate,.day,.say{break-inside:avoid}.opener{break-after:avoid}a{color:var(--ink);text-decoration:none}.grocery{columns:2}.check li{font-size:10pt;padding:4pt 0}.box{width:12pt;height:12pt;margin-top:1pt}.write-lines{gap:20pt}.week-strip{grid-template-columns:repeat(7,1fr)}.mercury{grid-template-columns:repeat(3,1fr)}.out-grid{grid-template-columns:repeat(3,1fr)}}
`;

/** Full PD document around the rendered sections. */
export function wrapPdReportHTML(sectionsHTML, { name }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Personalized ${PD_REPORT_STYLE} Plan for ${esc(name)} · PescoDial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${PD_FONTS}" rel="stylesheet">
  <style>${PD_REPORT_CSS}</style>
</head>
<body>
  <div class="toolbar" role="toolbar" aria-label="Report options"><button type="button" onclick="window.print()">Print or save PDF</button></div>
  <main class="report">
${sectionsHTML}
  </main>
</body>
</html>`;
}
