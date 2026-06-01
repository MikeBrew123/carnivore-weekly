import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { canMemberAccessCoaching } from '@/lib/member-access'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const serviceClient = await createServiceClient()

  // Verify access
  const { data: member } = await serviceClient
    .from('coach_members')
    .select('status, subscription_status, onboarded_at, current_period_end')
    .eq('id', user.id)
    .maybeSingle()

  if (!member || !canMemberAccessCoaching(member)) {
    return NextResponse.json({ error: 'Active membership required' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }

  // Fetch messages visible to member (sent_at IS NOT NULL, via member-safe columns only)
  const { data: messages } = await serviceClient
    .from('coach_member_messages')
    .select('id, member_id, direction, content, checkin_id, sent_at, created_at')
    .eq('member_id', user.id)
    .order('created_at', { ascending: true })
    .limit(100)

  // Fetch check-in data for messages that reference a check-in
  const checkinIds = (messages || [])
    .filter(m => m.checkin_id)
    .map(m => m.checkin_id)

  let checkins: Record<string, any> = {}
  if (checkinIds.length > 0) {
    const { data: checkinData } = await serviceClient
      .from('coach_checkins')
      .select('id, weight, adherence, cravings_level, sleep_quality, energy_level, steps_avg, wins, struggles, period_start')
      .in('id', checkinIds)

    if (checkinData) {
      checkins = Object.fromEntries(checkinData.map(c => [c.id, c]))
    }
  }

  return NextResponse.json({
    messages: messages || [],
    checkins,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
