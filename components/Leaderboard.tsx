'use client'

import { useState } from 'react'
import type { Player } from '@/lib/supabase'

type Props = {
  players: Player[]
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

export default function Leaderboard({ players }: Props) {
  const [search, setSearch] = useState('')

  const sorted = [...players].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    const gdA = a.total_goals_for - a.total_goals_against
    const gdB = b.total_goals_for - b.total_goals_against
    if (gdB !== gdA) return gdB - gdA
    return b.total_goals_for - a.total_goals_for
  })

  const filtered = sorted.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player..."
          className="w-full bg-surface border border-accent/20 rounded-lg px-4 py-2.5 text-text placeholder-muted focus:outline-none focus:border-accent/50 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-accent/20 text-muted text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-3 w-10">Rank</th>
              <th className="text-left py-3 px-3">Player</th>
              <th className="text-center py-3 px-2">Weeks</th>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted italic">
                  No players found
                </td>
              </tr>
            ) : (
              filtered.map((player, index) => {
                // Rank is based on the sorted position (not filtered index)
                const rank = sorted.findIndex((p) => p.id === player.id) + 1
                const gd = player.total_goals_for - player.total_goals_against
                const rowBg = RANK_BG[rank] || 'border-accent/5'
                const rankColor = RANK_COLORS[rank] || 'text-muted'

                return (
                  <tr
                    key={player.id}
                    className={`border-b ${rowBg} transition-colors`}
                  >
                    <td className={`py-3 px-3 font-bold ${rankColor}`}>
                      {rank <= 3 ? (
                        <span className="flex items-center gap-1">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        rank
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-text">{player.name}</td>
                    <td className="text-center py-3 px-2 text-text">{player.total_weeks_played}</td>
                    <td className="text-center py-3 px-2 text-text">{player.total_wins}</td>
                    <td className="text-center py-3 px-2 text-text">{player.total_draws}</td>
                    <td className="text-center py-3 px-2 text-text">{player.total_losses}</td>
                    <td className="text-center py-3 px-2 text-text">{player.total_goals_for}</td>
                    <td className="text-center py-3 px-2 text-text">{player.total_goals_against}</td>
                    <td className={`text-center py-3 px-2 font-medium ${gd > 0 ? 'text-accent' : gd < 0 ? 'text-red-400' : 'text-muted'}`}>
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                    <td className="text-center py-3 px-2 font-bold text-accent">{player.total_points}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
