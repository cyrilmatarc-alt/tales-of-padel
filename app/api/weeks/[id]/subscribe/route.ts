import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  const trimmedName = name.trim()

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
    return Response.json({ error: 'Registration is closed for this week' }, { status: 400 })
  }

  const currentIds: string[] = week.subscribed_player_ids || []

  if (currentIds.length >= 8) {
    return Response.json({ error: 'Week is full (8 players max)' }, { status: 400 })
  }

  // Case-insensitive name match — find or create player
  const { data: existingPlayers, error: playerSearchError } = await supabase
    .from('players')
    .select('*')

  if (playerSearchError) {
    return Response.json({ error: playerSearchError.message }, { status: 500 })
  }

  let player = existingPlayers?.find(
    (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
  )

  if (!player) {
    // Create new player
    const { data: newPlayer, error: createError } = await supabase
      .from('players')
      .insert({ name: trimmedName })
      .select()
      .single()

    if (createError) {
      return Response.json({ error: createError.message }, { status: 500 })
    }
    player = newPlayer
  }

  // Check if already subscribed
  if (currentIds.includes(player.id)) {
    return Response.json({ error: 'Player is already subscribed' }, { status: 400 })
  }

  // Add player to the week
  const updatedIds = [...currentIds, player.id]

  const { data: updatedWeek, error: updateError } = await supabase
    .from('weeks')
    .update({ subscribed_player_ids: updatedIds })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ week: updatedWeek, player }, { status: 200 })
}
