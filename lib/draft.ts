/**
 * Fisher-Yates shuffle
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Shuffles 8 player IDs and assigns them into 4 pairs
 * Returns 4 pairs: [[p1,p2],[p3,p4],[p5,p6],[p7,p8]]
 */
export function shuffleAndAssign(playerIds: string[]): [string, string][] {
  if (playerIds.length !== 8) {
    throw new Error('Exactly 8 players required for draft')
  }
  const shuffled = shuffle(playerIds)
  return [
    [shuffled[0], shuffled[1]],
    [shuffled[2], shuffled[3]],
    [shuffled[4], shuffled[5]],
    [shuffled[6], shuffled[7]],
  ]
}
