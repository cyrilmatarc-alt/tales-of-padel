'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Team, Player } from '@/lib/supabase'

type TeamWithPlayers = Team & {
  player1?: Player
  player2?: Player
}

type Props = {
  weekId: string
  initialTeams: TeamWithPlayers[]
  liveUpdate?: boolean
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-gold',
  2: 'text-silver',
  3: 'text-bronze',
}

const RANK_BG: Record<number, string> = {
  1: 'bg-gold/5 border-gold/20',
  2: 'bg-silver/5 border-silver/20',
  3: 'bg-bronze/5 border-bronze/20',
}

export default function StandingsTable({ weekId, initialTeams, liveUpdate = false }: Props) {
  const [teams, setTeams] = useState<TeamWithPlayers[]>(initialTeams)

  useEffect(() => {
    setTeams(initialTeams)
  }, [initialTeams])

  useEffect(() => {
    if (!liveUpdate) return

    const channel = supabase
      .channel(`teams-standings-${weekId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
          filter: `week_id=eq.${weekId}`,
        },
        async (payload) => {
          const updatedTeam = payload.new as Team
          setTeams((prev) => {
            const updated = prev.map((t) =>
              t.id === updatedTeam.id
                ? { ...t, ...updatedTeam }
                : t
            )
            return sortTeams(updated)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekId, liveUpdate])

  const sorted = sortTeams(teams)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-accent/20 text-muted text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-3 w-8">#</th>
            <th className="text-left py-3 px-3">Team</th>
            <th className="text-center py-3 px-2">P</th>
            <th className="text-center py-3 px-2">W</th>
            <th className="text-center py-3 px-2">D</th>
            <th className="text-center py-3 px-2">L</th>
            <th className="text-center py-3 px-2">GF</th>
            <th className="text-center py-3 px-2">GA</th>
            <th className="text-center py-3 px-2">+/-</th>
            <th className="text-center py-3 px-2 text-accent">PTS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, index) => {
            const rank = index + 1
            const gd = team.goals_for - team.goals_against
            const rowBg = RANK_BG[rank] || 'border-accent/5'
            const rankColor = RANK_COLORS[rank] || 'text-muted'

            return (
              <tr
                key={team.id}
                className={`border-b ${rowBg} transition-all duration-500`}
              >
                <td className={`py-3 px-3 font-bold ${rankColor}`}>{rank}</td>
                <td className="py-3 px-3">
                  <div className="font-semibold text-text">{team.name}</div>
                  {(team.player1 || team.player2) && (
                    <div className="text-muted text-xs mt-0.5">
                      {[team.player1?.name, team.player2?.name].filter(Boolean).join(' & ')}
                    </div>
                  )}
                </td>
                <td className="text-center py-3 px-2 text-text">{team.played}</td>
                <td className="text-center py-3 px-2 text-text">{team.wins}</td>
                <td className="text-center py-3 px-2 text-text">{team.draws}</td>
                <td className="text-center py-3 px-2 text-text">{team.losses}</td>
                <td className="text-center py-3 px-2 text-text">{team.goals_for}</td>
                <td className="text-center py-3 px-2 text-text">{team.goals_against}</td>
                <td className={`text-center py-3 px-2 font-medium ${gd > 0 ? 'text-accent' : gd < 0 ? 'text-red-400' : 'text-muted'}`}>
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td className="text-center py-3 px-2 font-bold text-accent">{team.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function sortTeams(teams: TeamWithPlayers[]): TeamWithPlayers[] {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.goals_for - a.goals_against
    const gdB = b.goals_for - b.goals_against
    if (gdB !== gdA) return gdB - gdA
    return b.goals_for - a.goals_for
  })
}
