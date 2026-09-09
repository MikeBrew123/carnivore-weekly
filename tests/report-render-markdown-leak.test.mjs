#!/usr/bin/env node
/**
 * tests/report-render-markdown-leak.test.mjs
 *
 * RAW MARKDOWN MUST NEVER REACH A PAYING READER.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-09 a customer's regenerated $29 report was read page by page as a
 * PDF. Every medical safety block was printed as raw markdown: literal '>' quote
 * markers, a literal '### What you told us', literal '**' around the single most
 * important sentence in the document, and '> >' separators. The safety component
 * was a run-on paragraph torn across a page break, so page 14 opened with the
 * fragment "stop, skip or re-time any > medication...".
 *
 * Three independent layers all missed it, and they missed it the same way:
 *
 *   1. tests/report-safety.test.mjs asserts on the MARKDOWN sections and actively
 *      STRIPS the quote markers to do so:
 *          s10.split(newline).filter(l => !l.trim().startsWith('>'))
 *          (sections[3] || '').replace(a quote-prefix regex, ' ')
 *      A suite that removes '>' before looking can never notice '>' surviving to
 *      the customer.
 *   2. tests/report-integrity.test.mjs (GROUPS A-N) also asserts on `sections`,
 *      which is markdown. Not one assertion in the repo called markdownToHTML or
 *      wrapInPrintHTML.
 *   3. scripts/report_artifact_gate.sh checked the PDF for unreplaced '{{'
 *      placeholders, 'undefined' and 'NaN', but never for '###', '**' or a
 *      line-leading '>'.
 *
 * Meanwhile the blockquote renderer that fixes this was written on the branch
 * fix/cw-report-blockquote-rendering and never merged, so production main had no
 * blockquote branch in markdownToHTML at all.
 *
 * THE RULE THIS FILE ENFORCES:
 *
 *     Assert on the artifact the customer receives, not on the input that
 *     produces it. Markdown correctness is not evidence of rendered correctness.
 *
 * So this suite drives the REAL helpers through the REAL assembly and the REAL
 * renderer, and asserts on final HTML.
 */
import path from 'path';

const API = path.resolve(new URL('../api/calculator-api.js', import.meta.url).pathname);
const MED = path.resolve(new URL('../api/medical-context.js', import.meta.url).pathname);

globalThis.fetch = async (url) => String(url).includes('anthropic.com')
  ? { ok: true, json: async () => ({ content: [{ text: '[AI SECTION STUBBED]' }] }) }
  : (() => { throw new Error('unexpected network call'); })();

const api = await import('file://' + API);
const med = await import('file://' + MED);

const {
  __test_buildReportData: buildReportData,
  __test_calculateMacros: calculateMacros,
  __test_generateAllReports: generateAllReports,
  __test_wrapInPrintHTML: wrapInPrintHTML,
} = api;

for (const [n, f] of Object.entries({ buildReportData, calculateMacros, generateAllReports, wrapInPrintHTML })) {
  if (typeof f !== 'function') { console.error(`FATAL: api no longer exports ${n}`); process.exit(2); }
}

let pass = 0; const failures = [];
const check = (persona, label, ok, detail = '') => {
  if (ok) pass++; else failures.push({ persona, label, detail });
};

// ---------------------------------------------------------------------------
// Personas chosen so that EVERY medical safety helper actually fires. A fixture
// that produces no safety block proves nothing about how safety blocks render.
// ---------------------------------------------------------------------------
const BASE = {
  sex: 'female', age: 67, heightFeet: 5, heightInches: 4, weight: 120,
  lifestyle: 'light', exercise: '1-2', goal: 'maintain', deficit: 0,
  diet: 'carnivore', email: 'render-fixture@example.com',
  firstName: 'Fixture', lastName: 'Persona',
  medications: '', conditions: ['none'], symptoms: ['none'], otherSymptoms: '',
  allergies: '', avoidFoods: '', previousDiets: '', whatWorked: '',
  carnivoreExperience: 'beginner', goals: ['energy'], biggestChallenge: '',
  cookingSkill: 'basic', budget: 'moderate', familySituation: 'partner',
  workTravel: 'rarely', additionalNotes: '',
};

const PERSONAS = [
  { id: 'REPORTED', declares: true, name: 'the reported case: free-text symptom, no meds',
    form: { ...BASE, otherSymptoms: 'pelvic floor prolapse' } },
  { id: 'KIDNEY', declares: true, name: 'declared kidney condition: protein note must fire',
    form: { ...BASE, conditions: ['kidney-disease'], otherConditions: 'CKD stage 3' } },
  { id: 'MEDS', declares: true, name: 'declared medication: medication note must fire',
    form: { ...BASE, medications: 'metformin 1000mg, lisinopril' } },
  { id: 'BOTH', declares: true, name: 'condition and medication together',
    form: { ...BASE, conditions: ['diabetes-t2'], medications: 'insulin glargine',
            otherSymptoms: 'fatigue' } },
  // A reader who declares nothing gets a DIFFERENT, shorter banner: no "What you
  // told us" heading and no reported-rows list. That is correct product behaviour,
  // so the declared-context assertions below are scoped with `declares`. The
  // raw-markdown assertions are not scoped: they apply to every reader.
  { id: 'CLEAN', name: 'nothing declared: the short banner variant', declares: false,
    form: { ...BASE } },
];

const rendered = {};
const quiet = ['log', 'info', 'warn', 'debug'].map(k => [k, console[k]]);
for (const [k] of quiet) console[k] = () => {};
try {
  for (const p of PERSONAS) {
    const data = buildReportData({
      id: 'fixture-' + p.id, email: p.form.email, first_name: p.form.firstName,
      last_name: p.form.lastName, diet_type: p.form.diet, form_data: p.form,
    });
    data.macros = calculateMacros(p.form);
    const sections = await generateAllReports(data, 'sk-fixture-not-a-real-key');
    // EXACTLY the assembly handleReportInit performs. Markdown in, one document out.
    let markdown = '';
    for (let i = 1; i <= 13; i++) {
      if (!sections[i]) continue;
      if (i > 1) markdown += '\n\n---\n\n';
      markdown += sections[i];
    }
    rendered[p.id] = { markdown, sections, html: wrapInPrintHTML(markdown, data) };
  }
} finally { for (const [k, fn] of quiet) console[k] = fn; }

// Visible text: what a reader actually sees once tags are gone.
const visibleText = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, '\n');

for (const p of PERSONAS) {
  const { html, markdown } = rendered[p.id];
  const text = visibleText(html);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // --- The leak itself. -----------------------------------------------------
  const quoted = lines.filter(l => /^>/.test(l));
  check(p.id, 'no visible text node starts with a markdown quote marker',
    quoted.length === 0, quoted.slice(0, 3).join(' | '));

  check(p.id, 'no visible "> >" separator', !/>\s*>/.test(text),
    (text.match(/.{0,40}>\s*>.{0,40}/) || [''])[0]);

  const hashes = lines.filter(l => /^#{1,6}\s/.test(l));
  check(p.id, 'no visible markdown heading marker', hashes.length === 0,
    hashes.slice(0, 3).join(' | '));

  check(p.id, 'no literal "### What you told us"',
    !/###\s*What you told us/.test(text), '');

  const bold = lines.filter(l => l.includes('**'));
  check(p.id, 'no visible "**" bold marker', bold.length === 0,
    bold.slice(0, 2).join(' | '));

  check(p.id, 'no literal "**Take this report"',
    !/\*\*Take this report/.test(html), '');

  // --- The markdown really did contain those markers. -----------------------
  // Without this the suite would pass just as happily against a helper that had
  // been emptied out, which is the failure mode that lets a "fix" delete safety
  // content and go green.
  check(p.id, 'the source markdown really is quoted (so this suite has work to do)',
    /^>/m.test(markdown), 'no blockquote in the assembled markdown at all');

  // --- Structure, not just absence. -----------------------------------------
  check(p.id, 'the safety component renders as a callout element',
    /<blockquote class="safety-callout">/.test(html), '');
  check(p.id, 'quoted bold became <strong>',
    /<blockquote class="safety-callout">[\s\S]*?<strong>/.test(html), '');
  if (p.declares) {
    check(p.id, 'a quoted heading became a real heading',
      /<blockquote class="safety-callout">[\s\S]{0,200}?<h[1-6]>/.test(html), '');
    check(p.id, 'the three reported rows are separate rows, not one run-on line',
      /<blockquote class="safety-callout">[\s\S]*?<li><strong>Conditions you reported:[\s\S]*?<li><strong>Medications you reported:/.test(html),
      'the reader sees one collapsed paragraph instead of three rows');
    check(p.id, 'the doctor instruction is emphasised, not asterisked',
      /<strong>Take this report to your doctor or pharmacist/.test(html), '');
  }

  // --- Safety content still PRESENT. Deleting it must not make this pass. ----
  const presence = p.declares ? [
    ['the "what you told us" heading', /What you told us, and what it means for this report/],
    ['the automatic-generation disclosure', /generated automatically from your questionnaire/],
    ['the not-a-clinician disclosure', /is not a clinician/],
    ['the labs disclosure', /has not seen[\s\S]{0,20}your labs/],
    ['the kidney-function disclosure', /does not know your kidney function/],
    ['the doctor instruction', /Take this report to your doctor or pharmacist/],
    ['the do-not-change-medication instruction', /Do not change, stop, skip or re-time any/],
  ] : [
    // The short banner a reader who declared nothing receives. It still has to say
    // the numbers are general and still has to route them to a clinician.
    ['the about-the-numbers disclosure', /About the numbers in this report/],
    ['the general-figures disclosure', /general figures here are written for someone/],
  ];
  for (const [label, re] of presence) {
    check(p.id, `safety content present: ${label}`, re.test(text), '');
  }

  // --- Legitimate comparisons must survive untouched. -----------------------
  // The fix must not be "delete every '>'": these are real medical reference
  // values a reader needs.
  for (const cmp of ['HDL', 'CAC Score']) {
    check(p.id, `the ${cmp} reference row survived`, text.includes(cmp), '');
  }
  check(p.id, 'a "greater than" comparison still renders as a comparison',
    /(?:&gt;|>)\s*40/.test(html), 'HDL >40 / age >40 was destroyed');
  check(p.id, 'a "less than" comparison still renders',
    /(?:&lt;|<)\s*(?:150|130|100|70)/.test(html), '');
}

// --- Standalone renderer facts, so a failure localises. ---------------------
{
  const md = [
    '> ### Quoted heading',
    '>',
    '> - **Row:** value',
    '>',
    '> **Bold across',
    '> a line break** trailing text.',
    '',
    'Normal paragraph with HDL >40 and age > 40 and 5 > 3.',
  ].join('\n');
  const html = wrapInPrintHTML(md, { firstName: 'T' });
  check('-', 'renderer: quoted heading becomes a heading', /<h3>Quoted heading<\/h3>/.test(html), '');
  check('-', 'renderer: quoted list row becomes a list item', /<li><strong>Row:<\/strong> value<\/li>/.test(html), '');
  check('-', 'renderer: bold spanning a line break becomes <strong>',
    /<strong>Bold across\s*\n?a line break<\/strong>/.test(html), '');
  // Bounded to the inside of a callout element. The first version used [\s\S]* and
  // matched across the whole document from an earlier legitimate blockquote to this
  // paragraph, which made it fail against correct output.
  const callouts = html.match(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/g) || [];
  check('-', 'renderer: a normal paragraph is NOT turned into a callout',
    !callouts.some(b => b.includes('Normal paragraph')), '');
  check('-', 'renderer: HDL >40 survives in a normal paragraph',
    /HDL (?:&gt;|>)40/.test(html), '');
  check('-', 'renderer: "age > 40" survives with its spaces',
    /age (?:&gt;|>) 40/.test(html), '');
  check('-', 'renderer: "5 > 3" survives', /5 (?:&gt;|>) 3/.test(html), '');
  check('-', 'renderer: mid-sentence ">" is not treated as a quote',
    !/<blockquote[^>]*>[\s\S]{0,80}HDL/.test(html), '');
}

// --- Emphasis must not leak past the phrase it marks. -----------------------
// A fill-in blank is not emphasis. The physician handout signs off with
// "**Patient Signature:** ______ **Date:** ______", and the underscore-bold rule
// chewed through the run, left a stray "_", and the italic rule paired it with an
// underscore thousands of characters later. 7,823 characters of the report, all of
// Section 8 and the whole Laboratory Reference Guide, rendered in italics. Every
// text-only check passed, because the WORDS were all correct. It was only visible
// in a page image.
for (const p of PERSONAS) {
  const { html } = rendered[p.id];
  const body = html.slice(html.indexOf('report-content'));

  const opens = (body.match(/<em>/g) || []).length;
  const closes = (body.match(/<\/em>/g) || []).length;
  check(p.id, 'every <em> is closed', opens === closes, `${opens} open, ${closes} close`);

  // Balance is not enough: <p><em>a</p><p>b</em></p> balances and still leaks.
  const leaking = [...body.matchAll(/<em>([\s\S]*?)<\/em>/g)]
    .filter(m => /<\/?(p|h[1-6]|li|table|tr|td|blockquote|ul)\b/.test(m[1]));
  check(p.id, 'no <em> spans a block boundary',
    leaking.length === 0,
    leaking.length ? `${leaking[0][1].length} chars swallowed: ${leaking[0][1].slice(0, 70)}` : '');

  const leakingStrong = [...body.matchAll(/<strong>([\s\S]*?)<\/strong>/g)]
    .filter(m => /<\/?(p|h[1-6]|li|table|tr|td|blockquote|ul)\b/.test(m[1]));
  check(p.id, 'no <strong> spans a block boundary', leakingStrong.length === 0,
    leakingStrong.length ? leakingStrong[0][1].slice(0, 70) : '');

  check(p.id, 'no empty <strong></strong> left by underscore chewing',
    !body.includes('<strong></strong>'), '');

  // The blanks the reader signs on must survive intact.
  check(p.id, 'the signature blank survives as a blank',
    /_{10,}/.test(body), 'the fill-in rule was eaten by emphasis parsing');
}

// --- Ordered lists. ---------------------------------------------------------
// Until 2026-09-09 markdownToBlockHTML had a branch for '- ' and none for '1. ',
// so every numbered list in the report ran together as one paragraph. Nine places
// in a delivered PDF, including the patient's own requests to their doctor
// ("1. Baseline comprehensive labs 2. 8-week recheck labs 3. Partnership in
// monitoring") and the tracker instructions. It read as a formatting fault in a
// paid document.
for (const p of PERSONAS) {
  const { html } = rendered[p.id];
  const body = html.slice(html.indexOf('report-content'));

  check(p.id, 'the report contains at least one ordered list',
    /<ol>/.test(body), 'numbered lists are still running together as paragraphs');
  check(p.id, 'every <ol> is closed',
    (body.match(/<ol>/g) || []).length === (body.match(/<\/ol>/g) || []).length, '');
  check(p.id, 'every <ul> is still closed (the shared close path did not regress)',
    (body.match(/<ul>/g) || []).length === (body.match(/<\/ul>/g) || []).length, '');
  // A tag STACK, not a regex. The first version was /<ol>[\s\S]*?<\/ul>/, which
  // matched an <ol> early in the document against a </ul> much later even though
  // both lists were correctly balanced. Balance and nesting are different questions
  // and only a stack answers the second one.
  const listTags = [...body.matchAll(/<(\/?)(ol|ul)>/g)];
  const stack = [];
  let mismatch = '';
  for (const [, slash, tag] of listTags) {
    if (!slash) stack.push(tag);
    else if (stack.pop() !== tag) { mismatch = `closed a list with </${tag}>`; break; }
  }
  check(p.id, 'every list closes with its own tag', !mismatch && stack.length === 0,
    mismatch || (stack.length ? `${stack.length} list(s) left open` : ''));

  // The specific shape the reader saw. A numbered item must not still be sitting
  // inside a paragraph next to the item that follows it.
  const runOn = body.match(/<p>[^<]*\b1\.\s[^<]{5,}\b2\.\s[^<]{5,}/);
  check(p.id, 'no two numbered items share one paragraph', !runOn, runOn ? runOn[0].slice(0, 90) : '');

  // Headings that merely LOOK like list items must stay headings. Real reports
  // contain "### 1. IDENTIFYING THE ENEMY" and "**1. ApoB (Apolipoprotein B)**".
  const listified = [...body.matchAll(/<li>(\d+\.\s+[A-Z][A-Z '"&-]{5,})</g)];
  check(p.id, 'an ALL-CAPS numbered heading did not become a list item',
    listified.length === 0, listified.length ? listified[0][1] : '');
}

// Renderer facts, isolated so a failure localises.
{
  const md = [
    '**Immediate Actions:**',
    '1. [ ] Schedule the follow-up appointment',
    '2. [ ] Get lab orders and complete **baseline labs** within 48 hours',
    '3. [ ] Request copies of all results, and keep them somewhere you will',
    'find them again later',
    '',
    'A following paragraph, not a list item.',
    '',
    '### 1. IDENTIFYING THE ENEMY',
    '',
    '**1. ApoB (Apolipoprotein B)**',
    '- **What it measures:** particle count',
    '',
    '> ### Quoted',
    '> 1. first quoted step',
    '> 2. second quoted step',
    '',
    'In 2026. Something happened. The ratio 3.5 is fine.',
  ].join('\n');
  const b = wrapInPrintHTML(md, { firstName: 'T' });
  const body = b.slice(b.indexOf('report-content'));

  check('-', 'ol: contiguous numbered lines become one ordered list',
    /<ol>\n<li>\[ \] Schedule the follow-up appointment<\/li>/.test(body), '');
  check('-', 'ol: a hard-wrapped continuation stays inside its <li>',
    /keep them somewhere you will find them again later<\/li>/.test(body), '');
  check('-', 'ol: bold inside a list item still renders',
    /<li>[^<]*<strong>baseline labs<\/strong>/.test(body), '');
  check('-', 'ol: a blank line closes the list',
    /<\/ol>\n<p>A following paragraph/.test(body), '');
  check('-', 'ol: an ALL-CAPS "### 1." heading stays a heading',
    /<h3>1\. IDENTIFYING THE ENEMY<\/h3>/.test(body), '');
  check('-', 'ol: a bolded "**1. x**" pseudo-heading is not listified',
    /<strong>1\. ApoB \(Apolipoprotein B\)<\/strong>/.test(body) && !/<li>1\. ApoB/.test(body), '');
  check('-', 'ol: an unordered list still renders as <ul>',
    /<ul>\n<li>[^<]*<strong>What it measures:/.test(body), '');
  check('-', 'ol: switching list type closes the previous list',
    !/<ol>[\s\S]*?<li>[^<]*What it measures[\s\S]*?<\/ol>/.test(body), '');
  check('-', 'ol: an ordered list works inside a blockquote',
    /<blockquote[^>]*>[\s\S]*?<ol>[\s\S]*?first quoted step[\s\S]*?<\/blockquote>/.test(body), '');
  // The prose line must be in a PARAGRAPH. The first version asserted
  // !/<li>Something happened/, which a loose "any digit-dot" rule satisfied trivially
  // because the item text would have started "In 2026." instead. Mutation M38
  // survived on exactly that. Assert where the sentence LANDED, not how it starts.
  check('-', 'ol: ordinary prose containing "2026." stays a paragraph',
    /<p>In 2026\. Something happened\. The ratio 3\.5 is fine\.<\/p>/.test(body)
      && !/<li>[^<]*Something happened/.test(body), '');
}

// --- The adaptation timeline may not promise outcomes. ----------------------
// Report #11 read as a schedule of guaranteed results: "excellent energy, mental
// clarity improves", "sleep improves, skin/hair improve", "Note health improvements".
// That is the same class of unsupported benefit language already removed from the
// food guide, and it survived because nothing asserted against it.
//
// Suppressed, not replaced with different promises: the section now says people vary
// and routes the reader to their own tracker.
{
  const PROMISES = [
    /health improvements/i,
    /skin\s*\/?\s*hair improve/i,
    /sleep improves/i,
    /excellent energy/i,
    /mental clarity improves/i,
    /inflammation (?:drops|improves|reduces)/i,
    /energy returns/i,
    /the payoff is worth it/i,
    /\bwill (?:improve|feel better|notice)\b/i,
  ];
  for (const p of PERSONAS) {
    const timeline = rendered[p.id].sections?.[11] ?? '';
    const source = timeline || rendered[p.id].markdown;
    const scope = timeline || (source.match(/## Report #11[\s\S]*?(?=\n---\n|$)/) || [''])[0];
    for (const re of PROMISES) {
      const m = scope.match(re);
      check(p.id, `timeline makes no promise: ${re.source.slice(0, 34)}`, !m, m ? m[0] : '');
    }
    // Suppressing must not have emptied the section: it still has to be useful.
    check(p.id, 'the timeline still covers all four weeks',
      /Days 1-3/.test(scope) && /Days 8-10/.test(scope) && /Days 15-21/.test(scope) && /Days 22-30/.test(scope), '');
    check(p.id, 'the timeline says outcomes vary between people',
      /vary|varies|some people|others/i.test(scope), '');
    check(p.id, 'the timeline routes the reader to their own tracker',
      /tracker/i.test(scope), '');
    check(p.id, 'the timeline still routes electrolytes to Report #10',
      /Report #10/.test(scope), '');
    check(p.id, 'the timeline no longer tells the reader to push through or not cheat',
      !/push through|don't cheat|dont cheat/i.test(scope), '');
    check(p.id, 'the timeline uses no em dash', !scope.includes('\u2014'), '');
  }
}

// --- Timeline rows must be separate blocks, not one flowing paragraph. -------
// Report #11's labelled rows were consecutive single-newline lines, so they
// rendered as ONE paragraph with the labels buried mid-flow: "Days 1-3: ... Days
// 4-7: ... Action: ...". The same newline collapse that ran the three "you
// reported" rows together. Fixed in the TEMPLATE by separating the rows with blank
// lines, not by teaching the renderer anything new.
for (const p of PERSONAS) {
  const { html } = rendered[p.id];
  const body = html.slice(html.indexOf('report-content'));
  const timeline = (body.match(/<h2>Report #11[\s\S]*?(?=<h2>Report #12|$)/) || [''])[0];
  if (!timeline) { check(p.id, 'the adaptation timeline rendered at all', false, ''); continue; }

  // Every labelled row opens its own block element.
  for (const label of ['Days 1-3:', 'Days 4-7:', 'Days 8-10:', 'Days 11-14:',
                       'Days 15-21:', 'Days 22-30:']) {
    const re = new RegExp('<p><strong>' + label.replace(/[-:]/g, m => '\\' + m) + '<\\/strong>');
    check(p.id, `timeline row "${label}" starts its own block`, re.test(timeline), '');
  }
  const actions = timeline.match(/<p><strong>Action:<\/strong>/g) || [];
  check(p.id, 'every week\'s Action starts its own block', actions.length === 4,
    `${actions.length} of 4 Action rows are their own paragraph`);

  // The failure shape: two labels inside ONE block. Examine each block separately.
  // A regex spanning [\s\S]*? between two labels happily crosses '</p><p>' and
  // reports correct output as broken; that mistake has now been made three times in
  // this file, so the rule is: split into blocks first, then count within a block.
  const blocks = [...timeline.matchAll(/<p>((?:(?!<\/p>)[\s\S])*)<\/p>/g)].map(m => m[1]);
  const crowded = blocks.filter(b =>
    (b.match(/<strong>(?:Days [\d-]+|Action):<\/strong>/g) || []).length > 1);
  check(p.id, 'no two timeline labels share one paragraph', crowded.length === 0,
    crowded.length ? crowded[0].replace(/<[^>]+>/g, ' ').slice(0, 110) : '');

  // Labels stay bold, and the four-week structure survives.
  check(p.id, 'timeline labels are still bold',
    /<strong>Days 1-3:<\/strong>/.test(timeline) && /<strong>Action:<\/strong>/.test(timeline), '');
  const weeks = timeline.match(/<h2>Week \d: /g) || [];
  check(p.id, 'the timeline still has four week sections', weeks.length === 4, `${weeks.length} weeks`);
}

// --- Print CSS keeps the callout together. ----------------------------------
{
  const html = rendered.REPORTED.html;
  const css = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  // (?<![-\w]) matters: without it "break-inside: avoid" matches the tail of
  // "page-break-inside: avoid", so flipping the modern property to `auto` left this
  // assertion green. Mutation M33 survived on exactly that until it was tightened.
  check('-', 'the safety callout is protected from a page break',
    /blockquote\.safety-callout[\s\S]{0,400}?(?<![-\w])break-inside:\s*avoid/.test(css),
    'break-inside: avoid missing, so the callout can tear across pages');
  check('-', 'the legacy page-break-inside is set too, for older engines',
    /blockquote\.safety-callout[\s\S]{0,400}?page-break-inside:\s*avoid/.test(css), '');
}

console.log(`\nreport-render-markdown-leak: ${pass} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  [${f.persona}] ${f.label}\n        ${f.detail}`);
  process.exit(1);
}
console.log('Raw markdown does not reach the reader, the safety component renders as');
console.log('structure, and mathematical comparisons survive.\n');
