import { supabase } from './supabase'

/**
 * Recalculates team stats from scratch from all completed matches for that team in the week.
 */
export async function recalculateTeamStats(teamId: string, weekId: string): Promise<void> {
  // Fetch all completed matches for this team in this week
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('week_id', weekId)
    .eq('status', 'completed')
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)

  if (error) throw error

  let played = 0
  let wins = 0
  let losses = 0
  let draws = 0
  let goals_for = 0
  let goals_against = 0
  let points = 0

  for (const match of matches || []) {
    const isTeam1 = match.team1_id === teamId
    const myScore = isTeam1 ? match.score1 : match.score2
    const oppScore = isTeam1 ? match.score2 : match.score1

    if (myScore === null || oppScore === null) continue

    played++
    goals_for += myScore
    goals_against += oppScore

    if (myScore > oppScore) {
      wins++
      points += 3
    } else if (myScore === oppScore) {
      draws++
      points += 1
    } else {
      losses++
    }
  }

  const { error: updateError } = await supabase
    .from('teams')
    .update({ played, wins, losses, draws, goals_for, goals_against, points })
    .eq('id', teamId)

  if (updateError) throw updateError
}

/**
 * Recalculates stats for both teams involved in a match
 */
export async function recalculateMatchTeamStats(matchId: string): Promise<void> {
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (error) throw error
  if (!match) throw new Error('Match not found')

  await Promise.all([
    recalculateTeamStats(match.team1_id, match.week_id),
    recalculateTeamStats(match.team2_id, match.week_id),
  ])
}
