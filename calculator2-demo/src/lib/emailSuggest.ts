// Near-miss email domain detection, mirrored from the same logic in
// api/calculator-api.js so the user gets an instant hint before the worker's
// authoritative DNS check runs.
//
// Why this exists: 'ariel.5.vibes@gmail.vom' and 'cqbranton@yagoo.com' both
// passed every validation we had, then bounced for weeks while the people who
// typed them believed they had signed up (ISSUE-067).
//
// This only SUGGESTS. It must never block a submit: the domain list can go
// stale, and a real address that happens to sit one character from gmail.com
// still has to get through. Blocking is the worker's job, decided by DNS.

// Ordered by real subscriber counts.
const COMMON_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'duck.com', 'comcast.net',
  'bellsouth.net', 'sbcglobal.net', 'msn.com', 'live.com', 'me.com',
  'yahoo.ca', 'shaw.ca', 'rogers.com', 'telus.net', 'verizon.net',
]

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 2) return 99
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[b.length]
}

/** Returns a corrected address, or null when nothing is obviously close. */
export function suggestEmailFix(email: string): string | null {
  if (!email) return null
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1).toLowerCase()
  if (!domain.includes('.')) return null
  if (COMMON_EMAIL_DOMAINS.includes(domain)) return null

  let best: string | null = null
  let bestDist = 99
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const d = levenshtein(domain, candidate)
    // Distance 1 is a confident single-character slip. Allow 2 only on longer
    // domains, where a short one like "duck.com" can't be dragged elsewhere.
    if (d < bestDist && (d === 1 || (d === 2 && candidate.length >= 10))) {
      best = candidate
      bestDist = d
    }
  }
  return best ? `${local}@${best}` : null
}
