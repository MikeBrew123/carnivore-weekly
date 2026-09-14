#!/usr/bin/env node
/**
 * tests/electrolyte-self-dosing.test.mjs
 *
 * REGRESSION GUARD AGAINST UNGATED ELECTROLYTE SELF-DOSING, CW BLOG.
 *
 * Run it:
 *     node tests/electrolyte-self-dosing.test.mjs
 *     node tests/electrolyte-self-dosing.test.mjs --list   (print every match it finds)
 *
 * No dependencies, no network. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-14 a sweep found 16 live CW blog pages printing quantitative
 * sodium, potassium and magnesium dosing with no medication or condition gate.
 * The worst instances told every reader to take 4-6 g of sodium a day, to salt
 * every meal, to self-mix cream of tartar (potassium bitartrate) into water for
 * a hot run, and to read a cramp as proof they needed more salt. Potassium and
 * magnesium are renally cleared. On an ACE inhibitor, an ARB, spironolactone, a
 * loop diuretic, or with reduced kidney function, those instructions are unsafe.
 *
 * The standing rule (CLAUDE.md) is SUPPRESS, NEVER SUBSTITUTE: where a safe
 * answer needs clinical judgement, the number is removed and the reader is
 * routed to a clinician. It is never replaced with a gentler number.
 *
 * ---------------------------------------------------------------------------
 * THE HARD PART: A NUMBER IS NOT AUTOMATICALLY A DOSE
 * ---------------------------------------------------------------------------
 * "A 10 oz ribeye gives you roughly 700 to 800 mg of potassium" is a food fact
 * and must survive. "Take 300-400 mg of magnesium glycinate" is a dose and must
 * not. A guard that cannot tell them apart is useless: it either fires on every
 * nutrition article or it fires on nothing.
 *
 * So classification is by GRAMMAR, not by the presence of a number:
 *   - an INTAKE VERB or TARGET NOUN near the figure  -> dose
 *   - a COMPOSITION CUE near the figure ("per 100 g",
 *     "per serving", "contains", "gives you")        -> food fact, allowed
 *   - composition cue wins ties, because a sentence that says what is in a
 *     food is describing the food even if it also says "you get"
 *
 * The FIXTURES block at the bottom proves that distinction in both directions
 * and is itself asserted, so the classifier cannot silently rot into a
 * rubber stamp.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIST = process.argv.includes('--list');

let failures = [];
function check(name, cond, detail) {
  if (!cond) failures.push({ name, detail });
}

// ---------------------------------------------------------------------------
// classifier
// ---------------------------------------------------------------------------

const MINERAL = '(?:sodium|potassium|magnesium|salt|lite\\s?salt|no\\s?salt|electrolytes?)';
const QTY = '[0-9][0-9,.]*\\s*(?:(?:-|–|to)\\s*[0-9][0-9,.]*\\s*)?(?:mg|g|grams?|tsp|teaspoons?)';

// verbs and nouns that turn a figure into an instruction
// NOTE on "supplement": it is an intake VERB ("supplement 300 mg of magnesium") and a
// noun ("read the label on a supplement"). Matching the noun made the guard fire on
// label-reading advice, which is exactly the safe action we want pages to give. A
// determiner in front means it is the noun.
const INTAKE = /\b(?:take|add|(?<!\b(?:a|an|the|any|your|my|this|that|each|no|per|dietary|potassium|mineral|one)\s)supplement|consume|aim for|target|targets|hit|drink|dissolve|mix|load|loading|dose|dosing|get in|shoot for|need(?:s)?|require(?:s)?)\b/i;
const TARGETY = /\b(?:daily|per day|a day|each day|every day|per hour|an hour|hourly|per meal|every meal|before bed|at night|in the (?:evening|morning)|with (?:breakfast|dinner|your last meal)|first thing|pre-?(?:run|wod|race|workout)|post-?(?:run|wod|race|workout)|throughout)\b/i;

// cues that mark a figure as describing food composition
const COMPOSITION = /\b(?:per\s*(?:100\s*(?:g|grams?)|serving|oz|ounce|lb|pound|cup|tablespoon|tbsp|packet|scoop|stick|capsule)|contains?|gives? you|provides?|has about|is about|roughly|worth of|in a\b|of cooked|content)\b/i;

// A product LABEL PANEL is a disclosure, not a recommendation. Sarah's Batch 2A
// ruling: the panels are what let a reader tell a sodium-only product from a
// potassium-containing one before she buys, which is the decision that routes her
// to a pharmacist. Signature: a per-unit header and/or "(from <ingredient>)"
// source attributions. Safe ONLY while the page supplies no daily total to divide
// by, which PACKET_COUNT and the DOSE classifier enforce separately.
const LABEL_PANEL = /\bper\s*(?:packet|scoop|stick|serving|capsule)\b|\bscoop\)|\bpacket\)|\(from\s+[a-z][^)]{2,90}\)/i;

// A regulatory CEILING imposed by someone else. "The FDA limits OTC potassium to
// 99 mg per dose" is the opposite of an instruction: it argues that bulk powder
// sits outside the rules that make pills safe.
// A CAUTIONARY NARRATIVE describes harm that happened, not a preparation to copy.
// Brew required the overdose story be preserved ("he accidentally put 8 teaspoons of
// potassium in a quart of bone broth instead of 1/8 teaspoon"), and it is the single
// most persuasive anti-DIY content on the page. A guard that strips it would be
// deleting the warning and keeping nothing.
const CAUTIONARY = /\b(?:accident(?:al|ally)?|by mistake|instead of|overdose|poisoning|hospital|911|emergency room|ER\b|nearly died|thought he was having|toxic|went wrong|mixed up|misread)\b/i;

// THE 99 mg CLAIM. Corrected 2026-09-14 after Brew checked it against NIH ODS.
// Most potassium DIETARY SUPPLEMENTS provide no more than 99 mg per serving because
// manufacturers VOLUNTARILY settled there. FDA has NOT ruled that supplements above
// 99 mg need a warning. FDA's warning requirement is narrower: certain oral potassium
// DRUG products above 99 mg per tablet. Calling 99 mg an "FDA cap" borrows a
// regulator's authority for a number that is an industry convention, and it invites
// the reader to treat a label amount as a personal allowance. This guard flags the
// false framing while leaving the accurate explanation legal.
const FALSE_REGULATORY_CAP = new RegExp(
  '(?:fda|regulator[s]?|law|legally)[^.]{0,70}(?:limits?|caps?|restricts?|allows?|permits?)[^.]{0,70}99\\s*mg'
  + '|99\\s*mg[^.]{0,50}(?:cap|ceiling|legal limit|maximum|max\\b)'
  + '|(?:capped|limited|restricted)\\s*(?:at|to)\\s*99\\s*mg'
  + '|(?:the\\s*)?99\\s*mg\\s*(?:limit|cap)\\b'
  + '|what a regulator will allow',
  'i',
);

// REFUSAL LANGUAGE. A sentence whose job is to decline to give a dose is the
// safest content on the page, and it necessarily names the thing it is refusing.
// This guard has now fired on refusal sentences four separate times ("I'm not going
// to print a daily potassium target on this page", "I used to recommend a measured
// amount of cream of tartar here, and I've removed it"). Exempting the PAGES would
// have hidden the real defects on them; the exemption belongs to the CLASS.
const REFUSAL = /\b(?:not going to (?:print|give|hand|put|publish|recommend|tell|say|name)|won'?t (?:print|give|hand|put|publish|tell|say|name)|we do not publish|I don't publish|no (?:daily )?(?:milligram |mg )?target|isn't a (?:dose|target|number)|I've removed it|used to recommend|refuse to|declines? to|there isn't one number|no single figure)\b/i;

// PROHIBITION. A sentence that argues AGAINST an action must name the action to warn
// about it: "closing a potassium gap with a salt substitute is the move that goes
// wrong", "a teaspoon measure of it is a dose whatever the tub says". These are the
// strongest safety sentences we write, and a guard that deletes them makes pages less
// safe. Distinguished from an instruction by an explicit negative judgement on the act.
const PROHIBITION = /\b(?:goes wrong|go wrong|the move that|don't|do not|never|avoid|misleading|the trap|wrong tool|is a dose whatever|shouldn't|must not|that's the mistake|is the mistake|not the answer|a bad idea|risky|dangerous)\b/i;

// DEFINITION. "Supplementation is what you add on top of that as a pill, a powder or
// a salt substitute" defines a category; it does not tell anyone to do it. The page
// uses that definition to draw the food-vs-supplement line the whole repair rests on.
const DEFINITION = /\b(?:is what you|are what you|means\b|refers to|the difference between|is the term|describes what|that's the distinction)\b/i;

const REGULATORY = /\b(?:FDA|regulator|regulators|capped at|caps? (?:them|it|these)|limits?\b[^.]{0,30}\bto\b|legal limit|over-the-counter[^.]{0,30}(?:capped|limited)|ruled unsafe|drug products?|small bowel lesions|carry a warning)\b/i;
// physiological LOSS, not intake (sweat rates). Allowed: it argues against dosing.
const LOSS = /\b(?:loss|lose[sn]?|losing|excrete[sd]?|sweat(?:ing|s)? (?:out|rate)|through sweat|runs anywhere)\b/i;

function sentences(text) {
  return text.split(/(?<=[.!?])\s+/);
}

/** Returns array of {sentence, kind} for every mineral+quantity sentence. */
function classify(text) {
  const near = new RegExp(`(?:${QTY})[^.]{0,60}?${MINERAL}|${MINERAL}[^.]{0,60}?(?:${QTY})`, 'i');
  const out = [];
  for (const s of sentences(text)) {
    if (!near.test(s)) continue;
    let kind;
    if (COMPOSITION.test(s) || LOSS.test(s) || LABEL_PANEL.test(s) || REGULATORY.test(s)) kind = 'food-or-loss';
    else if (INTAKE.test(s) || TARGETY.test(s)) kind = 'DOSE';
    else kind = 'ambiguous';
    out.push({ sentence: s.trim().replace(/\s+/g, ' '), kind });
  }
  return out;
}

// symptom-based self-treatment: "if you cramp, it's sodium" / "probably low"
const SYMPTOM_SELF_DX =
  /\b(?:if you(?:'re| are)?\s*(?:cramp|feel|get|getting|experiencing)[^.]{0,80}?(?:it(?:'s| is)\s*(?:almost always|usually|probably)|you(?:'re| are)\s*(?:probably|likely))[^.]{0,40}?(?:sodium|potassium|magnesium|salt|low)|(?:cramp|headache)[^.]{0,50}?(?:means|signals|=)\s*(?:you need|more)\s*(?:salt|sodium|potassium|magnesium))/i
// second shape, added after a mutation test proved the first missed it: a symptom or
// symptom list, a colon or dash, then a mineral remedy. "Night cramps or 3am waking:
// a small salty drink before bed often settles both."
const SYMPTOM_REMEDY_MAP = /\b(?:cramp\w*|waking|wake\w*|headaches?|fatigue|brain fog|palpitations?|twitch\w*|insomnia|restless)\b[^.!?]{0,60}?[:\u2014-]\s*[^.!?]{0,80}?\b(?:salt|salty|sodium|potassium|magnesium|electrolytes?)\b/i;

// DIFFERENTIAL. The opposite of a symptom-remedy map: a sentence that lists several
// possible causes for a symptom and says you cannot tell them apart. This is the
// content the repairs deliberately ADDED, and the first version of SYMPTOM_REMEDY_MAP
// fired on it, which would have made the guard demand we delete the safest sentences
// on the page.
const DIFFERENTIAL = /\b(?:feel identical|feels? the same|can'?t tell|cannot tell|no way to tell|get(?:s)? blamed|all produce|all feel|several (?:causes|things)|more than one (?:cause|thing)|and plenty of things|(?:isn'?t|are\s?n'?t|not) specific enough)\b/i;

// A DAILY FIGURE WITH AN AIM VERB, even when no mineral is named. Found by mutation:
// "Aim for about 2,600 mg a day for women and 3,400 mg for men" names no mineral, so
// the mineral-adjacency classifier never looked at it. On these pages a bare four-digit
// mg-per-day figure is a mineral target whether or not the mineral is repeated.
const AIM_DAILY_FIGURE = /\b(?:aim for|target|shoot for|go for|hit)\b[^.!?]{0,50}?[0-9][0-9,]{2,}\s*mg\b|[0-9][0-9,]{2,}\s*mg\s*(?:a day|per day|daily)\s*for\s*(?:women|men|adults?)/i;

// blanket instruction to salt everything
const SALT_EVERY_MEAL = /\bsalt (?:every meal|everything|all your food)\b|\b(?:1|one|1-2|two)\s*(?:-|to)?\s*(?:2\s*)?(?:tsp|teaspoons?)\s*per meal\b/i;

// per-hour mineral prescription
const PER_HOUR_MINERAL = new RegExp(`(?:${QTY})[^.]{0,40}?(?:sodium|potassium|magnesium)[^.]{0,40}?\\bper hour\\b|\\bper hour\\b[^.]{0,60}?(?:${QTY})[^.]{0,30}?(?:sodium|potassium|magnesium)`, 'i');

// potassium / salt-substitute self-dosing
const POTASSIUM_SELF_DOSE = new RegExp(`(?:${INTAKE.source})[^.]{0,60}?(?:potassium (?:chloride|citrate|supplement|pill|powder)|lite\\s?salt|no\\s?salt|salt substitute)|(?:potassium (?:chloride|citrate|supplement|powder)|lite\\s?salt)[^.]{0,40}?(?:${QTY})`, 'i');

// A DIY electrolyte RECIPE: two or more dosed mineral components combined into a
// preparation. Added for Batch 2A, where the article reproduced a reader's mix
// ("a 400 mg magnesium glycinate cap, a 200 mg potassium citrate cap, 1/2 tsp salt")
// and then totalled it into a daily intake. Neither the recipe nor the total may
// be published, and a "safer" recipe is not an acceptable replacement.
// A label PANEL is a product disclosure and must survive (Sarah's ruling, Batch 2A):
// it is what lets a reader tell a sodium-only product from a potassium-containing one
// before she buys. A RECIPE is an assembly instruction. The difference is a
// PREPARATION cue, so the multi-component branch requires one rather than firing on
// any two mineral figures in sequence.
const PREP = '(?:dissolve|mix|stir|combine|dump|scoop|shake|brew|recipe|capsules?|caps?\\b|\\badd\\b|(?:in|to) (?:a glass|water|a quart|a litre|a liter|your bottle|your water))';
const DIY_RECIPE = new RegExp(
  `${PREP}[^.]{0,110}?(?:${QTY})[^.]{0,50}?(?:potassium|magnesium|cream of tartar)`
  + `|(?:${QTY})[^.]{0,50}?(?:potassium|magnesium)[^.]{0,60}?${PREP}`
  + `|${PREP}[^.]{0,60}?cream of tartar`
  + `|cream of tartar[^.]{0,40}?(?:${QTY})`
  + `|(?:${QTY})[^.]{0,40}?cream of tartar`,
  'i',
);

// A product label amount converted into a consumption count.
const PACKET_COUNT = /\b(?:one|two|three|1|2|3)\s*(?:-|to)?\s*(?:one|two|three|1|2|3)?\s*packets?\s*(?:a|per)\s*day|\bpackets?\s*(?:a|per)\s*day|\bscoops?\s*(?:a|per)\s*day/i;

function stripHtml(h) {
  return h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// FIXTURES — the classifier must get all of these right, in both directions
// ---------------------------------------------------------------------------

const MUST_FLAG = [
  ['universal daily target', 'Most carnivore eaters need 4,000 to 6,000 mg of sodium daily.'],
  ['daily target, g form', 'Daily sodium: 5-6g on hard training days, 3-5g otherwise.'],
  ['magnesium bedtime dose', 'Take 300-400mg of magnesium glycinate before bed.'],
  ['per-hour prescription', 'Electrolyte targets per hour in the heat: 500-700mg sodium, 150-300mg potassium.'],
  ['pre-workout loading', 'Pre-WOD electrolyte drink, target 500-1000mg sodium 30 minutes before training.'],
  ['supplement imperative', 'Supplement 300-400 mg magnesium glycinate if you have cramps.'],
];

// Batch 2A defect classes: a published DIY recipe, and a label amount turned into a count.
const MUST_FLAG_RECIPE = [
  ['DIY two-component mix', 'I dump a 400 mg magnesium glycinate cap, a 200 mg potassium citrate cap and 1/2 tsp Celtic sea salt in water.'],
  ['DIY brew instruction', 'Dissolve 1/4 tsp of potassium chloride and a magnesium supplement in a litre of water.'],
  ['cream of tartar brew', 'Add salt, cream of tartar and magnesium to your bottle.'],
];
const MUST_FLAG_COUNT = [
  ['packets per day', 'Most people do well on two packets a day.'],
  ['scoops per day', 'That works out to about one scoop per day.'],
];
// MUST FLAG: 99 mg framed as a regulatory ceiling. Every one of these was live on
// carnivoreweekly.com on 2026-09-14.
const MUST_FLAG_FALSE_CAP = [
  ['FDA limits supplements', 'The FDA limits over-the-counter potassium supplements to 99 mg per dose.'],
  ['pills are capped at', 'Over-the-counter potassium pills are capped at 99 mg each.'],
  ['the 99 mg limit', "The 99 mg limit is what's safe to hand a stranger with no test results."],
  ['regulator will allow', 'That is 25 times what a regulator will allow a company to put in a pill.'],
  ['99 mg maximum', 'Supplements have a 99 mg maximum for a reason.'],
];
// MUST NOT FLAG: the accurate explanation stays legal.
const MUST_NOT_FLAG_TRUE_99 = [
  ['voluntary industry serving size',
   'Most potassium supplements give you no more than 99 mg per serving. That is a serving size the supplement industry settled on for itself, not a limit the FDA sets on supplements.'],
  ['narrow, accurate regulatory history',
   'The actual FDA rule is narrower than people assume: it covers certain oral potassium drug products above 99 mg per tablet, not the tub of powder in your cupboard.'],
  ['explicit not-a-target framing',
   "So don't read 99 mg as your number. It isn't a target, it isn't a ceiling that makes anything safe, and it isn't evidence that a bigger spoonful is fine."],
];

const MUST_NOT_FLAG_CAUTIONARY = [
  ['the overdose story must survive',
   'A man accidentally put 8 teaspoons of potassium in a quart of bone broth instead of 1/8 teaspoon.'],
  ['hospital outcome must survive',
   'Within three hours he thought he was having a stroke and called 911.'],
];
const MUST_NOT_FLAG_REFUSAL = [
  ['first-person refusal', "I'm not going to print a daily potassium target on this page."],
  ['house refusal', 'We do not publish potassium dosing of any kind on this site.'],
  ['retraction', "I used to recommend a measured amount of cream of tartar here, and I've removed it."],
  ['no-single-number', "Sodium and magnesium: there isn't one number, and anyone who gives you one is guessing."],
];
// A refusal phrase must NOT launder an actual dose sitting in the same sentence.
const MUST_FLAG_DESPITE_REFUSAL = [
  ['refusal wrapper around a real dose',
   "I'm not going to print a target, but most people do fine on 3 to 5 grams of sodium a day."],
  ['retraction that still doses',
   "I used to recommend more, so now just take 300-400 mg of magnesium glycinate daily instead."],
];
// Both of these were reintroduced by a mutation test and NOT caught by the first
// version of this guard. They are the two instructions Brew ordered removed from
// 2026-09-09, so a guard that misses them is worthless on the page it exists for.
const MUST_FLAG_GAPS = [
  ['magnesium dose with time-of-day only',
   'Magnesium: 300 to 400 mg of magnesium glycinate in the evening.'],
  ['sodium target, list form',
   'Sodium: 3 to 5 grams a day for most adults, up to 6 grams if training hard.'],
];
const MUST_NOT_FLAG_DIFFERENTIAL = [
  ['multi-cause differential',
   'Cramping mid-WOD can be sodium, but heat, dehydration, bad sleep and the side effects of something you already take all feel identical from the inside.'],
  ['cannot-tell framing',
   "Fatigue, headaches and palpitations are real, but they aren't specific enough to calculate a mineral dose from."],
];
const MUST_FLAG_AIM_DAILY = [
  ['AI figures restated as a target', 'Aim for about 2,600 mg a day for women and 3,400 mg for men.'],
  ['bare daily figure by sex', '2,600 mg a day for women and 3,400 mg for men.'],
];
const MUST_NOT_FLAG_AIM_DAILY = [
  ['food composition with a big number', 'A pound of ground beef gives you roughly 1,200 mg of potassium.'],
  ['refusal naming a figure', "I'm not going to tell you to aim for 3,400 mg a day."],
];
const MUST_FLAG_SYMPTOM_MAP = [
  ['symptom colon remedy',
   'Night cramps or 3am waking: a small salty drink before bed often settles both.'],
  ['symptom dash remedy',
   'Headaches in week one - add more sodium until they stop.'],
];
const MUST_NOT_FLAG_LABEL_READING = [
  ['label reading on a supplement, noun not verb',
   'On a supplement or a salt substitute, read the Supplement Facts panel before it goes in the basket.'],
  ['ingredient-line advice',
   'Read the ingredient line on any salt substitute, because it is mostly potassium chloride.'],
];
const MUST_NOT_FLAG_DEFINITION = [
  ['category definition',
   'Supplementation is what you add on top of that as a pill, a powder or a salt substitute.'],
  ['contrast definition',
   'The difference between food composition and supplementation is where the mineral comes from.'],
];
const MUST_NOT_FLAG_NAMED_NOT_DOSED = [
  ['cream of tartar named to warn, no dose',
   "Cream of tartar is the other route people mention. It's potassium bitartrate, and it does carry a meaningful amount per teaspoon."],
  ['FDA drug-product history',
   'Certain oral potassium chloride drug products delivering more than 99 mg were ruled unsafe after being linked to small bowel lesions.'],
];
// but a cream-of-tartar RECIPE must still fire
const MUST_FLAG_CREAM_RECIPE = [
  ['cream of tartar in a brew', 'Dissolve salt, cream of tartar and a magnesium supplement in water.'],
  ['cream of tartar with a quantity', 'Add 1/4 tsp of cream of tartar to your bottle.'],
];
const MUST_NOT_FLAG_PROHIBITION = [
  ['warning names the act it forbids',
   'Closing a potassium gap with a supplement or a salt substitute is the move that goes wrong.'],
  ['warning that a household item IS a dose',
   'Cream of tartar is potassium in a baking wrapper, and a teaspoon measure of it is a dose whatever the tub says.'],
  ['plain prohibition',
   "Don't add a quarter teaspoon of Lite Salt to your water to top up."],
];
// A prohibition phrase must NOT launder a real instruction elsewhere in the sentence.
const MUST_FLAG_DESPITE_PROHIBITION = [
  ['prohibition wrapper around a real target',
   "Don't overthink it, most adults need 3 to 5 grams of sodium a day."],
];
const MUST_FLAG_DESPITE_LABEL = [
  ['recipe that mentions a scoop is still a recipe',
   'Dump a 200 mg potassium citrate capsule into your bottle and shake.'],
  ['daily total is still a dose even beside a panel',
   'That works out to 3,000 mg of sodium a day.'],
];
const MUST_NOT_FLAG_LABEL = [
  ['accurate supplement serving size', 'Most potassium supplements provide no more than 99 mg per serving.'],
  ['panel with source attributions', 'Re-Lyte (per scoop): 810 mg sodium (from Redmond Real Salt), 400 mg potassium.'],
  ['bare label panel', 'LMNT per packet: 1,000 mg sodium, 200 mg potassium, 60 mg magnesium.'],
  ['label comparison', 'Re-Lyte lists 810 mg sodium and 400 mg potassium, so it carries more potassium than LMNT.'],
];

const MUST_NOT_FLAG = [
  ['per-100g composition', 'Pork loin: about 400 mg per 100 grams of cooked food.'],
  ['per-serving composition', 'Beef has 300-400mg of potassium per 4 oz serving.'],
  ['per-pound composition', 'A pound of ground beef contains roughly 1,200 mg of potassium.'],
  ['ribeye food fact', 'A 10 ounce ribeye gives you roughly 700 to 800 mg of potassium.'],
  ['sweat loss physiology', 'Sodium loss through sweat runs anywhere from roughly 500 to 1500mg per hour depending on heat.'],
  ['banana comparison', 'Banana: about 360 mg, and beef is close behind.'],
];

for (const [label, text] of MUST_FLAG) {
  const got = classify(text);
  check(
    `fixture MUST flag: ${label}`,
    got.length > 0 && got.some((g) => g.kind === 'DOSE'),
    `classified as ${JSON.stringify(got.map((g) => g.kind))} for: ${text}`,
  );
}
for (const [label, text] of MUST_NOT_FLAG) {
  const got = classify(text);
  check(
    `fixture MUST NOT flag: ${label}`,
    !got.some((g) => g.kind === 'DOSE'),
    `wrongly classified as DOSE: ${text}`,
  );
}
for (const [label, text] of MUST_FLAG_RECIPE) {
  check(`fixture MUST flag recipe: ${label}`, DIY_RECIPE.test(text), `not detected: ${text}`);
}
for (const [label, text] of MUST_FLAG_COUNT) {
  check(`fixture MUST flag count: ${label}`, PACKET_COUNT.test(text), `not detected: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_LABEL) {
  check(`fixture label panel stays legal: ${label}`,
    !hits(DIY_RECIPE, text) && !PACKET_COUNT.test(text)
    && !classify(text).some((g) => g.kind === 'DOSE'), `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_FLAG_FALSE_CAP) {
  check(`fixture MUST flag false 99 mg cap: ${label}`, FALSE_REGULATORY_CAP.test(text), `not detected: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_TRUE_99) {
  check(`fixture accurate 99 mg explanation stays legal: ${label}`,
    !FALSE_REGULATORY_CAP.test(text) && !classify(text).some((g) => g.kind === 'DOSE'),
    `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_CAUTIONARY) {
  check(`fixture cautionary narrative survives: ${label}`,
    !hits(DIY_RECIPE, text) && !hits(POTASSIUM_SELF_DOSE, text), `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_REFUSAL) {
  check(`fixture refusal language survives: ${label}`,
    !hits(DIY_RECIPE, text) && !hits(POTASSIUM_SELF_DOSE, text)
    && classify(text).filter((g) => g.kind === 'DOSE')
         .filter((g) => !REFUSAL.test(g.sentence)).length === 0,
    `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_FLAG_DESPITE_REFUSAL) {
  const d = classify(text).filter((g) => g.kind === 'DOSE');
  check(`fixture refusal does not launder a dose: ${label}`, d.length > 0, `missed: ${text}`);
}
for (const [label, text] of MUST_FLAG_GAPS) {
  check(`fixture MUST flag (mutation gap): ${label}`,
    classify(text).some((g) => g.kind === 'DOSE'), `not detected: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_DIFFERENTIAL) {
  check(`fixture differential survives: ${label}`,
    DIFFERENTIAL.test(text), `would be flagged as a symptom map: ${text}`);
}
for (const [label, text] of MUST_FLAG_AIM_DAILY) {
  check(`fixture MUST flag aim-daily: ${label}`, AIM_DAILY_FIGURE.test(text), `not detected: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_AIM_DAILY) {
  const flagged = sentences(text).some(
    (x) => AIM_DAILY_FIGURE.test(x) && !COMPOSITION.test(x) && !REFUSAL.test(x)
           && !PROHIBITION.test(x) && !DIFFERENTIAL.test(x),
  );
  check(`fixture aim-daily must not flag: ${label}`, !flagged, `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_FLAG_SYMPTOM_MAP) {
  check(`fixture MUST flag symptom map: ${label}`,
    SYMPTOM_SELF_DX.test(text) || SYMPTOM_REMEDY_MAP.test(text), `not detected: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_LABEL_READING) {
  check(`fixture label-reading survives: ${label}`,
    !hits(POTASSIUM_SELF_DOSE, text) && !classify(text).some((g) => g.kind === 'DOSE'),
    `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_DEFINITION) {
  check(`fixture definition survives: ${label}`,
    !hits(POTASSIUM_SELF_DOSE, text) && !hits(DIY_RECIPE, text), `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_NAMED_NOT_DOSED) {
  check(`fixture named-not-dosed survives: ${label}`,
    !hits(DIY_RECIPE, text) && !hits(POTASSIUM_SELF_DOSE, text), `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_FLAG_CREAM_RECIPE) {
  check(`fixture cream-of-tartar recipe still flagged: ${label}`, DIY_RECIPE.test(text), `missed: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG_PROHIBITION) {
  check(`fixture prohibition survives: ${label}`,
    !hits(DIY_RECIPE, text) && !hits(POTASSIUM_SELF_DOSE, text), `wrongly flagged: ${text}`);
}
for (const [label, text] of MUST_FLAG_DESPITE_PROHIBITION) {
  check(`fixture prohibition does not launder a target: ${label}`,
    classify(text).some((g) => g.kind === 'DOSE'), `missed: ${text}`);
}
for (const [label, text] of MUST_FLAG_DESPITE_LABEL) {
  check(`fixture still flagged despite label context: ${label}`,
    hits(DIY_RECIPE, text) || classify(text).some((g) => g.kind === 'DOSE'),
    `missed: ${text}`);
}

// ---------------------------------------------------------------------------
// the repaired pages — asserted against SOURCE and RENDERED output
// ---------------------------------------------------------------------------

const GUARDED = [
  '2026-07-06-carnivore-seasonings-condiments',
  '2026-01-19-crossfit-high-intensity',
  '2026-02-08-endurance-running-marathon',
  '2026-05-15-carnivore-cardio-heat-training',
  // Batch 2A
  '2026-04-11-diy-electrolytes-vs-lmnt-dr-hampton',
  '2026-05-18-carnivore-cheat-reentry-protocol',
  // 99 mg factual-correction batch. Added with NO page-level exemptions: the
  // guard's refusal-language class had to learn instead. See REFUSAL above.
  '2026-09-09-potassium-on-carnivore',
  '2026-03-31-electrolytes-carnivore-protocol-dosing-sodium-magnesium',
  '2026-04-27-carnivore-sleep-week-two-electrolytes',
  '2026-05-17-carnivore-electrolyte-problem',
];

/** True if `rx` matches in a sentence that is not a label panel or a regulatory limit. */
function hits(rx, text) {
  return hitSentences(rx, text).length > 0;
}
/** The offending sentences, so failure details point at the real one. */
function hitSentences(rx, text) {
  return sentences(text).filter(
    (s) => rx.test(s) && !LABEL_PANEL.test(s) && !REGULATORY.test(s)
           && !CAUTIONARY.test(s) && !REFUSAL.test(s) && !PROHIBITION.test(s)
           && !DEFINITION.test(s),
  );
}

function assertClean(label, text) {
  const doses = classify(text)
    .filter((d) => d.kind === 'DOSE')
    .filter((d) => !LABEL_PANEL.test(d.sentence) && !REGULATORY.test(d.sentence)
                && !CAUTIONARY.test(d.sentence) && !REFUSAL.test(d.sentence)
                && !PROHIBITION.test(d.sentence) && !DEFINITION.test(d.sentence));
  check(`${label}: no electrolyte dosing instruction`, doses.length === 0,
    doses.map((d) => d.sentence.slice(0, 150)).join('\n        '));
  const sx = sentences(text).filter(
    (x) => (SYMPTOM_SELF_DX.test(x) || SYMPTOM_REMEDY_MAP.test(x))
           && !PROHIBITION.test(x) && !REFUSAL.test(x) && !CAUTIONARY.test(x)
           && !DIFFERENTIAL.test(x),
  );
  check(`${label}: no symptom-based self-treatment`, sx.length === 0, (sx[0] || '').slice(0, 180));
  check(`${label}: no salt-every-meal instruction`, !SALT_EVERY_MEAL.test(text),
    (text.match(SALT_EVERY_MEAL) || [''])[0].slice(0, 150));
  const aim = sentences(text).filter(
    (x) => AIM_DAILY_FIGURE.test(x) && !PROHIBITION.test(x) && !REFUSAL.test(x)
           && !DIFFERENTIAL.test(x) && !LABEL_PANEL.test(x) && !COMPOSITION.test(x),
  );
  check(`${label}: no daily mineral figure with an aim verb`, aim.length === 0, (aim[0] || '').slice(0, 180));
  check(`${label}: no per-hour mineral prescription`, !PER_HOUR_MINERAL.test(text),
    (text.match(PER_HOUR_MINERAL) || [''])[0].slice(0, 150));
  check(`${label}: no potassium or salt-substitute self-dosing`, !hits(POTASSIUM_SELF_DOSE, text),
    (hitSentences(POTASSIUM_SELF_DOSE, text)[0] || '').slice(0, 180));
  check(`${label}: no published DIY electrolyte recipe`, !hits(DIY_RECIPE, text),
    (hitSentences(DIY_RECIPE, text)[0] || '').slice(0, 180));
  check(`${label}: no label amount converted to a packet or scoop count`, !PACKET_COUNT.test(text),
    (text.match(PACKET_COUNT) || [''])[0].slice(0, 150));
  check(`${label}: 99 mg not presented as a regulatory ceiling`, !FALSE_REGULATORY_CAP.test(text),
    (text.match(FALSE_REGULATORY_CAP) || [''])[0].slice(0, 180));
}

// SOURCE
const posts = JSON.parse(readFileSync(join(ROOT, 'data/blog_posts.json'), 'utf8')).blog_posts;
for (const slug of GUARDED) {
  const p = posts.find((x) => x.slug === slug);
  check(`source: ${slug} exists in blog_posts.json`, !!p, 'missing');
  if (!p) continue;
  const text = stripHtml(p.content);
  assertClean(`source ${slug}`, text);
  // the repair must ROUTE, not merely delete
  check(`source ${slug}: routes to a clinician`,
    /\b(?:doctor|pharmacist|clinician|dietitian|nephrologist)\b/i.test(text),
    'no clinician routing found after suppression');
  if (LIST) {
    console.log(`\n--- ${slug} retained figures ---`);
    for (const c of classify(text)) console.log(`  [${c.kind}] ${c.sentence.slice(0, 130)}`);
  }
}

// RENDERED
for (const slug of GUARDED) {
  const f = join(ROOT, 'public/blog', `${slug}.html`);
  if (!existsSync(f)) {
    check(`rendered: ${slug}.html exists`, false, 'page not rendered — run generate_blog_pages.py --site cw');
    continue;
  }
  assertClean(`rendered ${slug}`, stripHtml(readFileSync(f, 'utf8')));
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const total = failures.length;
if (total) {
  console.error(`\nelectrolyte-self-dosing: ${total} FAILED\n`);
  for (const f of failures) {
    console.error(`  ✗ ${f.name}`);
    if (f.detail) console.error(`        ${f.detail}`);
  }
  process.exit(1);
}
console.log('electrolyte-self-dosing: all checks passed '
  + `(${MUST_FLAG.length + MUST_FLAG_RECIPE.length + MUST_FLAG_COUNT.length + MUST_FLAG_FALSE_CAP.length + MUST_FLAG_DESPITE_REFUSAL.length + MUST_FLAG_DESPITE_PROHIBITION.length + MUST_FLAG_CREAM_RECIPE.length + MUST_FLAG_GAPS.length + MUST_FLAG_SYMPTOM_MAP.length + MUST_FLAG_AIM_DAILY.length} positive fixtures, `
  + `${MUST_NOT_FLAG.length + MUST_NOT_FLAG_LABEL.length + MUST_NOT_FLAG_CAUTIONARY.length + MUST_NOT_FLAG_TRUE_99.length + MUST_NOT_FLAG_REFUSAL.length + MUST_NOT_FLAG_PROHIBITION.length + MUST_NOT_FLAG_NAMED_NOT_DOSED.length + MUST_NOT_FLAG_DEFINITION.length + MUST_NOT_FLAG_LABEL_READING.length + MUST_NOT_FLAG_DIFFERENTIAL.length} negative fixtures, `
  + `${GUARDED.length} pages × source + rendered)`);
