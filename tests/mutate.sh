#!/usr/bin/env bash
# Mutation harness. Breaks one protection at a time, proves a named suite goes RED,
# restores the file, and confirms green again. A protection that survives its own
# mutation is not a protection.
set -uo pipefail
cd "$(dirname "$0")/.."

API=api/calculator-api.js
MED=api/medical-context.js
BACKUP=$(mktemp -d)
cp "$API" "$BACKUP/api.js"; cp "$MED" "$BACKUP/med.js"
restore() { cp "$BACKUP/api.js" "$API"; cp "$BACKUP/med.js" "$MED"; }
trap restore EXIT

fails=0
run() { node "tests/$1.test.mjs" >/dev/null 2>&1; }

mutate() {
  local n="$1" desc="$2" suite="$3" script="$4"
  restore
  python3 -c "$script" || { echo "M$n SKIPPED — mutation did not apply"; fails=$((fails+1)); return; }
  if run "$suite"; then
    echo "M$n  ✗ SURVIVED   $desc  [$suite stayed green]"
    fails=$((fails+1))
  else
    echo "M$n  ✓ caught by $suite   $desc"
  fi
  restore
}

echo "=== baseline ==="
for s in health-context-flow report-integrity report-safety report-render-markdown-leak; do
  run "$s" && echo "  green: $s" || { echo "  RED BEFORE MUTATING: $s"; fails=$((fails+1)); }
done
echo
echo "=== mutations ==="

mutate 1 "otherSymptoms removed from the canonical field map" health-context-flow "
s=open('$MED').read()
old=\"symptoms:    ['symptoms', 'otherSymptoms', 'currentSymptoms'],\"
new=\"symptoms:    ['symptoms'],\"
assert s.count(old)==1
open('$MED','w').write(s.replace(old,new))
"

mutate 2 "prompt still sees free-text health context, classifier does not" health-context-flow "
s=open('$MED').read()
old='const clinicalBlob = [conditionsBlob, medicationsBlob, symptomsBlob, narrativeBlob].join(\" | \");'.replace('\"',chr(39))
new='const clinicalBlob = [conditionsBlob, medicationsBlob].join(\" | \");'.replace('\"',chr(39))
assert s.count(old)==1, s.count(old)
open('$MED','w').write(s.replace(old,new))
"

mutate 3 "condition-specific treatment claim restored in Report #8" health-context-flow "
s=open('$API').read()
old='None of this is a finding about you, your questionnaire answers, or anything you told us you are dealing with.'
assert s.count(old)==1, s.count(old)
new='Research on {{diet}} shows promising results for {{goal}} and {{symptomsList}}.'
open('$API','w').write(s.replace(old,new))
"

mutate 4 "physician handout ignores the free-text symptom field" health-context-flow "
s=open('$API').read()
old='result = result.replace(/\\\\{\\\\{symptomsList\\\\}\\\\}/g, medicalContext.symptomsText);'
new='result = result.replace(/\\\\{\\\\{symptomsList\\\\}\\\\}/g, humanizeList(data.symptoms, chr39None reportedchr39));'.replace('chr39',chr(39))
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 5 "renderer drops days 29-30 again" report-integrity "
s=open('$API').read()
old='  for (const week of fullMealPlan.weeks) {\n    const days = week?.days || [];\n    if (!days.length) continue;\n    const names = days[0]?.meals?.map(m => m.name) || [];'
new='  for (const week of fullMealPlan.weeks.slice(0, 4)) {\n    const days = week?.days || [];\n    if (!days.length) continue;\n    const names = days[0]?.meals?.map(m => m.name) || [];'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 6 "groceries ignore days 29-30 while the calendar renders them" report-integrity "
s=open('$API').read()
old='  for (const planWeek of fullMealPlan.weeks) {'
new='  for (const planWeek of fullMealPlan.weeks.slice(0, 4)) {'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 7 "therapeutic interpolation restored in the Report #5 pitch" health-context-flow "
s=open('$API').read()
old=chr(34)+'Dr. [Name], I'+chr(39)+'m planning to change the way I eat to a {{diet}} diet, and I want your input before I start. {{symptomDisclosure}}'
new=chr(34)+'Dr. [Name], I'+chr(39)+'m starting a therapeutic {{diet}} protocol to address {{symptoms}}. This is evidence-based metabolic therapy, not a fad diet.'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 8 "therapeutic interpolation restored in the one-page handout" health-context-flow "
s=open('$API').read()
old='I am planning to start a **{{diet}}** diet.'
new='I am starting a therapeutic {{diet}} protocol to address: **{{symptomsList}}**'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 9 "render-time claim gate removed" health-context-flow "
s=open('$API').read()
old='      assertNoConditionClaimFrames(\`Report #\${num}\`, body, medCtx);'
new='      void num; void body; void medCtx;'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 10 "clearance gate removed from the generator" health-context-flow "
s=open('$API').read()
old='      assertNoUnfoundedClearance(\`Report #\${num}\`, body);'
new='      void body;'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 11 "rule 13 removed, so the model may infer clearance again" health-context-flow "
s=open('$MED').read()
old='13. NEVER tell the reader that their targets, macros, numbers or this plan are'
new='13. RESERVED. Nothing here. Targets, macros, numbers and this plan are'
assert s.count(old)==1, s.count(old)
open('$MED','w').write(s.replace(old,new))
"

mutate 12 "the appropriate-to-follow inference restored in the banner" health-context-flow "
s=open('$MED').read()
old=\"      '> **That is not the same as saying these numbers are right for you.** Nothing you',\"
new=\"      '> Since you did not report anything that would require modified guidance, your',\"
assert s.count(old)==1, s.count(old)
s=s.replace(old,new)
old2=\"      '> is able to answer.'\"
new2=\"      '> targets above are appropriate to follow.'\"
assert s.count(old2)==1, s.count(old2)
open('$MED','w').write(s.replace(old2,new2))
"

# --- GROUP L: one food may not be presented as two (reported 2026-09-09) ----------
# M13-M18 break the fix from a different direction each time. M16 and M18 exist
# because the two cheapest wrong "fixes" (collapse everything to one item / key
# everything the same) would each silence the duplicate assertions while gutting the
# report. A protection that only survives the obvious mutation is not a protection.

mutate 13 "eating-pattern options sample raw database rows again (the original bug)" report-integrity "
s=open('$API').read()
old='const proteinSamples = distinctByBaseFood(availableProteins).slice(0, 3);'
new='const proteinSamples = availableProteins.slice(0, 3);'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 14 "baseFoodKey stops normalizing, so grades read as different foods" report-integrity "
s=open('$API').read()
old='  let key = String(name).trim();'
new='  return String(name).trim().toLowerCase();'+chr(10)+old
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 15 "distinctByBaseFood becomes a pass-through" report-integrity "
s=open('$API').read()
old='function distinctByBaseFood(foods) {'
new=old+chr(10)+'  return Array.from(foods || []);'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 16 "distinctByBaseFood collapses everything to one food (dedupe by destroying variety)" report-integrity "
s=open('$API').read()
old='function distinctByBaseFood(foods) {'
new=old+chr(10)+'  return Array.from(foods || []).slice(0, 1);'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 17 "substitution guide offers another grade of the food you already lack" report-integrity "
s=open('$API').read()
old='  const alternatives = distinctByBaseFood(rest)'
assert s.count(old)==1, s.count(old)
i=s.index(old); j=s.index('.slice(0, 3);', i)+len('.slice(0, 3);')
open('$API','w').write(s[:i]+'  const alternatives = rest.slice(0, 3);'+s[j:])
"

mutate 18 "baseFoodKey returns a constant, merging genuinely different foods" report-integrity "
s=open('$API').read()
old='  let key = String(name).trim();'
new='  return chr39samechr39;'.replace('chr39',chr(39))+chr(10)+old
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

# --- GROUP M: a one-goal section may not print under another goal ---------------
mutate 19 "stall-breaker printed for every goal again (the reported contradiction)" report-integrity "
s=open('$API').read()
old='    const goalKey = resolveGoal(data).key;'+chr(10)+'    if (goalKey === '+chr(39)+'lose'+chr(39)+') {'
new='    const goalKey = resolveGoal(data).key;'+chr(10)+'    if (true || goalKey === '+chr(39)+'lose'+chr(39)+') {'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 20 "suppression drops the tracker instead of renumbering it" report-integrity "
s=open('$API').read()
old='      reports[12] = renumbered;'
new='      void renumbered;'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 21 "tracker kept but not renumbered, so sections jump #11 to #13" report-integrity "
s=open('$API').read()
old=\"      const renumbered = tracker.replace('## Report #13:', '## Report #12:');\"
new='      const renumbered = tracker;'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 22 "unconditional weight-loss promise reintroduced into the timeline" report-render-markdown-leak "
s=open('$API').read()
old='**Days 15-21:** Some people report things like steadier energy'
new='**Days 15-21:** Consistent weight loss and excellent energy, and some people report steadier energy'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 23 "unsupported healing claim reintroduced via the canonical adaptation outlook" report-render-markdown-leak "
s=open('$MED').read()
old='**Week 2:** Some people feel off during this stretch. Others do not.'
new='**Week 2:** Healing benefits appear and energy returns.'
assert s.count(old)==1, s.count(old)
open('$MED','w').write(s.replace(old,new))
"

mutate 24 "meal-plan preamble dropped from the calendar" report-integrity "
s=open('$API').read()
old='## A Note Before You Start'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,'## Removed Heading'))
"

mutate 25 "preamble moved after the plan it introduces" report-integrity "
s=open('$API').read()
i=s.index('## A Note Before You Start')
j=s.index('## The Strategy', i)
para=s[i:j]
s2=s[:i]+s[j:]
k=s2.index('{{mealCalendarWeeks}}')
open('$API','w').write(s2[:k]+'{{mealCalendarWeeks}}'+chr(92)+'n'+chr(92)+'n'+para+s2[k+len('{{mealCalendarWeeks}}'):])
"

# --- RAW MARKDOWN REACHING THE READER (reported 2026-09-09) ---------------------
# M26-M33 are the eight ways this defect can come back. The suite they must break is
# report-render-markdown-leak, which asserts on FINAL HTML. Every pre-existing suite
# asserts on markdown, which is exactly why none of them caught the original.

mutate 26 "customer helper output bypasses markdown parsing entirely" report-render-markdown-leak "
s=open('$API').read()
old='  let contentHTML = markdownToHTML(markdownContent);'
new='  let contentHTML = chr60p+chr62+markdownContent+chr60+chr47+chr112+chr62;'.replace('chr60p','p'+chr(62)).replace('chr60',chr(60)).replace('chr62',chr(62)).replace('chr47',chr(47)).replace('chr112','p')
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,'  let contentHTML = '+chr(39)+chr(60)+'p'+chr(62)+chr(39)+' + markdownContent + '+chr(39)+chr(60)+chr(47)+'p'+chr(62)+chr(39)+';'))
"

mutate 27 "quote markers retained on each quoted line" report-render-markdown-leak "
s=open('$API').read()
old='.replace(/^>[ \\\\t]?/, '+chr(39)+chr(39)+')'
assert s.count(old)>=1, s.count(old)
open('$API','w').write(s.replace(old,'',1))
"

mutate 28 "quoted heading parsing removed" report-render-markdown-leak "
s=open('$API').read()
old='function markdownToBlockHTML(markdown, depth = 0) {'
new=old+chr(10)+'  if (depth > 0) return '+chr(39)+chr(60)+'p'+chr(62)+chr(39)+' + markdown + '+chr(39)+chr(60)+chr(47)+'p'+chr(62)+chr(39)+';'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 29 "quoted blank-line handling removed, so a quote becomes one run-on block" report-render-markdown-leak "
s=open('$API').read()
old='  const lines = markdown.split('+chr(39)+chr(92)+'n'+chr(39)+');'
assert s.count(old)>=1, s.count(old)
i=s.index('function markdownToBlockHTML')
j=s.index(old, i)
open('$API','w').write(s[:j]+'  const lines = markdown.split('+chr(39)+chr(92)+'n'+chr(39)+').filter(l => l.trim() !== '+chr(39)+'>'+chr(39)+');'+s[j+len(old):])
"

mutate 30 "multiline bold handling reduced to single-line" report-render-markdown-leak "
s=open('$API').read()
old='html = html.replace(/\\\\*\\\\*((?:(?!\\\\*\\\\*|<\\\\/p>|<\\\\/h[1-6]>|<\\\\/li>|<\\\\/td>)[\\\\s\\\\S])*?)\\\\*\\\\*/g, '
assert s.count(old)==1, s.count(old)
i=s.index(old); j=s.index(chr(10), i)
new='html = html.replace(/\\\\*\\\\*([^*'+chr(92)+'n]+?)\\\\*\\\\*/g, '+chr(39)+'<strong>\$1</strong>'+chr(39)+');'
open('$API','w').write(s[:i]+new+s[j:])
"

mutate 31 "every '>' character treated as a blockquote" report-render-markdown-leak "
s=open('$API').read()
old='else if (/^>/.test(line)) {'
new='else if (line.includes('+chr(39)+'>'+chr(39)+')) {'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 32 "safety component contents dropped" report-render-markdown-leak "
s=open('$MED').read()
old='export function buildMedicalContextBanner(ctx) {'
new=old+chr(10)+'  return '+chr(39)+chr(39)+';'
assert s.count(old)==1, s.count(old)
open('$MED','w').write(s.replace(old,new))
"

mutate 33 "break-inside protection removed from the safety callout" report-render-markdown-leak "
s=open('$API').read()
old='      break-inside: avoid;'
assert s.count(old)>=1, s.count(old)
open('$API','w').write(s.replace(old,'      break-inside: auto;',1))
"

mutate 34 "underscore-run protection removed, so a signature blank opens a runaway italic" report-render-markdown-leak "
s=open('$API').read()
old='  html = html.replace(/_{3,}/g, (run) => {'
assert s.count(old)==1, s.count(old)
i=s.index('  const underscoreRuns = [];')
j=s.index('  html = html.replace(/__((?:', i)
open('$API','w').write(s[:i]+s[j:])
"

# --- ORDERED LISTS and the ADAPTATION TIMELINE (reported 2026-09-09) -------------
mutate 35 "ordered-list branch removed, numbered items run together again" report-render-markdown-leak "
s=open('$API').read()
old='    else if (/^'+chr(92)+'d{1,3}'+chr(92)+'.'+chr(92)+'s+'+chr(92)+'S/.test(line)) {'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,'    else if (false) {'))
"

mutate 36 "ordered list closes with the wrong tag" report-render-markdown-leak "
s=open('$API').read()
old=\"listTag = 'ol'; }\"
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,\"listTag = 'ul'; }\"))
"

mutate 37 "list continuation lines break out of the item again" report-render-markdown-leak "
s=open('$API').read()
i=s.index('if (listTag && html.endsWith(')
j=s.index(') {', i)+1
assert s.count('if (listTag && html.endsWith(')==1
open('$API','w').write(s[:i]+'if (false'+s[j:])
"

mutate 38 "every numbered-looking line becomes a list item, headings included" report-render-markdown-leak "
s=open('$API').read()
old='    else if (/^'+chr(92)+'d{1,3}'+chr(92)+'.'+chr(92)+'s+'+chr(92)+'S/.test(line)) {'
new='    else if (/'+chr(92)+'d+'+chr(92)+'./.test(line)) {'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 39 "deterministic outcome promises restored in the adaptation timeline" report-render-markdown-leak "
s=open('$API').read()
old='**Action:** Keep logging in your tracker.'
new='**Action:** Enjoy. Note health improvements. Keep logging in your tracker.'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 40 "the timeline stops saying outcomes vary between people" report-render-markdown-leak "
s=open('$API').read()
import re
i=s.index('timeline: \`## Report #11')
j=s.index('\`,', i)
seg=s[i:j]
new=seg.replace('Some people report things like steadier energy','You will have steadier energy')
new=new.replace('Plenty of people don'+chr(39)+'t notice much yet.','')
new=new.replace('Some people say','You will find')
new=new.replace('Some people start to feel steadier here. Others need longer, and that'+chr(39)+'s not a sign you'+chr(39)+'re doing it wrong.','Energy returns here.')
new=new.replace('Some people hit a rough patch in the first week. Others barely notice one. Both are normal.','You will hit a rough patch.')
new=new.replace('varies a lot from person to person','is predictable')
assert new!=seg
open('$API','w').write(s[:i]+new+s[j:])
"

mutate 41 "timeline rows collapse back into one flowing paragraph" report-render-markdown-leak "
s=open('$API').read()
i=s.index('timeline: \`## Report #11')
j=s.index('\`,', s.index('Adaptation isn', i))
seg=s[i:j]
new=seg.replace(chr(92)+'n'+chr(92)+'n**Days', chr(92)+'n**Days').replace(chr(92)+'n'+chr(92)+'n**Action:**', chr(92)+'n**Action:**')
assert new!=seg
open('$API','w').write(s[:i]+new+s[j:])
"

# --- CONTENT: promised outcomes and cardiovascular advocacy (2026-09-09) ---------
mutate 42 "food guide keeps its own adaptation promises instead of the canonical helper" report-render-markdown-leak "
s=open('$API').read()
old='## Week-by-Week Adaptation'+chr(92)+'n'+chr(92)+'n\${buildAdaptationOutlook()}'
new='## Week-by-Week Adaptation'+chr(92)+'n'+chr(92)+'n**Week 3:** Energy returns, mental clarity improves'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 43 "the deterministic-outcome render gate is removed" report-render-markdown-leak "
s=open('$API').read()
old='      assertNoDeterministicOutcomes(\`Report #\${num}\`, body);'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,'      void body;'))
"

mutate 44 "the canonical outlook stops describing variation" report-render-markdown-leak "
s=open('$MED').read()
old='How people feel in the first week varies a lot.'
new='Energy returns by the end of the first week.'
assert s.count(old)==1, s.count(old)
open('$MED','w').write(s.replace(old,new))
"

mutate 45 "CAC zero is presented as absence of disease again" report-render-markdown-leak "
s=open('$API').read()
old='A score of zero means no detectable calcium, which is reassuring but is not proof that there is no disease'
new='A score of 0 means no disease regardless of LDL'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 46 "rising LDL-C is presented as outweighed by other markers" report-render-markdown-leak "
s=open('$API').read()
old='**What to do with a mixed result:**'
new='**Key Insight:** your cardiovascular risk is likely IMPROVING, not worsening.'+chr(92)+'n'+chr(92)+'n**What to do with a mixed result:**'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 47 "particle size is offered as a replacement for LDL-C again" report-render-markdown-leak "
s=open('$API').read()
old='**Ask your doctor:** How do you read my LDL-C and non-HDL-C together'
new='**Ask your doctor:** Can we focus on LDL particle size rather than LDL number? Also how do you read my LDL-C and non-HDL-C together'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 48 "the large-fluffy-LDL advocacy returns" report-render-markdown-leak "
s=open('$API').read()
old='If some markers improve but my LDL-C rises, how do you weigh that'
new='Can we discuss the research on large, fluffy LDL being protective, and how do you weigh that'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 49 "the lab table asserts outcomes as established again" report-render-markdown-leak "
s=open('$API').read()
old=\"| HDL | >40 | Sometimes higher | Interpretation is your doctor's |\"
new='| HDL | >40 | Often ↑ | Protective factor |'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

# --- ADVOCACY vs PATIENT EDUCATION (reported 2026-09-09) -------------------------
mutate 50 "the advocacy render gate is removed" report-render-markdown-leak "
s=open('$API').read()
old='      assertNoAdvocacy(\`Report #\${num}\`, body);'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,'      void num;'))
"

mutate 51 "ApoB is sold as better than LDL again" report-render-markdown-leak "
s=open('$API').read()
old='Would an ApoB add useful information in my situation'
new='Can we order ApoB instead of relying on LDL alone? It is a more accurate cardiovascular marker'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 52 "the Trig/HDL ratio is called protective again" report-render-markdown-leak "
s=open('$API').read()
old='Do you use the triglyceride to HDL ratio'
new='I have read that a Trig/HDL ratio under 2 is protective. Do you use the triglyceride to HDL ratio'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 53 "the three evidence bases are conflated again in the handout" report-render-markdown-leak "
s=open('$API').read()
old='This section separates two different bodies of research on purpose.'
new='Low-carbohydrate / ketogenic / carnivore interventions have peer-reviewed evidence for type 2 diabetes remission.'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 54 "Report #8 goes back to proving the diet works" report-render-markdown-leak "
s=open('$API').read()
old='*What the evidence can and cannot tell us about {{diet}}*'
new='*Why {{diet}} works: Evidence-based research*'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 55 "the direct-carnivore microbiome claim returns" report-render-markdown-leak "
s=open('$API').read()
old='## What to ask your clinician'
new='**Microbiome Changes:** {{diet}} shifts gut bacteria toward beneficial species.'+chr(92)+'n'+chr(92)+'n## What to ask your clinician'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 56 "the doctor-shopping directory returns" report-render-markdown-leak "
s=open('$API').read()
old='### Finding Another Clinician'
new='### Where to Find Carnivore-Friendly Doctors'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 57 "the weak/strong argument scripts return" report-render-markdown-leak "
s=open('$API').read()
old='### If they raise cholesterol'
new='### If they raise cholesterol'+chr(92)+'n'+chr(92)+'n**The Weak Response (Avoid):**'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,new))
"

mutate 58 "Report #9 drops LDL-C from the lipid table again" report-render-markdown-leak "
s=open('$API').read()
old=\"| LDL-C | set by your risk, not by a single cutoff | Sometimes higher | A treatment target in current guidance. Your number is your doctor's call |\"+chr(92)+'n'
assert s.count(old)==1, s.count(old)
open('$API','w').write(s.replace(old,''))
"

echo
echo "=== restored ==="
restore
for s in health-context-flow report-integrity report-safety report-render-markdown-leak; do
  run "$s" && echo "  green: $s" || { echo "  STILL RED: $s"; fails=$((fails+1)); }
done

echo
if [ "$fails" -eq 0 ]; then echo "ALL MUTATIONS CAUGHT, suites restored green"; else echo "$fails PROBLEM(S)"; fi
exit "$fails"
