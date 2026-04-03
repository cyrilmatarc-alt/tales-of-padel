import type { Metadata } from 'next'
import { Bebas_Neue, DM_Sans } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tales of Padel',
  description: 'Weekly padel league — live scores, standings, and history',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-screen flex flex-col">
        <nav className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-accent/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="font-display text-2xl text-accent tracking-widest hover:text-accent/80 transition-colors"
            >
              TALES OF PADEL
            </Link>
            <div className="flex items-center gap-1 sm:gap-4">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/standings">Standings</NavLink>
              <NavLink href="/leaderboard">Leaderboard</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/admin" className="text-muted hover:text-text">
                Admin
              </NavLink>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-accent/10 py-6 text-center text-muted text-xs">
          Tales of Padel — Weekly League
        </footer>
      </body>
    </html>
  )
}

function NavLink({
  href,
  children,
  className = '',
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`text-text/80 hover:text-accent transition-colors text-sm font-medium px-2 py-1 rounded hover:bg-accent/5 ${className}`}
    >
      {children}
    </Link>
  )
}
