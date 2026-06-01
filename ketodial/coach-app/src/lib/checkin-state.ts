// Canonical check-in state computation
// Single source of truth — used by dashboard state loader and check-in form

type CheckInStatus = 'due' | 'submitted' | 'overdue' | 'not_open'

interface CheckInState {
  status: CheckInStatus
  can_submit: boolean
  submitted_at: string | null
  period_start: string
  period_end: string
  bonus_credits_available: number
}

export function getCurrentCheckInState(
  member: { tier: string; status: string; bonus_credit_balance: number; timezone: string },
  latestCheckin: { submitted_at: string; period_start: string; period_end: string } | null,
  now: Date = new Date()
): CheckInState {
  // Only active members can check in
  if (member.status !== 'active') {
    return {
      status: 'not_open',
      can_submit: false,
      submitted_at: null,
      period_start: '',
      period_end: '',
      bonus_credits_available: 0,
    }
  }

  // Calculate current week window (Sunday to Saturday)
  const currentSunday = getLastSunday(now)
  const currentSaturday = new Date(currentSunday)
  currentSaturday.setDate(currentSaturday.getDate() + 6)

  const periodStart = currentSunday.toISOString().split('T')[0]
  const periodEnd = currentSaturday.toISOString().split('T')[0]

  // Check if there's a check-in for this period
  const hasCheckinThisPeriod = latestCheckin &&
    latestCheckin.period_start === periodStart

  if (hasCheckinThisPeriod) {
    return {
      status: 'submitted',
      can_submit: false,
      submitted_at: latestCheckin!.submitted_at,
      period_start: periodStart,
      period_end: periodEnd,
      bonus_credits_available: member.bonus_credit_balance || 0,
    }
  }

  // Is it Sunday (check-in day)?
  const dayOfWeek = now.getDay() // 0 = Sunday
  const isSunday = dayOfWeek === 0

  // Is it past Sunday? (Monday-Saturday without a check-in = overdue)
  const isPastSunday = dayOfWeek > 0

  // Previous week check: if we're past Sunday and no check-in exists for current period
  if (isPastSunday) {
    return {
      status: 'overdue',
      can_submit: true,
      submitted_at: null,
      period_start: periodStart,
      period_end: periodEnd,
      bonus_credits_available: member.bonus_credit_balance || 0,
    }
  }

  return {
    status: isSunday ? 'due' : 'due',
    can_submit: true,
    submitted_at: null,
    period_start: periodStart,
    period_end: periodEnd,
    bonus_credits_available: member.bonus_credit_balance || 0,
  }
}

function getLastSunday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}
