import { supabase } from './supabase'

/**
 * Aggregates team stats into player all-time stats when a week is closed.
 * Each player on a team gets the team's stats added to their all-time totals.
 */
export async function aggregateWeekStatsToPlayers(weekId: string): Promise<void> {
  // Fetch all teams for this week
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('week_id', weekId)

  if (teamsError) throw teamsError
  if (!teams || teams.length === 0) return

  // For each team, update both players
  for (const team of teams) {
    const playerIds = [team.player1_id, team.player2_id].filter(Boolean)

    for (const playerId of playerIds) {
      // Fetch current player stats
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (playerError) throw playerError
      if (!player) continue

      const { error: updateError } = await supabase
        .from('players')
        .update({
          total_weeks_played: player.total_weeks_played + 1,
          total_wins: player.total_wins + team.wins,
          total_losses: player.total_losses + team.losses,
          total_draws: player.total_draws + team.draws,
          total_points: player.total_points + team.points,
          total_goals_for: player.total_goals_for + team.goals_for,
          total_goals_against: player.total_goals_against + team.goals_against,
        })
        .eq('id', playerId)

      if (updateError) throw updateError
    }
  }
}
