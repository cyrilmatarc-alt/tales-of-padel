'use client'

import { useState, useEffect } from 'react'
import type { Week, Team, Match, Player } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import LiveBadge from '@/components/LiveBadge'
import SubscriptionList from '@/components/SubscriptionList'
import ScheduleGrid from '@/components/ScheduleGrid'
import StandingsTable from '@/components/StandingsTable'

type MatchWithTeams = Match & {
  team1?: Team
  team2?: Team
}

type TeamWithPlayers = Team & {
  player1?: Player
  player2?: Player
}

type Props = {
  week: Week
  initialTeams: Team[]
  initialMatches: Match[]
  initialPlayers: Player[]
}

export default function HomeClient({ week, initialTeams, initialMatches, initialPlayers }: Props) {
  const [name, setName] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeError, setSubscribeError] = useState('')
  const [subscribeSuccess, setSubscribeSuccess] = useState('')

  // Enrich teams with player data
  const enrichTeams = (teams: Team[], players: Player[]): TeamWithPlayers[] =>
    teams.map((team) => ({
      ...team,
      player1: players.find((p) => p.id === team.player1_id),
      player2: players.find((p) => p.id === team.player2_id),
    }))

  // Enrich matches with team data
  const enrichMatches = (matches: Match[], teams: Team[]): MatchWithTeams[] =>
    matches.map((match) => ({
      ...match,
      team1: teams.find((t) => t.id === match.team1_id),
      team2: teams.find((t) => t.id === match.team2_id),
    }))

  const teamsWithPlayers = enrichTeams(initialTeams, initialPlayers)
  const matchesWithTeams = enrichMatches(initialMatches, initialTeams)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSubscribing(true)
    setSubscribeError('')
    setSubscribeSuccess('')

    try {
      const res = await fetch(`/api/weeks/${week.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubscribeError(data.error || 'Failed to subscribe')
      } else {
        setSubscribeSuccess(`${data.player.name} has been registered!`)
        setName('')
        setTimeout(() => setSubscribeSuccess(''), 4000)
      }
    } catch {
      setSubscribeError('Network error. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  const statusLabel: Record<Week['status'], string> = {
    open_registration: 'Registration Open',
    draft_done: 'Draft Done',
    in_progress: 'In Progress',
    completed: 'Completed',
  }

  const statusColor: Record<Week['status'], string> = {
    open_registration: 'text-accent border-accent/30 bg-accent/10',
    draft_done: 'text-gold border-gold/30 bg-gold/10',
    in_progress: 'text-accent border-accent/30 bg-accent/10',
    completed: 'text-muted border-muted/30 bg-muted/10',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
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
        <div className="flex items-center gap-3">
          {week.status === 'in_progress' && <LiveBadge />}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${statusColor[week.status]}`}
          >
            {statusLabel[week.status]}
          </span>
        </div>
      </div>

      {/* Registration Form */}
      {week.status === 'open_registration' && (
        <div className="bg-surface rounded-xl border border-accent/10 p-6">
          <h2 className="font-display text-2xl text-text mb-4">JOIN THIS WEEK</h2>
          <form onSubmit={handleSubscribe} className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              disabled={subscribing}
              className="flex-1 bg-bg border border-accent/20 rounded-lg px-4 py-2.5 text-text placeholder-muted focus:outline-none focus:border-accent/50 text-sm min-w-0"
            />
            <button
              type="submit"
              disabled={subscribing || !name.trim() || (week.subscribed_player_ids?.length ?? 0) >= 8}
              className="px-6 py-2.5 bg-accent text-bg rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {subscribing ? 'Registering...' : 'Subscribe'}
            </button>
          </form>
          {subscribeError && (
            <p className="text-red-400 text-sm mt-2">{subscribeError}</p>
          )}
          {subscribeSuccess && (
            <p className="text-accent text-sm mt-2">{subscribeSuccess}</p>
          )}
        </div>
      )}

      {/* Subscription List */}
      {(week.status === 'open_registration' || week.status === 'draft_done') && (
        <div className="bg-surface rounded-xl border border-accent/10 p-6">
          <SubscriptionList
            weekId={week.id}
            initialPlayerIds={week.subscribed_player_ids || []}
          />
        </div>
      )}

      {/* Schedule */}
      {(week.status === 'in_progress' || week.status === 'draft_done') && matchesWithTeams.length > 0 && (
        <div className="bg-surface rounded-xl border border-accent/10 p-6">
          <h2 className="font-display text-2xl text-text mb-4">SCHEDULE</h2>
          <ScheduleGrid
            weekId={week.id}
            initialMatches={matchesWithTeams}
            liveUpdates={week.status === 'in_progress'}
          />
        </div>
      )}

      {/* Live Standings */}
      {week.status === 'in_progress' && teamsWithPlayers.length > 0 && (
        <div className="bg-surface rounded-xl border border-accent/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-2xl text-text">STANDINGS</h2>
            <LiveBadge />
          </div>
          <StandingsTable
            weekId={week.id}
            initialTeams={teamsWithPlayers}
            liveUpdate={true}
          />
        </div>
      )}
    </div>
  )
}
