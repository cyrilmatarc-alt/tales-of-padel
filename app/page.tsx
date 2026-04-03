import { supabase } from '@/lib/supabase'
import type { Week, Team, Match, Player } from '@/lib/supabase'
import HomeClient from './HomeClient'

async function getActiveWeek() {
  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .in('status', ['open_registration', 'draft_done', 'in_progress'])
    .order('week_number', { ascending: false })
    .limit(1)

  return weeks?.[0] as Week | undefined
}

async function getWeekData(weekId: string) {
  const [teamsRes, matchesRes] = await Promise.all([
    supabase.from('teams').select('*').eq('week_id', weekId).order('name'),
    supabase
      .from('matches')
      .select('*')
      .eq('week_id', weekId)
      .order('round_number')
      .order('court_number'),
  ])

  const teams: Team[] = teamsRes.data || []
  const matches: Match[] = matchesRes.data || []

  // Fetch players for teams
  const playerIds = teams.flatMap((t) => [t.player1_id, t.player2_id]).filter(Boolean)
  let players: Player[] = []
  if (playerIds.length > 0) {
    const { data } = await supabase.from('players').select('*').in('id', playerIds)
    players = data || []
  }

  return { teams, matches, players }
}

export default async function Home() {
  const week = await getActiveWeek()

  if (!week) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-6xl text-accent mb-4">TALES OF PADEL</h1>
        <p className="text-muted text-lg mb-8">No active week — check back soon</p>
        <div className="p-6 bg-surface rounded-xl border border-accent/10">
          <p className="text-text/60 text-sm">
            The admin will open the next week when registration begins.
          </p>
        </div>
      </div>
    )
  }

  const { teams, matches, players } = await getWeekData(week.id)

  return (
    <HomeClient
      week={week}
      initialTeams={teams}
      initialMatches={matches}
      initialPlayers={players}
    />
  )
}
