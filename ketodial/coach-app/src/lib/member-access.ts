// Centralized member access eligibility check
// Used by dashboard-state, notes, check-in, and any member-facing route

interface MemberRow {
  status: string
  subscription_status: string | null
  onboarded_at: string | null
  current_period_end: string | null
}

export function canMemberAccessCoaching(member: MemberRow): boolean {
  // Must be active and onboarded
  if (member.status !== 'active' && member.status !== 'test') return false
  if (!member.onboarded_at) return false

  // Check subscription status
  const sub = member.subscription_status || 'none'
  const activeStatuses = ['active', 'trialing']
  const graceStatuses = ['past_due']

  if (activeStatuses.includes(sub)) return true
  if (graceStatuses.includes(sub)) return true

  // Cancelled but still in paid-through period
  if (sub === 'cancelled' && member.current_period_end) {
    return new Date(member.current_period_end) > new Date()
  }

  // Test members always have access
  if (member.status === 'test') return true

  return false
}
