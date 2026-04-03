'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Match, Team } from '@/lib/supabase'

type MatchWithTeams = Match & {
  team1?: Team
  team2?: Team
}

type Props = {
  weekId: string
  initialMatches: MatchWithTeams[]
  liveUpdates?: boolean
}

export default function ScheduleGrid({ weekId, initialMatches, liveUpdates = false }: Props) {
  const [matches, setMatches] = useState<MatchWithTeams[]>(initialMatches)

  useEffect(() => {
    setMatches(initialMatches)
  }, [initialMatches])

  useEffect(() => {
    if (!liveUpdates) return

    const channel = supabase
      .channel(`matches-${weekId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `week_id=eq.${weekId}`,
        },
        async (payload) => {
          const updatedMatch = payload.new as Match
          // Fetch team details
          const { data: teams } = await supabase
            .from('teams')
            .select('*')
            .in('id', [updatedMatch.team1_id, updatedMatch.team2_id])

          const team1 = teams?.find((t) => t.id === updatedMatch.team1_id)
          const team2 = teams?.find((t) => t.id === updatedMatch.team2_id)

          setMatches((prev) =>
            prev.map((m) =>
              m.id === updatedMatch.id ? { ...updatedMatch, team1, team2 } : m
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekId, liveUpdates])

  // Group by round
  const rounds = [1, 2, 3]
  const matchesByRound = rounds.map((round) =>
    matches
      .filter((m) => m.round_number === round)
      .sort((a, b) => a.court_number - b.court_number)
  )

  return (
    <div className="space-y-6">
      {matchesByRound.map((roundMatches, roundIndex) => (
        <div key={roundIndex}>
          <h3 className="text-accent font-bold text-sm tracking-widest uppercase mb-3">
            Round {roundIndex + 1}
          </h3>
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max md:min-w-0 md:grid md:grid-cols-2">
              {roundMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchCard({ match }: { match: MatchWithTeams }) {
  const isCompleted = match.status === 'completed'
  const team1Won =
    isCompleted && match.score1 !== null && match.score2 !== null && match.score1 > match.score2
  const team2Won =
    isCompleted && match.score1 !== null && match.score2 !== null && match.score2 > match.score1

  return (
    <div className="bg-surface border border-accent/10 rounded-lg p-4 flex-1 min-w-[280px]">
      <div className="text-xs text-muted mb-3 text-center">Court {match.court_number}</div>
      <div className="flex items-center justify-between gap-3">
        <div className={`flex-1 text-center ${team1Won ? 'text-accent' : 'text-text'}`}>
          <div className="font-bold text-sm">{match.team1?.name || 'Team 1'}</div>
        </div>

        <div className="flex items-center gap-2 min-w-[80px] justify-center">
          {isCompleted ? (
            <>
              <span className={`text-2xl font-bold ${team1Won ? 'text-accent' : 'text-text'}`}>
                {match.score1}
              </span>
              <span className="text-muted text-lg">–</span>
              <span className={`text-2xl font-bold ${team2Won ? 'text-accent' : 'text-text'}`}>
                {match.score2}
              </span>
            </>
          ) : (
            <span className="text-muted text-sm font-medium">vs</span>
          )}
        </div>

        <div className={`flex-1 text-center ${team2Won ? 'text-accent' : 'text-text'}`}>
          <div className="font-bold text-sm">{match.team2?.name || 'Team 2'}</div>
        </div>
      </div>
      {isCompleted && (
        <div className="mt-2 text-center">
          <span className="text-xs text-accent/60 uppercase tracking-wider">Final</span>
        </div>
      )}
    </div>
  )
}
