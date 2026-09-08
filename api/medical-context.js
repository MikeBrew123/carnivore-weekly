/**
 * api/medical-context.js
 *
 * THE single place that decides what the $29 report is allowed to say to a reader
 * who has told us about a health condition or a medication.
 *
 * Why this file exists
 * --------------------
 * The report collected `conditions`, `otherConditions` and `medications`, computed
 * `{{conditions}}` / `{{medications}}` substitutions, and then used them in exactly
 * zero templates. A 72-year-old on warfarin, metoprolol, furosemide, metformin and
 * levothyroxine with heart failure, AFib and CKD stage 3 received the same medical
 * content as a healthy 51-year-old on nothing: the same 3-7 g sodium load, the same
 * potassium-chloride "Lite Salt" instruction, the same "lower is better" glucose
 * target, the same script for talking a doctor out of a statin.
 *
 * That was one architectural defect, not six content defects, so it gets one fix.
 * Every report section funnels through `replacePlaceholders()`, which always has the
 * full user object. So the medical decisions live here, once, and the report generator
 * (api/calculator-api.js) calls in. It is the only one: api/generate-report.js, the
 * second copy this module used to also serve, was deleted on 2026-09-08.
 *
 * The governing principle
 * -----------------------
 * This product is an automated questionnaire-to-PDF pipeline. It has never seen the
 * reader's labs, does not know their kidney function, and has no clinician in the
 * loop. So when a reader declares a medication or a cardiac / renal / hepatic /
 * blood-pressure condition, the correct behaviour is NOT to give them different
 * numbers. It is to STOP GIVING THEM NUMBERS and route the decision to their
 * prescriber. A shorter section that says "ask your doctor" is the safe answer,
 * not a failure.
 *
 * Where a number does survive (the unflagged path), it is taken from
 * docs/house-claims.md, which is the canonical source for this business. Nothing in
 * this file invents clinical guidance.
 *
 * Fails closed on purpose
 * -----------------------
 * `medications` is free text. Brand names, misspellings, "the little white one for
 * my heart" — no keyword list survives contact with that. So the restriction trigger
 * is deliberately blunt: ANY declared medication, or ANY heart / kidney / liver /
 * blood-pressure condition, withholds the quantitative electrolyte protocol. The
 * keyword lists below only ADD specificity to what the reader is told; they are
 * never the thing that decides whether it is safe to print a number.
 */

// ---------------------------------------------------------------------------
// Keyword lists. These sharpen the wording; they never gate safety on their own.
// ---------------------------------------------------------------------------

/** Conditions where sodium, potassium and fluid are a medical decision. */
const CARDIO_RENAL_CONDITION_TERMS = [
  'heart', 'cardiac', 'cardio', 'chf', 'congestive', 'failure',
  'afib', 'a-fib', 'atrial fibrillation', 'arrhythmia', 'palpitation',
  'hypertension', 'blood pressure', 'bp',
  'kidney', 'renal', 'ckd', 'nephro', 'dialysis', 'nephritis',
  'liver', 'hepatic', 'cirrhosis', 'ascites', 'edema', 'oedema',
  'stroke', 'transplant'
];

/** Drugs that change sodium, potassium, fluid balance or blood pressure. */
const FLUID_ELECTROLYTE_DRUG_TERMS = [
  'diuretic', 'water pill',
  'furosemide', 'lasix', 'bumetanide', 'torsemide', 'ethacrynic',
  'hydrochlorothiazide', 'hctz', 'chlorthalidone', 'indapamide', 'metolazone',
  'spironolactone', 'aldactone', 'eplerenone', 'triamterene', 'amiloride', 'dyazide', 'maxzide',
  'lisinopril', 'enalapril', 'ramipril', 'benazepril', 'captopril', 'quinapril', 'perindopril', 'fosinopril',
  'losartan', 'valsartan', 'irbesartan', 'olmesartan', 'candesartan', 'telmisartan',
  'sacubitril', 'entresto', 'aliskiren',
  'potassium chloride', 'klor-con', 'k-dur', 'lite salt', 'nu-salt', 'no salt',
  'lithium',
  'nsaid', 'ibuprofen', 'naproxen', 'celecoxib', 'diclofenac'
];

/** Drugs that lower blood glucose, or blunt the warning signs of a low. */
const GLUCOSE_LOWERING_DRUG_TERMS = [
  'insulin', 'lantus', 'humalog', 'novolog', 'tresiba', 'levemir', 'basaglar',
  'metformin', 'glucophage',
  'glipizide', 'glyburide', 'glimepiride', 'gliclazide', 'sulfonylurea',
  'repaglinide', 'nateglinide',
  'sitagliptin', 'januvia', 'linagliptin', 'tradjenta', 'saxagliptin',
  'empagliflozin', 'jardiance', 'dapagliflozin', 'farxiga', 'canagliflozin', 'invokana',
  'liraglutide', 'victoza', 'saxenda', 'semaglutide', 'ozempic', 'wegovy', 'rybelsus',
  'dulaglutide', 'trulicity', 'tirzepatide', 'mounjaro', 'zepbound',
  'pioglitazone', 'actos', 'acarbose'
];

/** Beta blockers and rate-control drugs: they mask the adrenergic signs of a low. */
const SYMPTOM_MASKING_DRUG_TERMS = [
  'metoprolol', 'atenolol', 'bisoprolol', 'carvedilol', 'propranolol', 'nebivolol',
  'labetalol', 'sotalol', 'beta blocker', 'beta-blocker',
  'amiodarone', 'digoxin', 'diltiazem', 'verapamil'
];

/**
 * Kidney disease, in any of the ways a reader actually writes it.
 * There is no kidney checkbox on the form, so this has to survive free text in
 * `otherConditions`: "CKD stage 3", "chronic kidney disease", "on dialysis",
 * "my nephrologist says...".
 */
const RENAL_CONDITION_TERMS = [
  'kidney', 'renal', 'ckd', 'esrd', 'nephro', 'nephritis', 'nephropathy',
  'dialysis', 'glomerul', 'creatinine', 'egfr'
];

/** Anticoagulants and antiplatelets: vitamin K intake and bleeding risk matter. */
const ANTICOAGULANT_DRUG_TERMS = [
  'warfarin', 'coumadin', 'jantoven',
  'apixaban', 'eliquis', 'rivaroxaban', 'xarelto', 'dabigatran', 'pradaxa', 'edoxaban', 'savaysa',
  'clopidogrel', 'plavix', 'ticagrelor', 'brilinta', 'prasugrel',
  'heparin', 'enoxaparin', 'lovenox', 'anticoagulant', 'blood thinner'
];

const NONE_VALUES = new Set(['', 'none', 'n/a', 'na', 'no', 'nothing', 'no medications', 'no conditions']);

// ---------------------------------------------------------------------------
// THE CANONICAL HEALTH-CONTEXT FIELD MAP
// ---------------------------------------------------------------------------
/**
 * Every customer-entered field that carries health context, in one place.
 *
 * THE INVARIANT THIS ENCODES
 * --------------------------
 *   If a field the customer typed can influence generated health-related prose,
 *   it must also be visible to this classifier.
 *
 * That is a data-flow rule, not a keyword rule. It was broken on 2026-09-08: a
 * reader typed a structural diagnosis into `otherSymptoms`, buildProfile() put it in
 * the AI prompt under CURRENT SYMPTOMS, and deriveMedicalContext() read only
 * conditions and medications, so the safety layer never saw it. The live section then
 * wrote that protein was "essential for pelvic floor tissue integrity" and that the
 * diet "can support the tissue integrity". Adding that one diagnosis to a blacklist
 * would have fixed that reader and left the next one exposed, because the defect is
 * the gap between what reaches the model and what reaches the gate.
 *
 * SO: adding any new customer health field to the questionnaire means adding it here.
 * `narrative` covers the long free-text boxes, which are prompt inputs too
 * (buildExecutiveSummarySystemPrompt pastes additionalNotes in verbatim).
 *
 * Aliases are deliberate. buildReportData() re-exposes `otherSymptoms` as
 * `currentSymptoms` and `additionalNotes` as `challenges`, so both spellings can
 * reach a generator. meaningful() de-duplicates, so listing both is free.
 */
export const HEALTH_CONTEXT_FIELDS = {
  conditions:  ['conditions', 'healthConditions', 'otherConditions'],
  medications: ['medications', 'currentMedications'],
  symptoms:    ['symptoms', 'otherSymptoms', 'currentSymptoms'],
  narrative:   ['additionalNotes', 'challenges'],
};

/** Gather one field group off the report data object. */
function collectFields(data, keys) {
  return keys.flatMap(k => toList(data?.[k]));
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Turn a form value (array of slugs, free text, undefined) into a clean array. */
function toList(value) {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string' && v.trim());
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[,;\n]/).map(v => v.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Drop the "none"/"n/a" placeholder answers the form allows, and de-duplicate.
 * The report data object carries the condition list under BOTH `conditions` and
 * `healthConditions`, so without this the reader is told "diabetes, diabetes".
 */
function meaningful(list) {
  const seen = new Set();
  return list.filter(v => {
    const key = v.trim().toLowerCase().replace(/[-_]+/g, ' ');
    if (!key || NONE_VALUES.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Render a slug list the way a human wrote it.
 * 'brain-fog' -> 'brain fog'. Returns `fallback` when there is nothing to say.
 */
export function humanizeList(value, fallback = '') {
  const items = meaningful(toList(value)).map(v =>
    v.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  );
  if (!items.length) return fallback;
  return items.join(', ');
}

function matchesAny(haystack, terms) {
  if (!haystack) return false;
  return terms.some(t => haystack.includes(t));
}

// ---------------------------------------------------------------------------
// The classifier
// ---------------------------------------------------------------------------

/**
 * Read everything the reader told us about their health and return a flag set.
 *
 * @param {object} data - the assembled report data object (correctedData)
 * @returns {{
 *   hasDeclaredConditions: boolean,
 *   hasDeclaredMedications: boolean,
 *   conditionsText: string,
 *   medicationsText: string,
 *   cardioRenal: boolean,
 *   fluidElectrolyteDrug: boolean,
 *   glucoseLowering: boolean,
 *   symptomMaskingDrug: boolean,
 *   anticoagulant: boolean,
 *   renal: boolean,
 *   restrictElectrolyteTargets: boolean,
 *   restrictProteinTarget: boolean,
 *   excludedFoodTerms: string[],
 *   hasAnyMedicalContext: boolean
 * }}
 */
export function deriveMedicalContext(data = {}) {
  const conditionItems  = meaningful(collectFields(data, HEALTH_CONTEXT_FIELDS.conditions));
  const medicationItems = meaningful(collectFields(data, HEALTH_CONTEXT_FIELDS.medications));
  const symptomItems    = meaningful(collectFields(data, HEALTH_CONTEXT_FIELDS.symptoms));
  const narrativeItems  = meaningful(collectFields(data, HEALTH_CONTEXT_FIELDS.narrative));

  const conditionsBlob  = conditionItems.join(' | ').toLowerCase().replace(/[-_]+/g, ' ');
  const medicationsBlob = medicationItems.join(' | ').toLowerCase();
  const symptomsBlob    = symptomItems.join(' | ').toLowerCase().replace(/[-_]+/g, ' ');
  const narrativeBlob   = narrativeItems.join(' | ').toLowerCase().replace(/[-_]+/g, ' ');

  // Everything the reader typed about their health. The clinical classifiers below
  // read THIS, not just conditions, because readers put a diagnosis wherever the form
  // let them type: "CKD stage 3" lands in otherConditions for one reader, in
  // otherSymptoms for the next, and in additionalNotes for the third. All three reach
  // the model, so all three must reach the gate.
  const clinicalBlob = [conditionsBlob, medicationsBlob, symptomsBlob, narrativeBlob].join(' | ');
  // Drug-name matching also has to survive "I take warfarin" typed into a notes box.
  const drugBlob = [medicationsBlob, narrativeBlob].join(' | ');

  const hasDeclaredConditions  = conditionItems.length > 0;
  const hasDeclaredMedications = medicationItems.length > 0;
  const hasDeclaredSymptoms    = symptomItems.length > 0;

  const cardioRenal = matchesAny(clinicalBlob, CARDIO_RENAL_CONDITION_TERMS);
  const fluidElectrolyteDrug = matchesAny(drugBlob, FLUID_ELECTROLYTE_DRUG_TERMS);
  const glucoseLowering = matchesAny(clinicalBlob, GLUCOSE_LOWERING_DRUG_TERMS) ||
    /diabet/.test(clinicalBlob);
  const symptomMaskingDrug = matchesAny(drugBlob, SYMPTOM_MASKING_DRUG_TERMS);
  const anticoagulant = matchesAny(drugBlob, ANTICOAGULANT_DRUG_TERMS);
  // Kidney disease is searched across every blob. There is no kidney checkbox, so it
  // arrives as free text, and readers put it wherever the form let them type.
  const renal = matchesAny(clinicalBlob, RENAL_CONDITION_TERMS);

  // FAILS CLOSED. Any declared medication at all, or any cardiac / renal / hepatic /
  // blood-pressure condition, withholds the quantitative electrolyte protocol.
  // We cannot reliably parse free-text drug names, and the drugs that matter here
  // (diuretics, ACE inhibitors, ARBs, potassium-sparing agents, lithium, NSAIDs) are
  // among the most commonly prescribed there are.
  const restrictElectrolyteTargets = hasDeclaredMedications || cardioRenal || fluidElectrolyteDrug;

  // SUPPRESS, DO NOT SUBSTITUTE. calculateMacros() sets protein from body size, age
  // and goal alone; it has never seen an eGFR. In reduced kidney function the right
  // protein intake depends on the stage, on whether the reader is on dialysis, on
  // their nutritional status and on a clinician's assessment. So when kidney disease
  // is declared this report prints NO protein figure at all. It does not print a
  // lower one — picking a lower one would be exactly the clinical judgement this
  // software is not entitled to make.
  const restrictProteinTarget = renal;

  // Foods withheld from the generated plan for a medical reason. These are removals,
  // not swaps to a "safer" food, and this list must never grow a quantity: the choice
  // is between including an item and not including it.
  //
  // Anticoagulants: liver and other organ meats are the densest ordinary source of
  // vitamin K in this food database, and the plan schedules them in ~250-300 g
  // servings on a fixed rotation. Whether that is compatible with a given reader's
  // anticoagulation is a prescriber's call about their INR and their dose. The
  // software's move is to leave the item out and say so.
  const excludedFoodTerms = anticoagulant ? ['liver', 'organ'] : [];

  // CLAIM SCOPE — a separate axis from the restrictions above, on purpose.
  //
  // The restrictions decide whether we may print a NUMBER. This decides whether the
  // live-written sections may assert an OUTCOME for something the reader reported.
  // They are not the same question and must not share a trigger: a reader who reports
  // "bloating" should keep every ordinary macro, food list and adaptation paragraph
  // (nothing here suppresses those), while still never being told that this diet
  // treats their bloating.
  //
  // So this fires on ANY reported condition or symptom, benign or not, and it gates
  // language only. Over-suppressing prose costs a sentence; under-suppressing it
  // ships a medical claim we cannot support.
  const restrictConditionClaims = hasDeclaredConditions || hasDeclaredSymptoms;
  const reportedContextItems = [...conditionItems, ...symptomItems];

  return {
    hasDeclaredConditions,
    hasDeclaredMedications,
    hasDeclaredSymptoms,
    conditionsText: humanizeList(conditionItems, 'None reported'),
    medicationsText: humanizeList(medicationItems, 'None reported'),
    symptomsText: humanizeList(symptomItems, 'None reported'),
    // What the reader themself reported, conditions and symptoms together. This is
    // the provenance-bearing string for the physician handout: it is what the patient
    // typed, not a diagnosis this software has made.
    reportedContextText: humanizeList(reportedContextItems, 'None reported'),
    restrictConditionClaims,
    cardioRenal,
    fluidElectrolyteDrug,
    glucoseLowering,
    symptomMaskingDrug,
    anticoagulant,
    renal,
    restrictElectrolyteTargets,
    restrictProteinTarget,
    excludedFoodTerms,
    hasAnyMedicalContext: hasDeclaredConditions || hasDeclaredMedications || hasDeclaredSymptoms
  };
}

/**
 * Append the medically excluded food terms to whatever the reader already told us
 * not to feed them, so the existing `shouldFilterOutFood()` path does the removal.
 * One mechanism, one place, every generator.
 *
 * @param {string} foodRestrictions - the reader's own avoidFoods / foodRestrictions
 * @param {object} ctx - a context from deriveMedicalContext()
 * @returns {string} a comma-separated restriction list for shouldFilterOutFood()
 */
export function withMedicalFoodExclusions(foodRestrictions, ctx) {
  const terms = (ctx && ctx.excludedFoodTerms) || [];
  if (!terms.length) return foodRestrictions || '';
  const existing = (foodRestrictions || '').trim();
  return existing ? `${existing}, ${terms.join(', ')}` : terms.join(', ');
}

// ---------------------------------------------------------------------------
// Reader-facing copy
// ---------------------------------------------------------------------------

/**
 * The block that makes the report acknowledge what the reader told us, and says
 * plainly what that means for the numbers in it.
 *
 * Note what this is NOT: it is not different clinical advice for sick people. It is
 * an accurate statement of this document's limits plus a route to a clinician.
 */
export function buildMedicalContextBanner(ctx) {
  if (!ctx.hasAnyMedicalContext) {
    return [
      '> **About the numbers in this report.** You did not tell us about any health',
      '> conditions, symptoms or medications, so the general figures here are written for someone',
      '> in that situation. If you are taking anything, or you are being treated for a',
      '> heart, kidney, liver or blood pressure problem, those figures stop applying to',
      '> you and become a question for your doctor.',
      '>',
      '> **That is not the same as saying these numbers are right for you.** Nothing you',
      '> entered triggered an automatic change to them, which is all this questionnaire',
      '> can tell. It has not seen your labs or your history, so whether these targets',
      '> suit you is a question for your healthcare provider, not something this report',
      '> is able to answer.'
    ].join('\n');
  }

  const lines = [
    '> ### What you told us, and what it means for this report',
    '>',
    `> **Conditions you reported:** ${ctx.conditionsText}`,
    `> **Symptoms and concerns you reported:** ${ctx.symptomsText}`,
    `> **Medications you reported:** ${ctx.medicationsText}`,
    '>',
    '> This report was generated automatically from your questionnaire. It has not seen',
    '> your labs, it does not know your kidney function, and it is not a clinician.',
    '> Where it gives numbers — calories, protein, electrolytes, lab ranges — treat them',
    '> as general education, not as targets somebody set for you.',
    '>',
    '> **Take this report to your doctor or pharmacist before you start, and let them',
    '> tell you which parts apply to you.** Do not change, stop, skip or re-time any',
    '> medication because of anything in here. Medication and treatment decisions belong',
    '> to your prescriber.'
  ];

  if (ctx.restrictElectrolyteTargets) {
    lines.push(
      '>',
      '> Because of what you reported, **Report #10 does not give you sodium, potassium',
      '> or fluid amounts.** Those interact directly with heart, kidney and blood pressure',
      '> conditions and with several very common medications, and they are not safe for an',
      '> automated report to set. Ask your prescriber for those numbers.'
    );
  }

  if (ctx.glucoseLowering) {
    lines.push(
      '>',
      '> You reported diabetes or a glucose-lowering medication. A low-carbohydrate diet',
      '> can change your blood glucose quickly. **Tell your prescriber before you start**',
      '> and ask them what to monitor, how often, and what reading should make you call.'
    );
  }

  if (ctx.anticoagulant) {
    lines.push(
      '>',
      '> You reported a blood thinner. Large changes in what you eat — organ meats and',
      '> leafy greens in particular — can affect how some of these medications behave.',
      '> **Your meal plan has had those items left out of it**, and the plan as a whole',
      '> should still be reviewed with your prescriber or pharmacist before you start it,',
      '> along with whether your monitoring schedule should change.'
    );
  }

  if (ctx.restrictProteinTarget) {
    lines.push(
      '>',
      '> You reported kidney disease. **This report does not give you a daily protein',
      '> target.** How much protein is right for you can depend on your kidney function,',
      '> on whether you are being treated and how, on your nutritional status, and on',
      '> your clinician\'s assessment of all three. None of that is in a questionnaire.',
      '> **Ask your doctor or a renal dietitian what your protein target should be**, and',
      '> take this report with you when you do.'
    );
  }

  return lines.join('\n');
}

/**
 * The protein-target note that sits under the kidney question in the physician guide.
 *
 * Two variants, and the difference is the point. For a reader who has NOT declared
 * kidney disease the report does carry a protein figure, so the note tells them what
 * that figure is and is not. For a reader who HAS declared it, there is no figure to
 * discuss, and the note must not imply there is one waiting somewhere in the document.
 */
/**
 * What the patient says to their doctor about what they reported.
 *
 * The distinction this exists to hold: DISCLOSURE is not PURPOSE. Until 2026-09-08
 * the physician guide interpolated the reported condition straight into a claim frame,
 * twice:
 *
 *   "I'm starting a therapeutic Carnivore protocol to address pelvic floor prolapse.
 *    This is evidence-based metabolic therapy, not a fad diet."
 *   "I am starting a therapeutic Carnivore protocol to address: pelvic floor prolapse"
 *
 * Those put words in the patient's mouth that assert the diet is a therapy for her
 * diagnosis, on the sheet she hands a clinician. Nothing the model wrote was involved:
 * rules 11 and 12 govern the two live-written sections and this is a static template,
 * so hardening the prompt did not touch it.
 *
 * The replacement states the condition as something the patient reported and asks the
 * doctor whether the dietary change is appropriate. It deliberately contains no
 * therapeutic verb, so it cannot itself trip assertNoConditionClaimFrames().
 */
export function buildSymptomDisclosure(ctx) {
  if (!ctx || !ctx.hasDeclaredSymptoms) {
    return 'I would like to know whether you think this change is appropriate for me.';
  }
  return `I also want you to know what I am dealing with: ${ctx.symptomsText}. ` +
    `I am not assuming that changing my diet will do anything for that, and nobody has ` +
    `told me it will. I would like to know whether you think this change is appropriate ` +
    `for me, and what you would want to keep an eye on.`;
}

/**
 * THE RENDER-TIME GUARD. Nothing a reader reported may appear in a sentence that
 * frames this diet as therapy for it.
 *
 * Why a render-time check and not only a prompt rule: the bypass found on 2026-09-08
 * was in a hardcoded template. Prompt rules cannot reach a template, the safety
 * classifier only decides what the templates are ALLOWED to say rather than reading
 * back what they did say, and the fixture asserted the handout CONTAINED the symptom
 * without asserting how. Every layer was looking somewhere else. This one reads the
 * finished text, which is the only artifact a customer actually gets.
 *
 * Deliberately narrow. It fires only when a diet/protocol noun and a therapeutic verb
 * share a sentence with the reported condition, so ordinary referral language
 * ("that is one for the clinician who treats it") and the provenance headings
 * ("Symptoms and concerns you reported: ...") do not trip it.
 */
const CLAIM_FRAME_DIET = /\b(carnivore|pescatarian|keto(genic)?|lion|low[- ]carb|protocol|regimen|this diet|the diet|dietary (change|protocol|intervention)|meal plan|this plan|this report|eating this way|way of eating)\b/i;
const CLAIM_FRAME_VERB = /\b(to address|addresses|addressing|address(?=[:\s])|to treat|treats|treating|treatment for|to heal|heals|healing|to repair|repairs|repairing|to reverse|reverses|reversing|to cure|cures|to fix|fixes|resolves?|restores?|rebuilds?|regenerates?|strengthens?|supports? the|improves?)\b/i;
const CLAIM_FRAME_ABSOLUTE = /\b(therapeutic|metabolic therapy|evidence[- ]based (therapy|treatment|metabolic))\b/i;

/**
 * UNFOUNDED CLEARANCE. The report may never tell a reader that its numbers are
 * appropriate, safe or suitable for them.
 *
 * The defect this closes, found in a shipped Report #1 on 2026-09-08:
 *
 *     "Since you haven't reported any medications or conditions that would require
 *      modified guidance, your targets above are appropriate to follow."
 *
 * That is absence of a triggered gate laundered into affirmative medical clearance.
 * All this software knows is that nothing the reader typed matched a rule that would
 * have changed the output. It has not seen their labs, their history, or anything they
 * chose not to type, so "nothing triggered" and "this is appropriate for you" are not
 * the same statement and the second is not ours to make. The unflagged path is the
 * DEFAULT path, which means this sentence is the one most readers would have seen.
 *
 * Deliberately not scoped to the no-context reader: a reader WITH declared context
 * must not be told their targets are fine either.
 *
 * Deferential and interrogative uses are excluded, so the patient asking their doctor
 * "whether you think this change is appropriate for me" does not trip it. The
 * exclusion looks only at the words immediately before the phrase, so a clearance
 * assertion cannot be laundered by appending "but check with your doctor".
 */
const CLEARANCE_PATTERNS = [
  /\b(targets?|numbers?|figures?|macros?|calories|protein|fat|plan|guidance|recommendations?|these|those|it)\b[^.!?]{0,70}\b(are|is|remain|stay|should be|will be)\b[^.!?]{0,40}\b(appropriate|safe|suitable|fine|okay|ok|cleared|sound)\b/i,
  /\b(appropriate|safe|suitable|fine)\s+(to follow|for you|to use|to start|as (?:written|shown|listed))\b/i,
  /\bnothing (?:you|she|he|they) (?:reported|told us)[^.!?]{0,70}\b(unsafe|unsuitable|inappropriate|a problem|contraindicat\w*)\b/i,
  /\byou(?:'re| are) (?:cleared|good to go|all set|in the clear)\b/i,
  /\bno (?:reason|indication)[^.!?]{0,40}\byou (?:can(?:'|no)?t|should not|shouldn't)\b/i,
];
const CLEARANCE_DEFERRAL = /\b(whether|if|ask(?:ing|ed)?|think|question|know|confirm|decide[sd]?|determin\w*|discuss)\b/i;

export function findUnfoundedClearance(text) {
  if (!text) return [];
  const hits = [];
  for (const sentence of String(text).split(/(?<=[.!?])\s+|\n{2,}/)) {
    for (const rx of CLEARANCE_PATTERNS) {
      const m = sentence.match(rx);
      if (!m) continue;
      // Only the words immediately before the phrase can excuse it. A trailing
      // "but review with your doctor" does not turn a clearance into a question.
      const before = sentence.slice(Math.max(0, m.index - 45), m.index);
      if (CLEARANCE_DEFERRAL.test(before)) continue;
      hits.push({ sentence: sentence.trim().slice(0, 300), matched: m[0].slice(0, 120) });
      break;
    }
  }
  return hits;
}

export function assertNoUnfoundedClearance(sectionLabel, text) {
  const hits = findUnfoundedClearance(text);
  if (!hits.length) return;
  throw new Error(
    `${sectionLabel}: the report tells the reader its numbers are appropriate or safe for them. ` +
    hits.map(h => `"${h.sentence}"`).join(' ; ') +
    ` — no triggered restriction means nothing matched a rule, not that a target is ` +
    `medically appropriate. Say what was checked, then route the judgement to a clinician.`
  );
}

export function findConditionClaimFrames(text, ctx) {
  if (!ctx || !ctx.restrictConditionClaims || !text) return [];
  const terms = String(ctx.reportedContextText || '')
    .split(',').map(t => t.trim()).filter(t => t && t.toLowerCase() !== 'none reported');
  if (!terms.length) return [];

  const hits = [];
  for (const sentence of String(text).split(/(?<=[.!?])\s+|\n{2,}/)) {
    const matched = terms.find(t => sentence.toLowerCase().includes(t.toLowerCase()));
    if (!matched) continue;
    const absolute = CLAIM_FRAME_ABSOLUTE.test(sentence);
    const framed = CLAIM_FRAME_DIET.test(sentence) && CLAIM_FRAME_VERB.test(sentence);
    if (absolute || framed) {
      hits.push({ term: matched, sentence: sentence.trim().slice(0, 300) });
    }
  }
  return hits;
}

export function assertNoConditionClaimFrames(sectionLabel, text, ctx) {
  const hits = findConditionClaimFrames(text, ctx);
  if (!hits.length) return;
  throw new Error(
    `${sectionLabel}: a reported condition appears inside a treatment-claim frame. ` +
    hits.map(h => `[${h.term}] "${h.sentence}"`).join(' ; ') +
    ` — the reader's own words may be disclosed, never presented as what this diet treats.`
  );
}

export function buildProteinTargetNote(ctx) {
  if (ctx && ctx.restrictProteinTarget) {
    return [
      '> **You reported kidney disease, so this report does not set a protein target for you,',
      '> and you should not use this script.** Protein intake with reduced kidney function',
      '> depends on your kidney function, your treatment, your nutritional status and your',
      '> clinician\'s assessment. An automated report has none of that. **Ask your doctor or',
      '> a renal dietitian what your protein intake should be**, and follow their number,',
      '> not a general one.'
    ].join('\n');
  }
  return [
    '> **If you have any kidney disease, do not use this script.** Protein intake with',
    '> reduced kidney function is a decision for your doctor or a renal dietitian. The',
    '> protein target in this report was calculated from your body size, age and goal —',
    '> it does not know your kidney function and it is not a target set for you. Take the',
    '> number to your clinician before you start, and let them tell you what it should be.'
  ].join('\n');
}

/**
 * What the meal plan says about items it left out for a medical reason.
 *
 * This is product routing, not clinical guidance: it states that the plan omits
 * something and sends the question to a prescriber. It deliberately does not say how
 * much of the omitted food would have been acceptable, because that is the question
 * the software is not allowed to answer.
 */
export function buildMealPlanMedicalNote(ctx) {
  if (!ctx || !ctx.excludedFoodTerms || !ctx.excludedFoodTerms.length) return '';
  return [
    '> **A note on what is not in this plan.** You reported medication that can make',
    '> specific food choices clinically relevant, so this meal plan leaves out organ',
    '> meats, including liver. That is not a judgement about whether you can eat them —',
    '> it is that the amount, if any, is a decision for the person who prescribes and',
    '> monitors your medication, and not one an automated plan should be making for you.',
    '> **Discuss specific dietary restrictions with your prescribing clinician or',
    '> pharmacist**, and take this plan with you.'
  ].join('\n');
}

/**
 * Report #10, the electrolyte section.
 *
 * Restricted path: no sodium, potassium or fluid numbers, no potassium-chloride
 * product, no "add salt" symptom triage. Referral instead.
 *
 * Unflagged path: the general protocol, with every number taken from
 * docs/house-claims.md. The potassium-chloride ("Lite Salt") instruction is removed
 * for everyone — house-claims.md: "We do not give bulk KCl dosing instructions."
 */
export function buildElectrolyteProtocol(ctx, { potassiumSource = 'protein' } = {}) {
  if (ctx.restrictElectrolyteTargets) {
    return [
      '## Your Electrolyte Section Is Different',
      '',
      'Because of what you told us above, this section does not look like the standard one.',
      '',
      'Sodium, potassium and fluid intake interact directly with heart, kidney, liver and',
      'blood pressure conditions, and with several of the most commonly prescribed',
      'medications there are — diuretics, ACE inhibitors, ARBs and potassium-sparing drugs',
      'among them.',
      '',
      '**So this report does not give you sodium, potassium, fluid or supplement amounts.**',
      'Those are a medical decision about you specifically. This is an automatically',
      'generated document that has never seen your labs or your kidney function, and',
      'getting these numbers wrong in either direction is not a small thing.',
      '',
      '### What to ask your prescriber instead',
      '',
      '- How much sodium should I be getting, and should I be adding any at all?',
      '- Is there an amount of fluid you want me to stay near, or stay under?',
      '- **Before I take any potassium supplement or salt substitute** — is that safe for me?',
      '  Most salt substitutes and "lite salt" products are potassium chloride, and several',
      '  common medications change how your body handles potassium.',
      '- Do you want to recheck my kidney function and electrolytes after a few weeks of a',
      '  diet change?',
      '- What should I watch for at home, and what should make me call you?',
      '',
      '**Do not start, stop or change the dose of anything on your own** — that includes',
      'over-the-counter salt, potassium and magnesium products.',
      '',
      '### If you feel unwell, do not treat it with salt',
      '',
      'Dizziness, light-headedness, palpitations, unusual weakness or fatigue, confusion,',
      'new swelling, shortness of breath, or a noticeable change in how much you are',
      'urinating are reasons to **contact your doctor or seek urgent care**. They are not',
      'reasons to add salt or electrolytes. On a low-carbohydrate diet it is tempting to',
      'read every symptom as "keto flu". With your history, that assumption is the risk.'
    ].join('\n');
  }

  return [
    '## The Ketoade Recipe',
    '',
    '### Ingredients',
    '- 1 liter water',
    '- 1 teaspoon salt, Redmond or Himalayan (1 tsp salt is about 2.3 g sodium)',
    '- Pinch of magnesium powder (optional, 200-300mg)',
    '- Lemon/lime juice (optional)',
    '',
    '### Instructions',
    '1. Mix all ingredients',
    '2. Sip through the day, especially weeks 1-4',
    '',
    '## Daily Electrolyte Goals',
    '',
    '- **Sodium:** 3-5 grams a day for most adults, up to 6 grams if you are training hard',
    '  or working in the heat. Spread it through the day rather than taking it all at once.',
    '- **Potassium:** food first — meat covers most of it, and this diet is built on'
      + ` ${potassiumSource}. For reference, the adequate intake figures are 2,600 mg a day`,
    '  for adult women and 3,400 mg for adult men. Those are adequate intakes, not a bar you',
    '  have to clear, and falling a little short is not a deficiency.',
    '- **Magnesium:** 300-400 mg of magnesium glycinate in the evening. Skip magnesium oxide,',
    '  it is poorly absorbed.',
    '',
    '**On salt substitutes:** "Lite Salt" and similar products are potassium chloride. This',
    'report does not give potassium chloride dosing, and you should not start one without',
    'asking your doctor — particularly if you are ever prescribed a blood pressure, heart or',
    'kidney medication.',
    '',
    '## Signs to Pay Attention To',
    '',
    '⚠️ **Headaches, weeks 1-2** → commonly under-salting. Salt your food.',
    '⚠️ **Muscle cramps** → sodium and magnesium are the usual first place to look.',
    '⚠️ **Fatigue** → common during the first two weeks of adaptation.',
    '⚠️ **Dizziness or light-headedness** → sit or lie down. If it is severe, keeps coming',
    'back, or arrives with chest pain, palpitations, confusion, fainting or shortness of',
    'breath, **contact your doctor or seek urgent care.** Do not treat it by loading salt.',
    '',
    '**These figures assume you have no heart, kidney, liver or blood pressure condition and',
    'take no medication. If that changes, they stop applying to you — ask your prescriber.**'
  ].join('\n');
}

// ---------------------------------------------------------------------------
// LLM guardrails
// ---------------------------------------------------------------------------

/**
 * The safety rule block for the two AI-written sections (Executive Summary,
 * Obstacle Protocol). These are the only sections that receive the reader's
 * medication list, and they previously ran at temperature 1.0 under a rule set that
 * contained no medication prohibition at all — while rule 1 ("NEVER suggest removing
 * or substituting electrolytes") forbade the one caveat these readers needed.
 *
 * Rule 3 below is the specific repair of that inversion.
 */
export function buildMedicalSafetyRules(ctx) {
  const rules = `

⚠️ MEDICAL SAFETY — CRITICAL RULES. These override every other instruction in this
prompt, including tone, format and length. If a rule here conflicts with anything
above, the rule here wins.

1. NEVER give medication advice of any kind. Do not name a dose. Do not suggest
   changing, adjusting, tapering, reducing, increasing, stopping, skipping, splitting,
   re-timing or substituting any medication or supplement. Do not predict that a
   medication will become unnecessary, and do not frame reduced medication as a goal,
   a milestone or a reward. Medication decisions belong to the reader's prescriber.
2. NEVER tell the reader to act on a lab value, glucose meter reading, blood pressure
   reading or symptom by changing their own treatment. Route every such decision to
   their clinician.
3. Do not tell the reader to replace dietary electrolytes with fat or butter — salt is
   not interchangeable with fat. BUT you MAY and MUST tell a reader who has declared a
   medical condition or a medication that sodium, potassium, fluid and supplement
   amounts have to be cleared with their prescriber before they change anything.
   Saying that is REQUIRED. It is not "removing electrolytes" and rule 3's first
   sentence does not prohibit it.
4. Do not give quantitative sodium, potassium, fluid or supplement targets to a reader
   who has declared any medication, or any heart, kidney, liver or blood pressure
   condition. Give no number; refer them to their clinician for it.
5. Do not argue with, dismiss, or hand the reader a script for overriding a doctor's
   concern. Never call a clinical concern a myth, outdated, or a misunderstanding.
   Never suggest changing or leaving a doctor.
6. Do not diagnose. Do not interpret the reader's labs. Do not tell them a condition
   will improve, reverse or resolve.
7. If the reader declared any condition or medication, state plainly and early that
   this plan is general, was generated automatically, and should be reviewed with their
   clinician before they start it.
8. Symptoms are not to be self-treated with salt or food. Dizziness, palpitations,
   confusion, unusual weakness, swelling or shortness of breath go to a clinician.
9. Do not give a protein target of any kind to a reader who has declared kidney
   disease — no grams per day, no grams per kilogram, no percentage of calories, no
   per-meal amount, no range. Do NOT give them a smaller or more cautious number
   either. Give no number, and send the question to their doctor or renal dietitian.
   Choosing a protein intake for reduced kidney function is a clinical decision and
   you are not making it.
10. If an item has been left out of this reader's meal plan for a medical reason, do
   not add it back, do not suggest eating it, and do not state an amount of it that
   would be acceptable. Say the amount is a question for their prescriber.
11. NEVER claim, imply or hint that this diet treats, heals, cures, reverses, repairs,
   resolves or improves any condition, symptom or diagnosis the reader reported. You
   MAY state that they told us about it, and you MAY say the condition itself belongs
   with a clinician who treats it. You may NOT connect this diet to an outcome for it,
   in either direction, however hedged. "X won't fix it, but it can support Y" is a
   claim about X and is prohibited by this rule.
12. NEVER attribute tissue, ligament, tendon, joint, pelvic floor, organ, bone or
   connective-tissue repair, healing, support, integrity or strengthening to food,
   protein, fat or this diet. Do NOT convert a general nutrient statement into
   condition-specific treatment language: "protein is essential for <their condition>
   tissue integrity" is prohibited even though "protein is essential" is fine on its
   own. Do NOT offer reduced inflammation as a treatment mechanism for something they
   reported. Do NOT cite testimonials, anecdotes, success stories, books, influencers,
   or "many people report" / "some people find" phrasing as evidence for any of it,
   including when the reader raised the story themself.
13. NEVER tell the reader that their targets, macros, numbers or this plan are
   appropriate, safe, suitable, fine or cleared for them, and NEVER derive that from
   the absence of a declared condition or medication. "You didn't report anything that
   requires modified guidance, so these targets are appropriate to follow" is
   PROHIBITED. All this system knows is that nothing they typed matched a rule that
   would have changed the output; it has not seen their labs, their history, or
   anything they chose not to type. State what was and was not checked, then send the
   judgement to their clinician. The correct shape is: "You did not report anything
   that triggered an automatic change to these targets. That is not the same as this
   questionnaire knowing they are right for you, so please go through them with your
   healthcare provider."`;

  if (!ctx || !ctx.hasAnyMedicalContext) {
    // Rule 13 belongs HERE most of all. The clearance sentence that shipped on
    // 2026-09-08 was written for exactly this reader: the one who declared nothing,
    // on the default path, which is most customers. Emitting the reminder only in the
    // has-context branch would leave it missing from the case it exists for.
    return rules + `

MEDICAL CONTEXT FOR THIS READER: none declared. Do not invent conditions or
medications they did not report, and do not write as though they have any.
- Rule 13 is ALWAYS ACTIVE. They declared nothing, which means nothing they typed
  matched a rule that would have changed these targets. That is ALL it means. Do not
  turn it into "so these targets are appropriate for you", in those words or any
  others. Say what was checked, and send the question of whether the numbers suit
  them to their healthcare provider.`;
  }

  const notes = [];
  notes.push('- Rule 13 is ALWAYS ACTIVE. Whatever this reader did or did not declare, ' +
    'do not tell them their targets are appropriate, safe or suitable for them, and do ' +
    'not infer that from anything they left blank.');
  if (ctx.restrictConditionClaims) {
    notes.push(`- The reader reported: ${ctx.reportedContextText}. Rules 11 and 12 are ACTIVE for ` +
      `every one of those. Refer to them ONLY as what the reader told us, and send the ` +
      `condition itself to a clinician who treats it. This restricts LANGUAGE, not content: ` +
      `their macros, food lists, meal timing, shopping guidance and ordinary adaptation ` +
      `advice all stay normal and complete. Do not thin the section out, and do not ` +
      `substitute a vaguer claim for a specific one.`);
  }
  if (ctx.restrictElectrolyteTargets) {
    notes.push('- Rule 4 is ACTIVE. Give this reader no sodium, potassium or fluid numbers at all.');
  }
  if (ctx.glucoseLowering) {
    notes.push('- Glucose-lowering treatment declared. Give no blood glucose target and no glucose threshold. Do not suggest that a low reading is a good result.');
  }
  if (ctx.symptomMaskingDrug) {
    notes.push('- A rate-control or beta-blocker medication was declared. Do not tell this reader to judge anything by heart rate or by how a symptom feels.');
  }
  if (ctx.anticoagulant) {
    notes.push('- An anticoagulant or antiplatelet was declared. Their meal plan has had organ meats, including liver, REMOVED. Do not suggest they eat liver or other organ meats, do not suggest an amount of them that would be acceptable, and do not offer to add them back. If the omission comes up, say the amount is a question for their prescriber or pharmacist.');
  }
  if (ctx.restrictProteinTarget) {
    notes.push('- Kidney disease was declared. Rule 9 is ACTIVE. Give this reader NO protein target, in grams, in grams per kilogram, as a percentage of calories, as a per-meal amount, or as a range. Do not state a lower or "safer" protein figure — state no figure. Send the protein question to their doctor or a renal dietitian.');
  }
  if (ctx.cardioRenal) {
    notes.push('- A heart, kidney, liver or blood pressure condition was declared. Do not set protein, sodium, potassium or fluid amounts for this reader.');
  }

  return rules + `

MEDICAL CONTEXT FOR THIS READER — the rules above are live, not theoretical:
- Conditions reported: ${ctx.conditionsText}
- Symptoms and concerns reported: ${ctx.symptomsText}
- Medications reported: ${ctx.medicationsText}
${notes.join('\n')}

Acknowledge this context once, briefly and without alarm, and tell them to review the
plan with their clinician before starting. Then write the section you were asked for.
Do not turn the section into medical commentary, and do not speculate about their
diagnoses or their treatment.`;
}
