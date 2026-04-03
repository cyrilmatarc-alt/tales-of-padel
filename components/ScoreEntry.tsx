'use client'

import { useState } from 'react'
import type { Match, Team } from '@/lib/supabase'

type MatchWithTeams = Match & {
  team1?: Team
  team2?: Team
}

type Props = {
  match: MatchWithTeams
  adminToken: string
  onSaved: (updatedMatch: Match) => void
  onError: (message: string) => void
}

export default function ScoreEntry({ match, adminToken, onSaved, onError }: Props) {
  const [editing, setEditing] = useState(match.status !== 'completed')
  const [score1, setScore1] = useState<string>(match.score1?.toString() ?? '')
  const [score2, setScore2] = useState<string>(match.score2?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const s1 = parseInt(score1)
    const s2 = parseInt(score2)

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      onError('Please enter valid non-negative scores')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/matches/${match.id}/score`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ score1: s1, score2: s2 }),
      })

      const data = await res.json()

      if (!res.ok) {
        onError(data.error || 'Failed to save score')
        return
      }

      onSaved(data.match)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-accent/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted text-xs">Court {match.court_number}</span>
        {match.status === 'completed' && !editing && (
          <span className="text-xs text-accent/60 uppercase tracking-wider">Completed</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-text mb-2">{match.team1?.name || 'Team 1'}</div>
          {editing ? (
            <input
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="w-16 bg-bg border border-accent/30 rounded text-center text-text text-lg font-bold py-1 focus:outline-none focus:border-accent"
              placeholder="0"
            />
          ) : (
            <span className="text-2xl font-bold text-accent">{match.score1 ?? '-'}</span>
          )}
        </div>

        <div className="text-muted text-lg font-bold">–</div>

        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-text mb-2">{match.team2?.name || 'Team 2'}</div>
          {editing ? (
            <input
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="w-16 bg-bg border border-accent/30 rounded text-center text-text text-lg font-bold py-1 focus:outline-none focus:border-accent"
              placeholder="0"
            />
          ) : (
            <span className="text-2xl font-bold text-accent">{match.score2 ?? '-'}</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-accent text-bg rounded text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Score'}
            </button>
            {match.status === 'completed' && (
              <button
                onClick={() => {
                  setScore1(match.score1?.toString() ?? '')
                  setScore2(match.score2?.toString() ?? '')
                  setEditing(false)
                }}
                className="px-4 py-1.5 border border-accent/30 text-text rounded text-sm hover:border-accent/60 transition-colors"
              >
                Cancel
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-1.5 border border-accent/30 text-accent rounded text-sm hover:border-accent/60 transition-colors"
          >
            Edit Score
          </button>
        )}
      </div>
    </div>
  )
}
