# Tales of Padel

A weekly padel league management app with live scores, standings, and all-time leaderboards.

## Features

- Weekly registration with player name-based subscription
- Admin-controlled draft system (random team assignment)
- Auto-generated round-robin schedule (4 teams, 6 matches)
- Live score entry with real-time standings updates
- All-time player leaderboard
- Complete match history

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + real-time subscriptions)
- **Vercel** (deployment)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd tales-of-padel
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ADMIN_PASSWORD=your-chosen-password
```

---

## Supabase Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the migration

In the Supabase dashboard, go to **SQL Editor** and paste the contents of:

```
supabase/migrations/001_initial_schema.sql
```

Run the query to create all four tables: `players`, `weeks`, `teams`, `matches`.

### 3. Enable real-time

In the Supabase dashboard:
1. Go to **Database → Replication**
2. Enable replication for all four tables:
   - `players`
   - `weeks`
   - `teams`
   - `matches`

This powers the live subscription list, live standings, and live match updates.

### 4. Get your credentials

In **Project Settings → API**:
- Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
4. Deploy

---

## Admin Usage Guide

### Accessing Admin

1. Navigate to `/admin`
2. Enter your `ADMIN_PASSWORD`
3. You'll be redirected to `/admin/dashboard`

The token is stored in `localStorage` and sent as a `Bearer` token on all admin API calls.

### Running a Week

**1. Open a Week (Week Management tab)**
- Click "Open New Week"
- Only one active week can exist at a time

**2. Manage Subscriptions (Players tab)**
- Players subscribe themselves on the home page using their name
- Admins can remove players from the subscription list
- Maximum 8 players required before draft

**3. Run the Draft (Draft tab)**
- Once 8 players are subscribed, click "Run Draft"
- Players are randomly assigned to 4 teams (A, B, C, D) using Fisher-Yates shuffle
- Review the team assignments
- Click "Re-run Draft" to shuffle again if needed
- Click "Confirm Draft & Generate Schedule" to lock in teams and create the 6-match schedule

**4. Enter Scores (Scores tab)**
- The schedule shows 6 matches across 3 rounds
- Enter scores for each match and click "Save Score"
- Team standings update automatically in real-time
- Edit a completed match by clicking "Edit Score"

**5. Close the Week (Week Management tab)**
- Once all 6 matches are completed, the "Close Week" button becomes active
- Closing the week aggregates team stats into each player's all-time totals
- The week moves to "completed" status and appears in History

### Schedule Format

The fixed round-robin schedule for 4 teams is:

| Round | Court 1 | Court 2 |
|-------|---------|---------|
| 1     | A vs B  | C vs D  |
| 2     | A vs C  | B vs D  |
| 3     | A vs D  | B vs C  |

### Scoring System

- Win: 3 points
- Draw: 1 point
- Loss: 0 points

Teams are ranked by: Points → Goal Difference → Goals For

---

## Public Pages

| Route | Description |
|-------|-------------|
| `/` | Home — current week, subscription form, live schedule & standings |
| `/standings` | Full standings for the active week |
| `/leaderboard` | All-time player rankings with search |
| `/history` | List of all completed weeks |
| `/history/[id]` | Full results and standings for a past week |
