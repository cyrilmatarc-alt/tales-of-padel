import { supabase } from '@/lib/supabase'
import type { Week, Team, Player } from '@/lib/supabase'
import StandingsTable from '@/components/StandingsTable'
import LiveBadge from '@/components/LiveBadge'

async function getActiveWeekWithTeams() {
  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .in('status', ['in_progress', 'draft_done'])
    .order('week_number', { ascending: false })
    .limit(1)

  const week = weeks?.[0] as Week | undefined
  if (!week) return { week: undefined, teams: [] }

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('week_id', week.id)
    .order('points', { ascending: false })

  const playerIds = (teams || []).flatMap((t) => [t.player1_id, t.player2_id]).filter(Boolean)
  let players: Player[] = []
  if (playerIds.length > 0) {
    const { data } = await supabase.from('players').select('*').in('id', playerIds)
    players = data || []
  }

  const enrichedTeams = (teams || []).map((team: Team) => ({
    ...team,
    player1: players.find((p) => p.id === team.player1_id),
    player2: players.find((p) => p.id === team.player2_id),
  }))

  return { week, teams: enrichedTeams }
}

export default async function StandingsPage() {
  const { week, teams } = await getActiveWeekWithTeams()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-text">STANDINGS</h1>
          {week && (
            <p className="text-muted text-sm mt-1">Week {week.week_number}</p>
          )}
        </div>
        {week?.status === 'in_progress' && <LiveBadge />}
      </div>

      {!week ? (
        <div className="bg-surface rounded-xl border border-accent/10 p-8 text-center">
          <p className="text-muted">No active week in progress</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-surface rounded-xl border border-accent/10 p-8 text-center">
          <p className="text-muted">Draft not yet complete</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-accent/10 p-6">
          <StandingsTable
            weekId={week.id}
            initialTeams={teams}
            liveUpdate={week.status === 'in_progress'}
          />
        </div>
      )}
    </div>
  )
}
