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
for s in health-context-flow report-integrity report-safety; do
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
old='The research below is general. It is not a finding about you, your questionnaire answers, or anything you told us you are dealing with:'
new='Research on {{diet}} shows promising results for {{goal}} and {{symptomsList}}:'
assert s.count(old)==1, s.count(old)
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

echo
echo "=== restored ==="
restore
for s in health-context-flow report-integrity report-safety; do
  run "$s" && echo "  green: $s" || { echo "  STILL RED: $s"; fails=$((fails+1)); }
done

echo
if [ "$fails" -eq 0 ]; then echo "ALL MUTATIONS CAUGHT, suites restored green"; else echo "$fails PROBLEM(S)"; fi
exit "$fails"
