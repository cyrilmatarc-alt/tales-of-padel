import { supabase } from '@/lib/supabase'
import type { Week, Team, Match, Player } from '@/lib/supabase'
import ScheduleGrid from '@/components/ScheduleGrid'
import StandingsTable from '@/components/StandingsTable'
import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getWeekDetails(weekId: string) {
  const { data: week } = await supabase
    .from('weeks')
    .select('*')
    .eq('id', weekId)
    .single()

  if (!week) return null

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

  const playerIds = teams.flatMap((t) => [t.player1_id, t.player2_id]).filter(Boolean)
  let players: Player[] = []
  if (playerIds.length > 0) {
    const { data } = await supabase.from('players').select('*').in('id', playerIds)
    players = data || []
  }

  const enrichedTeams = teams.map((team) => ({
    ...team,
    player1: players.find((p) => p.id === team.player1_id),
    player2: players.find((p) => p.id === team.player2_id),
  }))

  const enrichedMatches = matches.map((match) => ({
    ...match,
    team1: teams.find((t) => t.id === match.team1_id),
    team2: teams.find((t) => t.id === match.team2_id),
  }))

  return { week: week as Week, teams: enrichedTeams, matches: enrichedMatches }
}

export default async function WeekHistoryPage({
  params,
}: {
  params: Promise<{ week_id: string }>
}) {
  const { week_id } = await params
  const data = await getWeekDetails(week_id)

  if (!data) {
    notFound()
  }

  const { week, teams, matches } = data

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/history"
          className="text-muted hover:text-accent text-sm transition-colors"
        >
          ← Back to History
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-text">
            WEEK {week.week_number}
          </h1>
          <p className="text-muted text-sm mt-1">
            {new Date(week.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider text-muted border-muted/30 bg-muted/10">
          Completed
        </span>
      </div>

      {/* Final Standings */}
      {teams.length > 0 && (
        <div className="bg-surface rounded-xl border border-accent/10 p-6 mb-6">
          <h2 className="font-display text-2xl text-text mb-4">FINAL STANDINGS</h2>
          <StandingsTable
            weekId={week.id}
            initialTeams={teams}
            liveUpdate={false}
          />
        </div>
      )}

      {/* Schedule with Scores */}
      {matches.length > 0 && (
        <div className="bg-surface rounded-xl border border-accent/10 p-6">
          <h2 className="font-display text-2xl text-text mb-4">RESULTS</h2>
          <ScheduleGrid
            weekId={week.id}
            initialMatches={matches}
            liveUpdates={false}
          />
        </div>
      )}
    </div>
  )
}
