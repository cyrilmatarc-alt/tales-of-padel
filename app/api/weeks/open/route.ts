import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

function isAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Enforce only one active week at a time
  const { data: activeWeeks, error: checkError } = await supabase
    .from('weeks')
    .select('id, status')
    .in('status', ['open_registration', 'draft_done', 'in_progress'])

  if (checkError) {
    return Response.json({ error: checkError.message }, { status: 500 })
  }

  if (activeWeeks && activeWeeks.length > 0) {
    return Response.json(
      { error: 'There is already an active week. Close it before opening a new one.' },
      { status: 400 }
    )
  }

  // Get the next week number
  const { data: lastWeek, error: lastError } = await supabase
    .from('weeks')
    .select('week_number')
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  const weekNumber = lastError || !lastWeek ? 1 : lastWeek.week_number + 1

  const today = new Date().toISOString().split('T')[0]

  const { data: newWeek, error: createError } = await supabase
    .from('weeks')
    .insert({
      week_number: weekNumber,
      date: today,
      status: 'open_registration',
      subscribed_player_ids: [],
    })
    .select()
    .single()

  if (createError) {
    return Response.json({ error: createError.message }, { status: 500 })
  }

  return Response.json(newWeek, { status: 201 })
}
