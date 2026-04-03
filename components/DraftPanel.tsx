'use client'

import type { Team, Player } from '@/lib/supabase'

type TeamWithPlayers = Team & {
  player1?: Player
  player2?: Player
}

type Props = {
  teams: TeamWithPlayers[]
}

const TEAM_COLORS = [
  'border-accent/30 bg-accent/5',
  'border-gold/30 bg-gold/5',
  'border-silver/30 bg-silver/5',
  'border-bronze/30 bg-bronze/5',
]

export default function DraftPanel({ teams }: Props) {
  if (teams.length === 0) {
    return (
      <div className="text-muted text-sm italic">Run the draft to see team assignments.</div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {teams.map((team, index) => (
        <div
          key={team.id}
          className={`rounded-lg border p-4 ${TEAM_COLORS[index % TEAM_COLORS.length]}`}
        >
          <div className="font-bold text-text mb-3 flex items-center gap-2">
            <span className="text-accent text-lg">{team.name}</span>
          </div>
          <div className="space-y-2">
            {team.player1 && (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">1</span>
                <span className="text-text text-sm">{team.player1.name}</span>
              </div>
            )}
            {team.player2 && (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">2</span>
                <span className="text-text text-sm">{team.player2.name}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
