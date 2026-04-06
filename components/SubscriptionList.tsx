'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Player, Week } from '@/lib/supabase'

type Props = {
  weekId: string
  initialPlayerIds: string[]
  isAdmin?: boolean
  adminToken?: string
  onUpdate?: (ids: string[]) => void
}

export default function SubscriptionList({
  weekId,
  initialPlayerIds,
  isAdmin = false,
  adminToken,
  onUpdate,
}: Props) {
  const [playerIds, setPlayerIds] = useState<string[]>(initialPlayerIds)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch player details
  useEffect(() => {
    if (playerIds.length === 0) {
      setPlayers([])
      return
    }
    supabase
      .from('players')
      .select('*')
      .in('id', playerIds)
      .then(({ data }) => {
        if (data) {
          // Preserve subscription order
          const ordered = playerIds
            .map((id) => data.find((p) => p.id === id))
            .filter(Boolean) as Player[]
          setPlayers(ordered)
        }
      })
  }, [playerIds])

  // Fetch latest player IDs directly from the weeks table
  const fetchLatestIds = async () => {
    const { data } = await supabase
      .from('weeks')
      .select('subscribed_player_ids')
      .eq('id', weekId)
      .single()
    if (data) {
      const newIds: string[] = data.subscribed_player_ids || []
      setPlayerIds((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(newIds)) {
          onUpdate?.(newIds)
          return newIds
        }
        return prev
      })
    }
  }

  // Real-time subscription to weeks table
  useEffect(() => {
    const channel = supabase
      .channel(`week-subscriptions-${weekId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weeks',
          filter: `id=eq.${weekId}`,
        },
        (payload) => {
          const newIds: string[] = (payload.new as Week).subscribed_player_ids || []
          setPlayerIds(newIds)
          onUpdate?.(newIds)
        }
      )
      .subscribe()

    // Polling fallback every 3 seconds in case real-time is delayed
    const poll = setInterval(fetchLatestIds, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [weekId, onUpdate])

  const handleRemove = async (playerId: string) => {
    if (!adminToken) return
    setLoading(true)
    try {
      const res = await fetch(`/api/weeks/${weekId}/subscribe/${playerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to remove player')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text font-semibold">Players</h3>
        <span className="text-sm text-muted">
          <span className={playerIds.length >= 8 ? 'text-accent font-bold' : 'text-text'}>
            {playerIds.length}
          </span>
          <span className="text-muted"> / 8</span>
        </span>
      </div>

      {players.length === 0 ? (
        <p className="text-muted text-sm italic">No players subscribed yet</p>
      ) : (
        <ul className="space-y-2">
          {players.map((player, index) => (
            <li
              key={player.id}
              className="flex items-center justify-between bg-bg/50 rounded px-3 py-2 border border-accent/10"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted text-xs w-5">{index + 1}.</span>
                <span className="text-text text-sm">{player.name}</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleRemove(player.id)}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 text-xs border border-red-400/30 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Slots remaining */}
      {playerIds.length < 8 && (
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 8 - playerIds.length }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full bg-accent/10 border border-accent/20"
            />
          ))}
          {Array.from({ length: playerIds.length }).map((_, i) => (
            <div key={`filled-${i}`} className="h-1.5 flex-1 rounded-full bg-accent" />
          ))}
        </div>
      )}
      {playerIds.length >= 8 && (
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-accent" />
          ))}
        </div>
      )}
    </div>
  )
}
