// Where a freshly signed-in person should land.
//
// This lives in one pure function on purpose. Before this file the decision was
// duplicated in login/page.tsx (client-side, after render) and nowhere else, and
// the duplicate had a real bug: an 'onboarding' member was redirected before the
// recovery branch could run, so the only escape hatch a locked-out buyer had was
// unreachable. One function, one set of rules, unit tested.

export type AuthDestinationInput = {
  isAdmin: boolean
  // null means: authenticated, but there is no coach_members row for this user.
  // That is the Google-mismatch case (paid as a@x.com, signed in as b@gmail.com)
  // and also the self-registered-stranger case, since Supabase signup is open.
  memberStatus: string | null
}

export function resolvePostAuthDestination({ isAdmin, memberStatus }: AuthDestinationInput): string {
  if (isAdmin) return '/admin'
  if (memberStatus === null) return '/login?error=nomatch'
  if (memberStatus === 'onboarding') return '/app/onboarding'
  return '/app/dashboard'
}

// Only ever redirect to a path on this origin. A ?redirect= that an attacker
// controls must not be able to bounce a freshly authenticated person to another
// host, and must not be able to smuggle a second URL through a protocol-relative
// value like //evil.example.com.
export function safeRelativePath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.includes('\\')) return null
  return value
}
