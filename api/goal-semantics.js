/**
 * api/goal-semantics.js
 *
 * THE definition of what a customer's goal means, and of when their answers
 * contradict each other. Imported by BOTH the Cloudflare worker
 * (api/calculator-api.js) and the calculator front end
 * (calculator2-demo/src/...), so there is exactly one rule and the two cannot
 * drift apart.
 *
 * Plain ES module, no dependencies, no runtime assumptions: it must load in a
 * Worker isolate and in a browser bundle alike. Do not import anything here.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The questionnaire asks two different questions:
 *
 *   goal   a single radio: Fat Loss / Maintenance / Muscle Gain. This is the
 *          field the calorie maths consumes, so it alone sets the direction.
 *   goals  a multi-select of motivations, which can include "weightloss".
 *
 * Nothing reconciled them. A customer whose `goal` was Muscle Gain, and whose
 * calorie target was therefore a surplus, also had "weightloss" ticked. The
 * report then described her surplus as supporting fat loss.
 *
 * The right answer to "which of these two did you mean" is to ask the customer.
 * So the contradiction is detected here, surfaced in the questionnaire before
 * payment, blocked at checkout, and blocked again at report generation. Same
 * function, three places.
 */

/**
 * THE canonical goal for a reader. Every customer-facing mention of the goal, and the
 * calorie direction, must come from here.
 *
 * Why this exists: the report used to render {{goal}} as the raw enum, so a reader saw
 * "Focus: gain" in report #3 and "promising results for gain" in report #8. Separately,
 * buildProfile() handed the model TWO fields one screen apart: `goal` (the single
 * radio: Fat Loss / Maintenance / Muscle Gain) and `goals` (a multi-select of
 * motivations that can include "weightloss"). A reader whose macros were computed as a
 * 10% surplus received a Mission Brief describing her calories as supporting fat loss,
 * because the model resolved the contradiction the other way.
 *
 * `goal` is authoritative: it is the field calculateMacros() consumes, so it is the one
 * the arithmetic in the report already reflects. `goals` is motivation, not direction.
 * This function does not decide between them; it names which is which.
 */
export function resolveGoal(source) {
  const raw = String(source?.goal ?? 'maintain').toLowerCase().trim();
  // 'loss' is accepted because older sessions stored it; calculateMacros accepts it too.
  const key = (raw === 'lose' || raw === 'loss') ? 'lose'
            : raw === 'gain' ? 'gain'
            : 'maintain';
  const LABELS = { lose: 'Fat Loss', maintain: 'Maintenance', gain: 'Muscle Gain' };
  const DIRECTIONS = {
    lose: 'a calorie deficit',
    maintain: 'calorie maintenance',
    gain: 'a calorie surplus',
  };
  return { key, label: LABELS[key], direction: DIRECTIONS[key] };
}

/**
 * GOAL CONFLICT DETECTION
 * -----------------------
 * The questionnaire asks two different things and stores them in two fields:
 *
 *   goal   a single radio: Fat Loss / Maintenance / Muscle Gain. This is the field
 *          calculateMacros() consumes, so it alone sets the calorie direction.
 *   goals  a multi-select of motivations, which can include "weightloss".
 *
 * Nothing reconciled them. A reader whose `goal` was Muscle Gain, and whose macros
 * were therefore a 10% surplus, also had "weightloss" ticked in `goals`. The live
 * sections then described her surplus as supporting fat loss, because the model was
 * handed both fields and picked the wrong one.
 *
 * Making the prompt clearer is necessary but not sufficient: the right answer to
 * "which of these two contradictory things did you mean" is to ask the reader, not to
 * ask a language model to guess. So generation FAILS CLOSED on an unresolved material
 * contradiction rather than shipping a report that argues with itself.
 *
 * `primaryGoalConfirmed` is how the frontend records that the reader was shown the
 * contradiction and chose. Historical sessions do not have it and are never rewritten;
 * they surface as unresolved, which is accurate.
 */
export const MOTIVATIONS_CONTRADICTING = {
  // normalized motivation tokens that pull against each primary goal
  gain:     ['weightloss', 'weight-loss', 'fatloss', 'fat-loss', 'loseweight', 'lose-weight', 'slimdown'],
  lose:     ['musclegain', 'muscle-gain', 'gainmuscle', 'gain-muscle', 'bulk', 'bulking', 'weightgain', 'weight-gain'],
  // Maintenance conflicts with BOTH directions. Keep this the union of the two lists
  // above: a token added to one of them and forgotten here is a contradiction that
  // slips through for maintenance customers only, which is exactly how "bulking" was
  // missed until the flow suite went looking for it.
  maintain: ['weightloss', 'weight-loss', 'fatloss', 'fat-loss', 'loseweight', 'lose-weight', 'slimdown',
             'musclegain', 'muscle-gain', 'gainmuscle', 'gain-muscle', 'bulk', 'bulking',
             'weightgain', 'weight-gain'],
};

export const normalizeMotivation = m => String(m).toLowerCase().trim().replace(/[\s_]+/g, '');

/**
 * @returns {{conflict:boolean, resolved:boolean, blocking:boolean, primary:string,
 *            primaryLabel:string, conflicting:string[], message:string}}
 */
export function detectGoalConflict(data) {
  const primary = resolveGoal(data);
  const raw = data?.goals;
  const motivations = (Array.isArray(raw) ? raw : String(raw ?? '').split(','))
    .map(normalizeMotivation).filter(Boolean);

  const against = (MOTIVATIONS_CONTRADICTING[primary.key] || []).map(normalizeMotivation);
  const conflicting = motivations.filter(m => against.includes(m));
  const conflict = conflicting.length > 0;
  const resolved = data?.primaryGoalConfirmed === true;

  return {
    conflict,
    resolved,
    blocking: conflict && !resolved,
    primary: primary.key,
    primaryLabel: primary.label,
    conflicting,
    message: conflict
      ? `The primary goal is "${primary.label}", which sets the calorie target to ` +
        `${primary.direction}, but the motivations include ${conflicting.map(c => `"${c}"`).join(', ')}. ` +
        `These point in opposite directions and the reader has not been asked which should drive ` +
        `the calorie target.`
      : '',
  };
}


/**
 * The valid primary goals, with the words a customer actually reads. The
 * resolution UI renders these; nothing else should hardcode the labels.
 */
export const PRIMARY_GOAL_CHOICES = [
  { value: 'lose',     label: 'Fat Loss',     plain: 'Losing weight' },
  { value: 'maintain', label: 'Maintenance',  plain: 'Staying at my current weight' },
  { value: 'gain',     label: 'Muscle Gain',  plain: 'Gaining muscle' },
];

/**
 * The only value that counts as a customer having resolved the contradiction.
 * Exported so the client cannot invent its own looser notion of consent.
 */
export const RESOLUTION_FLAG = 'primaryGoalConfirmed';
