import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateSchedule } from '@/lib/schedule'

function isAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Fetch the week
  const { data: week, error: weekError } = await supabase
    .from('weeks')
    .select('*')
    .eq('id', id)
    .single()

  if (weekError || !week) {
    return Response.json({ error: 'Week not found' }, { status: 404 })
  }

  if (week.status !== 'draft_done') {
    return Response.json({ error: 'Schedule can only be generated after draft is done' }, { status: 400 })
  }

  // Fetch teams for this week
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('week_id', id)
    .order('name', { ascending: true })

  if (teamsError) {
    return Response.json({ error: teamsError.message }, { status: 500 })
  }

  if (!teams || teams.length !== 4) {
    return Response.json({ error: 'Exactly 4 teams required to generate schedule' }, { status: 400 })
  }

  // Teams are ordered A, B, C, D
  const teamIds: [string, string, string, string] = [
    teams[0].id,
    teams[1].id,
    teams[2].id,
    teams[3].id,
  ]

  const matchInserts = generateSchedule(id, teamIds)

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .insert(matchInserts)
    .select()

  if (matchesError) {
    return Response.json({ error: matchesError.message }, { status: 500 })
  }

  // Update week status to in_progress
  const { data: updatedWeek, error: updateError } = await supabase
    .from('weeks')
    .update({ status: 'in_progress' })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ week: updatedWeek, matches }, { status: 200 })
}
