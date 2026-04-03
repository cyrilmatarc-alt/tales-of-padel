import { supabase } from '@/lib/supabase'
import type { Week, Team } from '@/lib/supabase'
import Link from 'next/link'

async function getCompletedWeeks() {
  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .eq('status', 'completed')
    .order('week_number', { ascending: false })

  if (!weeks || weeks.length === 0) return []

  // For each week, find the winning team
  const weekIds = weeks.map((w: Week) => w.id)
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .in('week_id', weekIds)

  const result = weeks.map((week: Week) => {
    const weekTeams = (teams || []).filter((t: Team) => t.week_id === week.id)
    const sorted = [...weekTeams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      const gdA = a.goals_for - a.goals_against
      const gdB = b.goals_for - b.goals_against
      if (gdB !== gdA) return gdB - gdA
      return b.goals_for - a.goals_for
    })
    return {
      week,
      winner: sorted[0] || null,
    }
  })

  return result
}

export default async function HistoryPage() {
  const completedWeeks = await getCompletedWeeks()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl sm:text-5xl text-text">HISTORY</h1>
        <p className="text-muted text-sm mt-1">All completed weeks</p>
      </div>

      {completedWeeks.length === 0 ? (
        <div className="bg-surface rounded-xl border border-accent/10 p-8 text-center">
          <p className="text-muted">No completed weeks yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedWeeks.map(({ week, winner }) => (
            <Link
              key={week.id}
              href={`/history/${week.id}`}
              className="block bg-surface rounded-xl border border-accent/10 p-5 hover:border-accent/30 transition-colors group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-accent font-display text-2xl">W{week.week_number}</div>
                  <div>
                    <div className="text-text font-medium">
                      {new Date(week.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    {winner && (
                      <div className="text-muted text-sm flex items-center gap-1.5 mt-0.5">
                        <span className="text-gold">🏆</span>
                        <span>{winner.name}</span>
                        <span className="text-accent font-semibold ml-1">{winner.points} pts</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-muted group-hover:text-accent transition-colors text-sm">
                  View →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
