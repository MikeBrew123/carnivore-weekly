import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkResponseEligibility, EligibilityResult } from '@/lib/eligibility'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  // Verify admin
  const { data: admin } = await serviceClient
    .from('coach_admins')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Fetch pending messages (coach drafts awaiting review)
  const { data: pending } = await serviceClient
    .from('coach_messages')
    .select(`
      id, member_id, direction, content, ai_draft, ai_structured_output,
      red_flag, red_flag_reason, review_status, checkin_id,
      created_at
    `)
    .in('review_status', ['pending', 'flagged'])
    .eq('direction', 'coach')
    .order('red_flag', { ascending: false })
    .order('created_at', { ascending: true })

  // Get member context for each pending item
  const memberIds = [...new Set((pending || []).map(p => p.member_id))]

  let members: Record<string, any> = {}
  if (memberIds.length > 0) {
    const { data: memberData } = await serviceClient
      .from('coach_members')
      .select('id, display_name, email, tier, founding_member, risk_level, coaching_mode, current_weight, goal_weight, start_weight, diet_type, health_conditions, medications, coach_notes, member_summary, bonus_credit_balance')
      .in('id', memberIds)

    if (memberData) {
      members = Object.fromEntries(memberData.map(m => [m.id, m]))
    }
  }

  // Get check-in data for messages linked to check-ins
  const checkinIds = (pending || []).filter(p => p.checkin_id).map(p => p.checkin_id)
  let checkins: Record<string, any> = {}
  if (checkinIds.length > 0) {
    const { data: checkinData } = await serviceClient
      .from('coach_checkins')
      .select('id, weight, steps_avg, sleep_quality, energy_level, cravings_level, adherence, wins, struggles, symptoms, help_request, period_start, submitted_at')
      .in('id', checkinIds)

    if (checkinData) {
      checkins = Object.fromEntries(checkinData.map(c => [c.id, c]))
    }
  }

  // Check eligibility for each member
  const eligibility: Record<string, EligibilityResult> = {}
  for (const mid of memberIds) {
    try {
      eligibility[mid] = await checkResponseEligibility(serviceClient, mid)
    } catch {
      eligibility[mid] = { eligible: false, status: 'inactive', reason: 'Eligibility check failed', bonus_credits: 0, can_use_bonus: false }
    }
  }

  // Count stats
  const total = (pending || []).length
  const flagged = (pending || []).filter(p => p.red_flag).length

  return NextResponse.json({
    queue: pending || [],
    members,
    checkins,
    eligibility,
    stats: { pending: total, flagged, overdue: 0 },
    admin_id: admin.id,
    admin_role: admin.role,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
