import { supabase } from '@/lib/supabase'
import Leaderboard from '@/components/Leaderboard'

export const revalidate = 0

async function getAllPlayers() {
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('total_points', { ascending: false })

  return players || []
}

export default async function LeaderboardPage() {
  const players = await getAllPlayers()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl sm:text-5xl text-text">LEADERBOARD</h1>
        <p className="text-muted text-sm mt-1">All-time player rankings</p>
      </div>

      <div className="bg-surface rounded-xl border border-accent/10 p-6">
        {players.length === 0 ? (
          <p className="text-muted text-center py-8 italic">No players yet</p>
        ) : (
          <Leaderboard players={players} />
        )}
      </div>
    </div>
  )
}
