// The coach is a role, not an invented person.
//
// This product is sold on being straight with people: the AI drafting is
// disclosed, no outcome is promised, and the first cohort is told it is the
// first. A fictional named coach was the one dishonest element in that, and it
// aged badly: when Keren takes over delivery she would either have to perform
// someone else's name or members would watch their coach be replaced.
//
// Signing as the role is true today (AI drafts, a human reviews), stays true
// when Keren joins, and turns into an upgrade rather than a swap when a real
// person eventually signs their own name.
//
// Changed 2026-08-25, before any real member existed, so no continuity was
// broken. If a named human ever fronts this, change it HERE and in the
// SYSTEM_PROMPT sign-off together, or the emails will contradict the replies.

export const COACH_LABEL = 'your coach'
export const COACH_LABEL_CAP = 'Your coach'

export function coachSignOff(site?: string | null): string {
  return site === 'carnivoreweekly'
    ? 'Your coach at Carnivore Weekly'
    : 'Your coach at KetoDial'
}
