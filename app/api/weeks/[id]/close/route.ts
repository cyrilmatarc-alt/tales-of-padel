import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { aggregateWeekStatsToPlayers } from '@/lib/statsAggregation'

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

  if (week.status !== 'in_progress') {
    return Response.json({ error: 'Only in_progress weeks can be closed' }, { status: 400 })
  }

  // Check all matches are completed
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('week_id', id)

  if (matchesError) {
    return Response.json({ error: matchesError.message }, { status: 500 })
  }

  const pendingMatches = matches?.filter((m) => m.status !== 'completed') || []
  if (pendingMatches.length > 0) {
    return Response.json(
      { error: `Cannot close week: ${pendingMatches.length} match(es) still pending` },
      { status: 400 }
    )
  }

  // Aggregate stats to players
  try {
    await aggregateWeekStatsToPlayers(id)
  } catch (err) {
    return Response.json({ error: 'Failed to aggregate player stats' }, { status: 500 })
  }

  // Update week status to completed
  const { data: updatedWeek, error: updateError } = await supabase
    .from('weeks')
    .update({ status: 'completed' })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ week: updatedWeek }, { status: 200 })
}
