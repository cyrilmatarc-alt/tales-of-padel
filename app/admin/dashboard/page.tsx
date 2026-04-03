'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Week, Team, Match, Player } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import SubscriptionList from '@/components/SubscriptionList'
import DraftPanel from '@/components/DraftPanel'
import ScoreEntry from '@/components/ScoreEntry'
import Toast, { useToast } from '@/components/Toast'
import Link from 'next/link'

type Tab = 'week' | 'subscriptions' | 'draft' | 'scores' | 'history'

type TeamWithPlayers = Team & {
  player1?: Player
  player2?: Player
}

type MatchWithTeams = Match & {
  team1?: Team
  team2?: Team
}

export default function AdminDashboard() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('week')

  // Data state
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [pastWeeks, setPastWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)

  const { toasts, addToast, removeToast } = useToast()

  // Auth check
  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    if (!stored) {
      router.replace('/admin')
      return
    }
    setToken(stored)
  }, [router])

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      // Fetch active week
      const { data: activeWeeks } = await supabase
        .from('weeks')
        .select('*')
        .in('status', ['open_registration', 'draft_done', 'in_progress'])
        .order('week_number', { ascending: false })
        .limit(1)

      const week = activeWeeks?.[0] as Week | null
      setCurrentWeek(week || null)

      // Fetch completed weeks
      const { data: completed } = await supabase
        .from('weeks')
        .select('*')
        .eq('status', 'completed')
        .order('week_number', { ascending: false })
      setPastWeeks(completed || [])

      if (week) {
        // Fetch teams and matches
        const [teamsRes, matchesRes] = await Promise.all([
          supabase.from('teams').select('*').eq('week_id', week.id).order('name'),
          supabase
            .from('matches')
            .select('*')
            .eq('week_id', week.id)
            .order('round_number')
            .order('court_number'),
        ])

        const weekTeams: Team[] = teamsRes.data || []
        const weekMatches: Match[] = matchesRes.data || []

        // Fetch players
        const playerIds = weekTeams
          .flatMap((t) => [t.player1_id, t.player2_id])
          .filter(Boolean)

        let weekPlayers: Player[] = []
        if (playerIds.length > 0) {
          const { data } = await supabase.from('players').select('*').in('id', playerIds)
          weekPlayers = data || []
        }
        setPlayers(weekPlayers)

        setTeams(
          weekTeams.map((team) => ({
            ...team,
            player1: weekPlayers.find((p) => p.id === team.player1_id),
            player2: weekPlayers.find((p) => p.id === team.player2_id),
          }))
        )

        setMatches(
          weekMatches.map((match) => ({
            ...match,
            team1: weekTeams.find((t) => t.id === match.team1_id),
            team2: weekTeams.find((t) => t.id === match.team2_id),
          }))
        )
      } else {
        setTeams([])
        setMatches([])
        setPlayers([])
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchData()
  }, [token, fetchData])

  const adminFetch = async (url: string, method: string, body?: object) => {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res
  }

  const handleOpenWeek = async () => {
    const res = await adminFetch('/api/weeks/open', 'POST')
    const data = await res.json()
    if (!res.ok) {
      addToast(data.error || 'Failed to open week', 'error')
    } else {
      addToast('New week opened!', 'success')
      fetchData()
    }
  }

  const handleRunDraft = async () => {
    if (!currentWeek) return
    const res = await adminFetch(`/api/weeks/${currentWeek.id}/draft`, 'POST')
    const data = await res.json()
    if (!res.ok) {
      addToast(data.error || 'Failed to run draft', 'error')
    } else {
      addToast('Draft complete!', 'success')
      fetchData()
    }
  }

  const handleRerunDraft = async () => {
    if (!currentWeek) return
    const res = await adminFetch(`/api/weeks/${currentWeek.id}/draft`, 'DELETE')
    const data = await res.json()
    if (!res.ok) {
      addToast(data.error || 'Failed to re-run draft', 'error')
    } else {
      addToast('Draft re-run!', 'success')
      fetchData()
    }
  }

  const handleConfirmSchedule = async () => {
    if (!currentWeek) return
    const res = await adminFetch(`/api/weeks/${currentWeek.id}/schedule`, 'POST')
    const data = await res.json()
    if (!res.ok) {
      addToast(data.error || 'Failed to generate schedule', 'error')
    } else {
      addToast('Schedule generated! Week is now in progress.', 'success')
      fetchData()
    }
  }

  const handleCloseWeek = async () => {
    if (!currentWeek) return
    const confirmed = window.confirm(
      'Close this week? This will aggregate all player stats and cannot be undone.'
    )
    if (!confirmed) return

    const res = await adminFetch(`/api/weeks/${currentWeek.id}/close`, 'POST')
    const data = await res.json()
    if (!res.ok) {
      addToast(data.error || 'Failed to close week', 'error')
    } else {
      addToast('Week closed! Stats updated.', 'success')
      fetchData()
    }
  }

  const handleMatchSaved = (updatedMatch: Match) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === updatedMatch.id
          ? { ...updatedMatch, team1: m.team1, team2: m.team2 }
          : m
      )
    )
    // Refetch to get updated team stats
    fetchData()
    addToast('Score saved!', 'success')
  }

  const handleSignOut = () => {
    localStorage.removeItem('admin_token')
    router.push('/admin')
  }

  const allMatchesCompleted =
    matches.length === 6 && matches.every((m) => m.status === 'completed')

  const statusLabel: Record<Week['status'], string> = {
    open_registration: 'Registration Open',
    draft_done: 'Draft Done',
    in_progress: 'In Progress',
    completed: 'Completed',
  }

  const statusColor: Record<Week['status'], string> = {
    open_registration: 'bg-accent/10 text-accent border-accent/30',
    draft_done: 'bg-gold/10 text-gold border-gold/30',
    in_progress: 'bg-accent/10 text-accent border-accent/30',
    completed: 'bg-muted/10 text-muted border-muted/30',
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'week', label: 'Week' },
    { id: 'subscriptions', label: 'Players' },
    { id: 'draft', label: 'Draft' },
    { id: 'scores', label: 'Scores' },
    { id: 'history', label: 'History' },
  ]

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted">Checking authentication...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-accent">ADMIN DASHBOARD</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-muted hover:text-red-400 transition-colors border border-muted/20 hover:border-red-400/30 rounded px-3 py-1.5"
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 border border-accent/10 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-accent text-bg'
                : 'text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted">Loading...</div>
      ) : (
        <>
          {/* Week Management Tab */}
          {activeTab === 'week' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-accent/10 p-6">
                <h2 className="font-display text-2xl text-text mb-4">WEEK MANAGEMENT</h2>

                {currentWeek ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-text font-semibold">Week {currentWeek.week_number}</div>
                        <div className="text-muted text-sm">
                          {new Date(currentWeek.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${statusColor[currentWeek.status]}`}
                      >
                        {statusLabel[currentWeek.status]}
                      </span>
                    </div>

                    <div className="border-t border-accent/10 pt-4">
                      <button
                        onClick={handleCloseWeek}
                        disabled={!allMatchesCompleted}
                        className="px-5 py-2 border border-red-400/50 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!allMatchesCompleted ? 'All 6 matches must be completed first' : ''}
                      >
                        Close Week & Finalize Stats
                      </button>
                      {!allMatchesCompleted && currentWeek.status === 'in_progress' && (
                        <p className="text-muted text-xs mt-2">
                          {matches.filter((m) => m.status === 'completed').length} / 6 matches completed
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted text-sm mb-4">No active week. Open a new one to start.</p>
                    <button
                      onClick={handleOpenWeek}
                      className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
                    >
                      Open New Week
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="bg-surface rounded-xl border border-accent/10 p-6">
              <h2 className="font-display text-2xl text-text mb-4">SUBSCRIPTIONS</h2>
              {currentWeek ? (
                <SubscriptionList
                  weekId={currentWeek.id}
                  initialPlayerIds={currentWeek.subscribed_player_ids || []}
                  isAdmin={true}
                  adminToken={token}
                  onUpdate={(ids) =>
                    setCurrentWeek((prev) =>
                      prev ? { ...prev, subscribed_player_ids: ids } : null
                    )
                  }
                />
              ) : (
                <p className="text-muted text-sm">No active week</p>
              )}
            </div>
          )}

          {/* Draft Tab */}
          {activeTab === 'draft' && (
            <div className="bg-surface rounded-xl border border-accent/10 p-6 space-y-6">
              <h2 className="font-display text-2xl text-text">DRAFT</h2>

              {!currentWeek ? (
                <p className="text-muted text-sm">No active week</p>
              ) : (
                <>
                  {currentWeek.status === 'open_registration' && (
                    <div>
                      <p className="text-muted text-sm mb-3">
                        {(currentWeek.subscribed_player_ids?.length ?? 0)} / 8 players registered
                      </p>
                      <button
                        onClick={handleRunDraft}
                        disabled={(currentWeek.subscribed_player_ids?.length ?? 0) < 8}
                        className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={(currentWeek.subscribed_player_ids?.length ?? 0) < 8 ? 'Need 8 players to run draft' : ''}
                      >
                        Run Draft
                      </button>
                    </div>
                  )}

                  {currentWeek.status === 'draft_done' && (
                    <>
                      <DraftPanel teams={teams} />
                      <div className="flex flex-wrap gap-3 pt-2 border-t border-accent/10">
                        <button
                          onClick={handleRerunDraft}
                          className="px-5 py-2 border border-accent/30 text-text rounded-lg text-sm hover:border-accent/60 transition-colors"
                        >
                          Re-run Draft
                        </button>
                        <button
                          onClick={handleConfirmSchedule}
                          className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
                        >
                          Confirm Draft & Generate Schedule
                        </button>
                      </div>
                    </>
                  )}

                  {(currentWeek.status === 'in_progress' || currentWeek.status === 'completed') && (
                    <>
                      <p className="text-muted text-sm">
                        Draft confirmed. Schedule has been generated.
                      </p>
                      <DraftPanel teams={teams} />
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Score Entry Tab */}
          {activeTab === 'scores' && (
            <div className="bg-surface rounded-xl border border-accent/10 p-6">
              <h2 className="font-display text-2xl text-text mb-4">SCORE ENTRY</h2>

              {!currentWeek || currentWeek.status !== 'in_progress' ? (
                <p className="text-muted text-sm">
                  {!currentWeek
                    ? 'No active week'
                    : 'Week must be in progress to enter scores'}
                </p>
              ) : matches.length === 0 ? (
                <p className="text-muted text-sm">No matches yet</p>
              ) : (
                <div className="space-y-6">
                  {[1, 2, 3].map((round) => {
                    const roundMatches = matches.filter((m) => m.round_number === round)
                    if (roundMatches.length === 0) return null
                    return (
                      <div key={round}>
                        <h3 className="text-accent text-sm font-bold tracking-widest uppercase mb-3">
                          Round {round}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {roundMatches.map((match) => (
                            <ScoreEntry
                              key={match.id}
                              match={match}
                              adminToken={token}
                              onSaved={handleMatchSaved}
                              onError={(msg) => addToast(msg, 'error')}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-surface rounded-xl border border-accent/10 p-6">
              <h2 className="font-display text-2xl text-text mb-4">HISTORY</h2>
              {pastWeeks.length === 0 ? (
                <p className="text-muted text-sm">No completed weeks yet</p>
              ) : (
                <div className="space-y-2">
                  {pastWeeks.map((week) => (
                    <Link
                      key={week.id}
                      href={`/history/${week.id}`}
                      className="flex items-center justify-between p-4 bg-bg/50 rounded-lg border border-accent/10 hover:border-accent/30 transition-colors group"
                    >
                      <div>
                        <span className="text-accent font-semibold">Week {week.week_number}</span>
                        <span className="text-muted text-sm ml-3">
                          {new Date(week.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-muted group-hover:text-accent text-sm transition-colors">
                        View →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
