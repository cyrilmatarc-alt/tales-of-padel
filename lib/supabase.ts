import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Player = {
  id: string
  name: string
  created_at: string
  total_weeks_played: number
  total_wins: number
  total_losses: number
  total_draws: number
  total_points: number
  total_goals_for: number
  total_goals_against: number
}

export type Week = {
  id: string
  week_number: number
  date: string
  status: 'open_registration' | 'draft_done' | 'in_progress' | 'completed'
  subscribed_player_ids: string[]
}

export type Team = {
  id: string
  week_id: string
  name: string
  player1_id: string
  player2_id: string
  played: number
  wins: number
  losses: number
  draws: number
  goals_for: number
  goals_against: number
  points: number
}

export type Match = {
  id: string
  week_id: string
  round_number: number
  court_number: number
  team1_id: string
  team2_id: string
  score1: number | null
  score2: number | null
  status: 'pending' | 'completed'
}
