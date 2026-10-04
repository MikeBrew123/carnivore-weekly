# PescoDial calculator: replacement copy (Sarah, 2026-10-04)

Source review: `~/Downloads/PescoDial-Calculator-Review/REVIEW.md`, items 7, 8, 13, 14, 18, 20, 21, 23, 28, 29.
Source read (read-only): `pescodial/templates/_calculator.html`, `pescodial/templates/_how_it_works.html`, `pescodial/static/js/calculator.js`, `pescodial/static/js/pd-macros.js`. These files are in the main checkout. They are not in the `pescodial-build` worktree.
Copy only. No source files edited. No em dashes. US spelling.

---

## 1. Item #7: results explainer (also covers #21)

**Where:** `calculator.js`, the `set('basis', ...)` line (around line 205). It goes into `<p class="results-basis" data-r="basis">`, under the stat grid. This text replaces the whole current basis sentence. Keep "Based on {style}" as the first sentence if you want the style named.

**Lose (normal):**

> You burn about {maintenance} calories a day. Your target of {target} is {deficit_pct}% less than that, and your protein is based on your goal weight of {goal_weight} {unit}.

**Maintain:**

> You burn about {maintenance} calories a day, so that's your target for keeping your weight steady. Your protein is based on your current weight of {goal_weight} {unit}.

**Lose, floor applied (replaces "held at the lowest daily amount we use for a self-guided plan"):**

> You burn about {maintenance} calories a day. A 20% cut would take you under {floor}, the lowest we'll suggest without a doctor, so we kept you at {floor}. Your protein is based on your goal weight of {goal_weight} {unit}.

Developer notes:
- `{deficit_pct}`: use 20 for a normal Lose result. For the floor case the sentence says "20%" on purpose and doesn't need the effective percent.
- `{maintenance}` and `{target}`: format with a thousands comma (1,677), same as the Calories stat.
- **Protein basis is not always the typed weight.** `pd-macros.js` swaps in a weight at BMI 25 when the goal BMI (or current BMI, on Maintain) is 30 or more, and raises it to BMI 18.5 when the goal is lower than that. When either swap happens, the last sentence has to change, or it will be wrong. Use this ending instead:

  > Your protein is based on {protein_basis} {unit}, a weight in the healthy range for your height.

  (`{protein_basis}` = the weight the engine actually used, converted to her units and rounded.)
- I left out a weekly pace ("about 0.6 lb a week"). That reads as a promise, and real results vary too much.

---

## 2. Item #8: fish-meals heading per style

**Where:** `_calculator.html`, `.fish-box` `<h3>` and the `<p>` under it. Both need to change by style. Today they are hard-coded, so they need to come from the style data in `calculator.js`.

**Mediterranean and Low Carb:**
- Heading: `About 5 fish meals a week`
- Body: `Build about 5 meals a week around fish or seafood. Make at least 2 of them oily fish such as salmon, sardines, trout or Atlantic mackerel. Canned and frozen fish count.` (unchanged)

**Keto and Carnivore:**
- Heading: `Fish or seafood every day`
- Body: `Have fish or seafood at least once every day. Try to make oily fish such as salmon, sardines, trout or Atlantic mackerel part of at least 2 or 3 of those days. Canned and frozen fish count.`

---

## 3. Item #13: "nottarget" panel

**Where:** `_calculator.html`, `<div data-state="nottarget">`. Replace the heading, the paragraph and the button row.

- Heading: `We can't suggest a weight-loss target`
- Paragraph: `Your body already uses about as few calories as the lowest amount we'll suggest without a doctor. Cutting below that isn't something a calculator should set for you. Your doctor or a registered dietitian can work out numbers that fit you.`
- New line before the buttons: `We can show you numbers for keeping your weight steady.`
- Primary button: `Show numbers to maintain` (same label and `data-maintain` behavior as the underweight panel)
- Secondary link: `Check my answers` (unchanged)

**Flag for Brew (a judgment call, not copy):** this panel only shows when her maintenance number is at or below 1,200 (women) or 1,500 (men). The maintain button will therefore show a calorie number under the floor we call "the lowest we'll suggest without a doctor." The underweight panel doesn't have this problem. If Brew decides that's not acceptable, drop the button and the new line, and ship the heading and paragraph alone.

---

## 4. Item #14: step 3 email line

**Where:** `_calculator.html`, `<p id="email-note">`. Replace the full sentence.

> Your results show on the next screen. We'll also send a short welcome series that explains what the numbers mean. Unsubscribe anytime.

Optional heading change, since the email no longer delivers the results. Current heading: "Where should we send your results?" Suggested:

> Almost there. What's your email?

---

## 5. Item #18: activity descriptions

**Where:** `_calculator.html`, the activity fieldset. Same four options, same values (1.2 / 1.375 / 1.55 / 1.725). Only the `choice-desc` text changes.

| Option | Value | `choice-desc` |
|---|---|---|
| Mostly sitting | 1.2 | `Desk job or home most of the day, little planned exercise` |
| Lightly active | 1.375 | `Gentle walks or light exercise most days` |
| Moderately active | 1.55 | `Exercise 3 to 5 days a week` (unchanged) |
| Very active | 1.725 | `Hard exercise most days` (unchanged) |

To match, change "1.2 if you're sedentary" in "How this calculator works" to "1.2 if you mostly sit". See item 8 below for the full paragraph.

---

## 6. Item #20: Carnivore sample-day dinner

**Where:** `calculator.js`, line 23, the Carnivore `sample` array, Dinner entry.

> Seared scallops or shrimp with a fried egg

---

## 7. Item #23: lighter doctor line above results

**Where:** `_calculator.html`, step 4 `.notice-doctor`. Replace both paragraphs with one sentence and use normal weight, smaller type.

> These numbers are for generally healthy adults, so check with your doctor first if you take medicine or have a health condition.

---

## 8. Item #28: "How this calculator works" protein paragraph

**Where:** `_how_it_works.html`, the paragraph that starts "Protein is set from your goal weight." Replace that whole paragraph.

> Protein is set from your goal weight, or your current weight if you chose to maintain. Pescatarian Mediterranean aims for about 1.2 grams of protein per kilogram, and Pescatarian Low Carb, Keto and Carnivore aim for about 2 grams per kilogram. If that weight is well above the healthy range for your height, we use a weight in the healthy range instead, so protein doesn't come out higher than you need. On Pescatarian Mediterranean, protein also stays at or below about 35% of your calories.

Also in the first paragraph, to match item 5: change "1.2 if you're sedentary" to "1.2 if you mostly sit".

---

## 9. Item #29: privacy line by the email box

**Where:** `_calculator.html`, step 3, directly after the item 4 email note (same `<p>` or the next one). Link "Privacy policy" to the site's privacy page.

> We never share your email. <a href="/privacy/">Privacy policy</a>

(Check the privacy page path before shipping. I used `/privacy/` as a placeholder.)
