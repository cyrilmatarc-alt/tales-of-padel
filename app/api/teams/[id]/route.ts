import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

function isAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { player1_id, player2_id } = await req.json()

  if (!player1_id || !player2_id) {
    return Response.json({ error: 'Both players are required' }, { status: 400 })
  }

  if (player1_id === player2_id) {
    return Response.json({ error: 'A team must have two different players' }, { status: 400 })
  }

  // Get the team to find the week
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*, week:weeks(status)')
    .eq('id', id)
    .single()

  if (teamError || !team) {
    return Response.json({ error: 'Team not found' }, { status: 404 })
  }

  if (team.week?.status === 'completed') {
    return Response.json({ error: 'Cannot edit teams for a completed week' }, { status: 400 })
  }

  // Fetch both players to build the new team name
  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .in('id', [player1_id, player2_id])

  if (!players || players.length < 2) {
    return Response.json({ error: 'One or both players not found' }, { status: 404 })
  }

  const p1 = players.find((p) => p.id === player1_id)
  const p2 = players.find((p) => p.id === player2_id)
  const newName = `${p1?.name} & ${p2?.name}`

  const { data: updatedTeam, error: updateError } = await supabase
    .from('teams')
    .update({ player1_id, player2_id, name: newName })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ team: updatedTeam })
}
