import { detectGoalConflict, PRIMARY_GOAL_CHOICES } from '../../../../api/goal-semantics.js'

/**
 * Asks the customer which of their two answers should set their calorie target.
 *
 * The questionnaire asks two different questions: a single "What's your goal?" radio
 * in Step 2, and a "What are you hoping to achieve?" checklist here in Step 4. Someone
 * can pick Muscle Gain in the first and tick Weight loss in the second. Those need
 * opposite calorie targets, and until 2026-09-08 nothing asked which one they meant:
 * the calorie maths quietly used the radio while the written sections of the report
 * followed the checklist.
 *
 * The rule for what counts as a contradiction is imported from api/goal-semantics.js,
 * the same module the worker uses at checkout and at report generation. There is no
 * second definition to drift.
 *
 * This component only asks. It never guesses:
 *   - it does not prefer whichever field was answered first, or last
 *   - it does not quietly untick the conflicting motivation
 *   - continuing without choosing is not a choice
 */
/** The only fields this component reads. FormData satisfies it structurally. */
export type GoalConflictInput = {
  goal?: string
  goals?: string[]
  primaryGoalConfirmed?: boolean
}

export default function GoalConflictResolver({
  data,
  onResolve,
}: {
  data: GoalConflictInput
  onResolve: (primaryGoal: string) => void
}) {
  const conflict = detectGoalConflict(data)
  if (!conflict.conflict) return null

  const resolved = data.primaryGoalConfirmed === true
  const current = String(data.goal ?? '')

  // The two directions actually in tension, in the customer's words. Maintenance is
  // offered too: "neither, keep me steady" is a legitimate answer to this question.
  const choices = PRIMARY_GOAL_CHOICES as Array<{ value: string; label: string; plain: string }>

  return (
    <div
      role="group"
      aria-labelledby="goal-conflict-heading"
      style={{
        marginTop: '16px',
        padding: '16px',
        borderRadius: '8px',
        border: `2px solid ${resolved ? '#4a8f4a' : '#d4a574'}`,
        background: resolved ? 'rgba(74,143,74,0.08)' : 'rgba(212,165,116,0.10)',
      }}
    >
      <h4
        id="goal-conflict-heading"
        style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#d4a574' }}
      >
        {resolved ? 'Thanks, that’s sorted' : 'One quick question'}
      </h4>

      {!resolved && (
        <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: 1.55 }}>
          You chose <strong>{conflict.primaryLabel}</strong> as your main goal earlier, and
          you’ve also ticked <strong>Weight loss / fat loss</strong> here. Those need
          different calorie targets, so we need to know which one your numbers should be
          built around.
        </p>
      )}

      {resolved ? (
        <p style={{ margin: 0, fontSize: '15px' }}>
          Your calorie target is built around{' '}
          <strong>{choices.find((c) => c.value === current)?.plain ?? current}</strong>. You can
          change it by picking again below.
        </p>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: resolved ? '10px' : 0 }}>
        {choices.map((c) => {
          const selected = resolved && current === c.value
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onResolve(c.value)}
              aria-pressed={selected}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '15px',
                border: selected ? '2px solid #4a8f4a' : '1px solid #6b6b6b',
                background: selected ? 'rgba(74,143,74,0.15)' : 'transparent',
                color: 'inherit',
              }}
            >
              <strong>{c.plain}</strong>
              <span style={{ opacity: 0.75 }}> &nbsp;({c.label})</span>
            </button>
          )
        })}
      </div>

      {!resolved && (
        <p style={{ margin: '10px 0 0', fontSize: '13px', opacity: 0.8 }}>
          Pick one to continue. We’ll keep everything else you selected.
        </p>
      )}
    </div>
  )
}
