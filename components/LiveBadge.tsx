'use client'

export default function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 border border-accent/30">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
      </span>
      <span className="text-accent text-xs font-bold tracking-widest">LIVE</span>
    </span>
  )
}
