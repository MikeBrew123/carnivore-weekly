import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { canMemberAccessCoaching } from '@/lib/member-access'

const MAX_NOTE_LENGTH = 2000
const MIN_NOTE_INTERVAL_MS = 5000

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content } = await request.json()

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Note cannot be empty' }, { status: 400 })
  }

  if (content.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: `Note cannot exceed ${MAX_NOTE_LENGTH} characters` }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Verify member has active coaching access (includes billing check)
  const { data: member } = await serviceClient
    .from('coach_members')
    .select('status, subscription_status, onboarded_at, current_period_end')
    .eq('id', user.id)
    .maybeSingle()

  if (!member || !canMemberAccessCoaching(member)) {
    return NextResponse.json({ error: 'Active membership required' }, { status: 403 })
  }

  // Rate limit: check last message from this member
  const { data: lastMsg } = await serviceClient
    .from('coach_messages')
    .select('created_at')
    .eq('member_id', user.id)
    .eq('direction', 'member')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastMsg) {
    const elapsed = Date.now() - new Date(lastMsg.created_at).getTime()
    if (elapsed < MIN_NOTE_INTERVAL_MS) {
      return NextResponse.json({ error: 'Please wait a moment before sending another note' }, { status: 429 })
    }
  }

  // Insert message (trigger handles sent_at + zeroes admin fields)
  const { data: msg, error } = await serviceClient
    .from('coach_messages')
    .insert({
      member_id: user.id,
      direction: 'member',
      content: content.trim(),
    })
    .select('id, content, sent_at, created_at')
    .maybeSingle()

  if (error) {
    console.error('Failed to insert note:', error)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: msg })
}
