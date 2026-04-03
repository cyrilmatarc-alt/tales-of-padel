import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { recalculateMatchTeamStats } from '@/lib/scoring'

function isAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { score1, score2 } = body

  if (score1 === undefined || score1 === null || score2 === undefined || score2 === null) {
    return Response.json({ error: 'score1 and score2 are required' }, { status: 400 })
  }

  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
    return Response.json({ error: 'Scores must be non-negative integers' }, { status: 400 })
  }

  // Fetch the match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (matchError || !match) {
    return Response.json({ error: 'Match not found' }, { status: 404 })
  }

  // Update the match with scores and mark as completed
  const { data: updatedMatch, error: updateError } = await supabase
    .from('matches')
    .update({ score1, score2, status: 'completed' })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  // Recalculate team stats
  try {
    await recalculateMatchTeamStats(id)
  } catch (err) {
    return Response.json({ error: 'Failed to recalculate team stats' }, { status: 500 })
  }

  return Response.json({ match: updatedMatch }, { status: 200 })
}
