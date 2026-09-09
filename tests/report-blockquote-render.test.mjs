#!/usr/bin/env node
/**
 * tests/report-blockquote-render.test.mjs
 *
 * RENDERED-OUTPUT REGRESSION FOR MEDICAL SAFETY BLOCKQUOTES.
 *
 * Run it:
 *     node tests/report-blockquote-render.test.mjs
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-09 a real customer's regenerated $29 report was inspected page by
 * page as a PDF. Every medical safety block rendered as raw markdown. The
 * customer saw literal '>' characters, a literal '###', and literal '**' around
 * the single most important sentence in the document:
 *
 *     **Take this report to your doctor or pharmacist before you start, and let
 *     them > tell you which parts apply to you.**
 *
 * The safety copy in api/medical-context.js was correct. buildMedicalSafetyRules()
 * and buildProteinTargetNote() emit markdown blockquotes, and markdownToHTML() in
 * api/calculator-api.js had no blockquote branch at all. Quoted lines fell through
 * to the paragraph case with the '>' preserved, and because '> ### Heading' does
 * not start with '#', the heading test never matched it either.
 *
 * The bitter detail: the safety language added on 2026-09-08 was precisely the
 * content that did not render. Source review would never have caught it. Only
 * looking at the rendered artifact did.
 *
 * THE ACCEPTANCE TEST THIS FILE ENCODES:
 *
 *     Markdown emitted by the canonical medical safety helpers must survive the
 *     production renderer as semantic HTML, with no markdown punctuation left
 *     visible to the customer and no safety sentence lost.
 *
 * Both halves matter. Stripping every '>' would satisfy "no raw markers" while
 * silently deleting the blockquote structure, so the tests below assert that the
 * content is still present, that the wrapper exists, and that headings and bold
 * became real elements.
 *
 * MUTATION-TESTED. See tests/mutate-blockquote.sh. A passing suite is not
 * evidence until each protection has been broken and watched to go red.
 */

import {
  __test_markdownToHTML as markdownToHTML,
  __test_wrapInPrintHTML as wrapInPrintHTML
} from '../api/calculator-api.js';

import {
  deriveMedicalContext,
  buildMedicalContextBanner,
  buildProteinTargetNote,
  buildMealPlanMedicalNote,
  buildElectrolyteProtocol
} from '../api/medical-context.js';

// NOT buildMedicalSafetyRules(). Verified 2026-09-09 at api/calculator-api.js:3626
// and :3803: its output goes into the LLM prompt, never into the customer's
// document. Asserting customer-facing rules against it would be asserting against
// text no reader ever sees, and it contains deliberate prompt-only constructs like
// "<their condition>" placeholders. The customer-facing markdown blockquotes come
// from the report templates plus {{medicalContextBanner}}, {{proteinTargetNote}},
// {{mealPlanMedicalNote}} and {{electrolyteProtocol}}.

let failures = 0;
let passes = 0;

function check(group, name, condition, detail = '') {
  if (condition) {
    passes++;
    console.log(`  PASS  [${group}] ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  [${group}] ${name}`);
    if (detail) console.log(`        ${String(detail).slice(0, 400)}`);
  }
}

/**
 * The customer never sees tag names, attribute values or HTML entities, only the
 * decoded text. Markdown punctuation is a defect only when it lands in text the
 * reader actually reads, so every "is it visible" assertion runs against this.
 * Entities matter: list items and table cells are escaped by the renderer, so
 * "lite salt" arrives here as &quot;lite salt&quot; and a naive strip would
 * report the content as missing.
 */
function visibleText(html) {
  return html
    .replace(/<blockquote class="safety-callout">/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------------------
// 1. Synthetic blockquote: the exact shape the safety helpers emit.
// ---------------------------------------------------------------------------
{
  const md = [
    '> ### Safety heading',
    '>',
    '> **Important sentence.** More text.'
  ].join('\n');

  const html = markdownToHTML(md);
  const text = visibleText(html);

  check('synthetic', 'a blockquote wrapper is opened',
    html.includes('<blockquote class="safety-callout">'), html);
  check('synthetic', 'the blockquote wrapper is closed',
    (html.match(/<blockquote/g) || []).length === (html.match(/<\/blockquote>/g) || []).length,
    html);
  check('synthetic', 'the quoted heading became a real heading element',
    /<h3>\s*Safety heading\s*<\/h3>/.test(html), html);
  check('synthetic', 'bold inside the blockquote became <strong>',
    html.includes('<strong>Important sentence.</strong>'), html);
  check('synthetic', 'no customer-visible line begins with a literal >',
    !text.split('\n').some(l => l.trimStart().startsWith('>')), text);
  check('synthetic', 'no literal ### is visible to the customer',
    !text.includes('###'), text);
  check('synthetic', 'no literal ** is visible to the customer',
    !text.includes('**'), text);
  check('synthetic', 'the heading text survived',
    text.includes('Safety heading'), text);
  check('synthetic', 'the sentence text survived',
    text.includes('Important sentence.') && text.includes('More text.'), text);
}

// ---------------------------------------------------------------------------
// 2. Multi-paragraph quotes, lists inside quotes, and quote termination.
// ---------------------------------------------------------------------------
{
  const md = [
    'Before the quote.',
    '',
    '> First quoted paragraph.',
    '>',
    '> Second quoted paragraph.',
    '>',
    '> * quoted bullet one',
    '> * quoted bullet two',
    '',
    'After the quote.'
  ].join('\n');

  const html = markdownToHTML(md);
  const text = visibleText(html);

  check('structure', 'text before the quote is not swallowed',
    text.includes('Before the quote.'), text);
  check('structure', 'text after the quote is not swallowed',
    text.includes('After the quote.'), text);
  check('structure', 'the paragraph after the quote is outside the blockquote',
    html.split('</blockquote>')[1].includes('After the quote.'), html);
  check('structure', 'both quoted paragraphs render separately',
    (html.match(/<p>First quoted paragraph\.<\/p>/) &&
     html.match(/<p>Second quoted paragraph\.<\/p>/)) !== null, html);
  check('structure', 'a list inside a blockquote renders as a list',
    /<blockquote[^>]*>[\s\S]*<ul>[\s\S]*<li>quoted bullet one<\/li>[\s\S]*<\/ul>[\s\S]*<\/blockquote>/.test(html),
    html);
  check('structure', 'exactly one blockquote is produced for one contiguous run',
    (html.match(/<blockquote/g) || []).length === 1, html);
  check('structure', 'no visible > anywhere in the document',
    !text.includes('>'), text);
}

// ---------------------------------------------------------------------------
// 3. Real safety banners through the real renderer.
//
// Three medical contexts, because the helpers branch on them and a fix that only
// works for the healthy baseline is not a fix.
// ---------------------------------------------------------------------------
const PERSONAS = [
  {
    label: 'no-medical-context',
    form: { conditions: [], medications: '', symptoms: ['pelvic floor prolapse'] }
  },
  {
    label: 'declared-medical-context',
    form: {
      conditions: ['CKD stage 3', 'heart failure'],
      medications: 'warfarin, furosemide, metformin',
      symptoms: ['fatigue', 'dizziness']
    }
  },
  {
    label: 'protein-suppressed',
    form: {
      conditions: ['chronic kidney disease'],
      medications: 'lisinopril',
      symptoms: []
    }
  }
];

for (const persona of PERSONAS) {
  const ctx = deriveMedicalContext(persona.form);

  const sources = [
    ['buildMedicalContextBanner', buildMedicalContextBanner(ctx)],
    ['buildProteinTargetNote', buildProteinTargetNote(ctx)],
    ['buildMealPlanMedicalNote', buildMealPlanMedicalNote(ctx)],
    ['buildElectrolyteProtocol', buildElectrolyteProtocol(ctx)]
  ];

  for (const [helperName, md] of sources) {
    if (!md || !String(md).trim()) continue;

    const markdown = String(md);
    const html = markdownToHTML(markdown);
    const text = visibleText(html);
    const g = `${persona.label}/${helperName}`;

    // Only meaningful if the helper actually emits a quote. If a helper stops
    // using blockquotes this assertion should be revisited, not deleted.
    const emitsQuote = markdown.split('\n').some(l => /^>/.test(l));
    if (emitsQuote) {
      check(g, 'produces a blockquote wrapper',
        html.includes('<blockquote class="safety-callout">'), html.slice(0, 300));
      check(g, 'blockquote tags are balanced',
        (html.match(/<blockquote/g) || []).length === (html.match(/<\/blockquote>/g) || []).length,
        html.slice(0, 300));
    }

    check(g, 'no raw > survives into customer-visible text',
      !text.includes('>'), text.slice(0, 300));
    check(g, 'no raw ### survives into customer-visible text',
      !text.includes('###'), text.slice(0, 300));
    check(g, 'no raw ** survives into customer-visible text',
      !text.includes('**'), text.slice(0, 300));

    // Content preservation. Strip markdown punctuation from the source and
    // confirm every word-bearing line still appears in the rendered text, so a
    // renderer that "cleans up" by dropping the block cannot pass.
    const sourceLines = markdown
      .split('\n')
      // The ordered-list marker is stripped for the same reason as the bullet, the
      // quote marker and the '#': it is STRUCTURE, and once markdownToBlockHTML grew
      // an <ol> branch on 2026-09-09 the "1. " is supplied by the list numbering
      // rather than printed as text. This assertion is about the words surviving.
      .map(l => l.replace(/^>[ \t]?/, '').replace(/^#+\s*/, '').replace(/\*\*/g, '')
                 .replace(/^[*-]\s*/, '').replace(/^\d{1,3}\.\s*/, '').trim())
      .filter(l => l.length > 12);

    const missing = sourceLines.filter(l => !text.replace(/\s+/g, ' ').includes(l.replace(/\s+/g, ' ')));
    check(g, 'every substantive safety line survives rendering',
      missing.length === 0, missing.slice(0, 2).join(' || '));
  }
}

// ---------------------------------------------------------------------------
// 4. The specific sentence that broke, end to end through wrapInPrintHTML.
// ---------------------------------------------------------------------------
{
  const ctx = deriveMedicalContext({ conditions: [], medications: '', symptoms: ['pelvic floor prolapse'] });
  const banner = buildMedicalContextBanner(ctx);
  const full = wrapInPrintHTML(banner, { firstName: 'Test', lastName: 'Reader' });
  const text = visibleText(full.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, ''));

  check('end-to-end', 'the doctor/pharmacist sentence is intact and unbroken',
    /Take this report to your doctor or pharmacist before you start, and let them\s+tell you which parts apply to you\./.test(text.replace(/\s+/g, ' ')),
    text.slice(0, 400));
  check('end-to-end', 'no raw markdown markers in the final print document',
    !text.includes('###') && !text.includes('**'), text.slice(0, 400));
  check('end-to-end', 'the safety callout is styled, not bare',
    full.includes('blockquote.safety-callout'), 'print CSS missing the callout rule');
}

// ---------------------------------------------------------------------------
// 5. Em-dash rule (Brew, standing): no em-dashes in customer-facing safety copy.
// ---------------------------------------------------------------------------
{
  for (const persona of PERSONAS) {
    const ctx = deriveMedicalContext(persona.form);
    const combined = [
      buildMedicalContextBanner(ctx),
      buildProteinTargetNote(ctx),
      buildMealPlanMedicalNote(ctx),
      buildElectrolyteProtocol(ctx)
    ].filter(Boolean).join('\n\n');

    const text = visibleText(markdownToHTML(String(combined)));
    const found = (text.match(/.{0,40}—.{0,40}/g) || []).slice(0, 2);
    check(`em-dash/${persona.label}`, 'no em-dash in rendered safety copy',
      !text.includes('—'), found.join(' || '));
  }
}

// ---------------------------------------------------------------------------
// 5b. Hard-wrapped list items stay inside their bullet.
//
// buildElectrolyteProtocol() wraps long bullets across source lines. Before
// 2026-09-09 the continuation closed the list and stranded the remainder at the
// margin, so Report #10 read "Sodium: 3-5 grams a day for most adults, up to 6
// grams if you are training hard" and then, unindented, "or working in the heat."
// ---------------------------------------------------------------------------
{
  const md = [
    '- **Sodium:** 3-5 grams a day for most adults, up to 6 grams if you are',
    '  training hard or working in the heat.',
    '- **Magnesium:** 300-400 mg in the evening.',
    '',
    'A following paragraph must stay outside the list.'
  ].join('\n');

  const html = markdownToHTML(md);

  check('wrapped-list', 'a wrapped bullet stays in one list item',
    /<li>[\s\S]*training hard or working in the heat\.[\s\S]*<\/li>/.test(html), html);
  check('wrapped-list', 'the wrapped list produces exactly two items',
    (html.match(/<li>/g) || []).length === 2, html);
  check('wrapped-list', 'a blank line still closes the list',
    /<\/ul>[\s\S]*A following paragraph must stay outside the list\./.test(html), html);

  for (const persona of PERSONAS) {
    const ctx = deriveMedicalContext(persona.form);
    const proto = buildElectrolyteProtocol(ctx);
    if (!proto) continue;
    const h = markdownToHTML(String(proto));
    check(`wrapped-list/${persona.label}`, 'no stranded lower-case paragraph in the electrolyte protocol',
      !/<p>\s*[a-z]/.test(h), (h.match(/<p>\s*[a-z][^<]{0,60}/) || [''])[0]);
  }
}

// ---------------------------------------------------------------------------
// 6. Sentence continuity in customer-facing safety copy.
//
// Added after a self-inflicted defect on 2026-09-09: removing an em-dash and
// replacing it with a full stop left the following hard-wrapped line starting
// lower case, and the report shipped the sentence "The protein target in this
// report was calculated from your body size, age and goal. it does not know your
// kidney function". Nothing in the suite noticed. Only looking at the PDF did.
// ---------------------------------------------------------------------------
{
  for (const persona of PERSONAS) {
    const ctx = deriveMedicalContext(persona.form);
    const text = visibleText(markdownToHTML(String([
      buildMedicalContextBanner(ctx),
      buildProteinTargetNote(ctx),
      buildMealPlanMedicalNote(ctx),
      buildElectrolyteProtocol(ctx)
    ].filter(Boolean).join('\n\n'))));

    // Split on sentence-final punctuation followed by whitespace. Any fragment
    // that then begins with a lower-case letter is a broken sentence, except
    // where the "sentence end" was really an abbreviation or a decimal.
    const fragments = text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map(f => f.trim())
      .filter(Boolean);

    const broken = fragments.filter(f => /^[a-z]/.test(f) && !/^(e\.g|i\.e|mg|g|kg|mmol)\b/.test(f));

    check(`continuity/${persona.label}`, 'no safety sentence begins in lower case',
      broken.length === 0, broken.slice(0, 2).join(' || '));
  }
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
