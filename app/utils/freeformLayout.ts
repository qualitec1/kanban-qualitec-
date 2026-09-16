export interface CardPosition { x: number; y: number; width: number; height: number }
export const CARD_WIDTH = 300
export const CARD_HEIGHT = 248
export function readPositions(raw: string | null): Record<string, CardPosition> {
  const result: Record<string, CardPosition> = {}
  try {
    const parsed = JSON.parse(raw || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return result
    for (const [id, p] of Object.entries(parsed) as [string, any][]) {
      if (!p || !['x', 'y', 'width', 'height'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k]))) continue
      if (p.x < 0 || p.y < 0 || p.x > 100000 || p.y > 100000) continue
      result[id] = { x: p.x, y: p.y, width: Math.min(800, Math.max(CARD_WIDTH, p.width)), height: Math.min(800, Math.max(CARD_HEIGHT, p.height)) }
    }
  } catch { /* A damaged browser preference must not prevent opening the board. */ }
  return result
}
export function gridPosition(index: number, columns: number): CardPosition {
  const cols = Math.max(1, Math.floor(columns))
  return { x: 24 + (index % cols) * (CARD_WIDTH + 24), y: 24 + Math.floor(index / cols) * (CARD_HEIGHT + 24), width: CARD_WIDTH, height: CARD_HEIGHT }
}
export function addMissingPositions(ids: string[], existing: Record<string, CardPosition>, columns: number) {
  const result = { ...existing }
  let index = 0
  for (const id of ids) {
    if (result[id]) continue
    let candidate: CardPosition
    do { candidate = gridPosition(index++, columns) }
    while (Object.values(result).some(p => candidate.x < p.x + p.width + 12 && candidate.x + candidate.width + 12 > p.x && candidate.y < p.y + p.height + 12 && candidate.y + candidate.height + 12 > p.y))
    result[id] = candidate
  }
  return result
}
