/**
 * Fixed 6-match schedule for 4 teams A/B/C/D
 * Round 1 Court 1: A vs B | Round 1 Court 2: C vs D
 * Round 2 Court 1: A vs C | Round 2 Court 2: B vs D
 * Round 3 Court 1: A vs D | Round 3 Court 2: B vs C
 */
export type ScheduleEntry = {
  round_number: number
  court_number: number
  team_a_index: number // index into the teams array (0=A, 1=B, 2=C, 3=D)
  team_b_index: number
}

export const SCHEDULE_TEMPLATE: ScheduleEntry[] = [
  { round_number: 1, court_number: 1, team_a_index: 0, team_b_index: 1 }, // A vs B
  { round_number: 1, court_number: 2, team_a_index: 2, team_b_index: 3 }, // C vs D
  { round_number: 2, court_number: 1, team_a_index: 0, team_b_index: 2 }, // A vs C
  { round_number: 2, court_number: 2, team_a_index: 1, team_b_index: 3 }, // B vs D
  { round_number: 3, court_number: 1, team_a_index: 0, team_b_index: 3 }, // A vs D
  { round_number: 3, court_number: 2, team_a_index: 1, team_b_index: 2 }, // B vs C
]

/**
 * Generate match inserts given 4 team IDs (in order A, B, C, D) and a week ID
 */
export function generateSchedule(
  weekId: string,
  teamIds: [string, string, string, string]
): Array<{
  week_id: string
  round_number: number
  court_number: number
  team1_id: string
  team2_id: string
  score1: null
  score2: null
  status: 'pending'
}> {
  return SCHEDULE_TEMPLATE.map((entry) => ({
    week_id: weekId,
    round_number: entry.round_number,
    court_number: entry.court_number,
    team1_id: teamIds[entry.team_a_index],
    team2_id: teamIds[entry.team_b_index],
    score1: null,
    score2: null,
    status: 'pending' as const,
  }))
}
