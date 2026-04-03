import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { shuffleAndAssign } from '@/lib/draft'

function isAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

const TEAM_NAMES = ['Team A', 'Team B', 'Team C', 'Team D']

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

  if (week.status !== 'open_registration') {
    return Response.json({ error: 'Draft can only be run on weeks with open_registration status' }, { status: 400 })
  }

  const playerIds: string[] = week.subscribed_player_ids || []

  if (playerIds.length !== 8) {
    return Response.json({ error: `Draft requires exactly 8 players (currently ${playerIds.length})` }, { status: 400 })
  }

  // Assign players to teams
  const pairs = shuffleAndAssign(playerIds)

  // Create teams
  const teamInserts = pairs.map((pair, index) => ({
    week_id: id,
    name: TEAM_NAMES[index],
    player1_id: pair[0],
    player2_id: pair[1],
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    goals_for: 0,
    goals_against: 0,
    points: 0,
  }))

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .insert(teamInserts)
    .select()

  if (teamsError) {
    return Response.json({ error: teamsError.message }, { status: 500 })
  }

  // Update week status to draft_done
  const { data: updatedWeek, error: updateError } = await supabase
    .from('weeks')
    .update({ status: 'draft_done' })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ week: updatedWeek, teams }, { status: 200 })
}

export async function DELETE(
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
    return Response.json({ error: 'Can only re-run draft when status is draft_done' }, { status: 400 })
  }

  // Delete existing teams (matches will cascade)
  const { error: deleteTeamsError } = await supabase
    .from('teams')
    .delete()
    .eq('week_id', id)

  if (deleteTeamsError) {
    return Response.json({ error: deleteTeamsError.message }, { status: 500 })
  }

  // Reset week status back to open_registration
  const { data: updatedWeek, error: updateError } = await supabase
    .from('weeks')
    .update({ status: 'open_registration' })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  // Now re-run the draft
  const playerIds: string[] = updatedWeek.subscribed_player_ids || []
  const pairs = shuffleAndAssign(playerIds)

  const teamInserts = pairs.map((pair, index) => ({
    week_id: id,
    name: TEAM_NAMES[index],
    player1_id: pair[0],
    player2_id: pair[1],
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    goals_for: 0,
    goals_against: 0,
    points: 0,
  }))

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .insert(teamInserts)
    .select()

  if (teamsError) {
    return Response.json({ error: teamsError.message }, { status: 500 })
  }

  // Update week status back to draft_done
  const { data: finalWeek, error: finalUpdateError } = await supabase
    .from('weeks')
    .update({ status: 'draft_done' })
    .eq('id', id)
    .select()
    .single()

  if (finalUpdateError) {
    return Response.json({ error: finalUpdateError.message }, { status: 500 })
  }

  return Response.json({ week: finalWeek, teams }, { status: 200 })
}
