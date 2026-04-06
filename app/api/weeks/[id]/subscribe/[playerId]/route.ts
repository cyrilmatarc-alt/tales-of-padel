import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

function isAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  if (!isAdmin(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, playerId } = await params

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
    return Response.json({ error: 'Cannot remove players after registration is closed' }, { status: 400 })
  }

  const currentIds: string[] = week.subscribed_player_ids || []
  const updatedIds = currentIds.filter((pid) => pid !== playerId)

  if (updatedIds.length === currentIds.length) {
    return Response.json({ error: 'Player not found in subscription list' }, { status: 404 })
  }

  const { data: updatedWeek, error: updateError } = await supabase
    .from('weeks')
    .update({ subscribed_player_ids: updatedIds })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  // Delete the player from the players table if they have no completed weeks (no real stats)
  const { data: player } = await supabase
    .from('players')
    .select('total_weeks_played')
    .eq('id', playerId)
    .single()

  if (player && player.total_weeks_played === 0) {
    await supabase.from('players').delete().eq('id', playerId)
  }

  return Response.json({ week: updatedWeek }, { status: 200 })
}
