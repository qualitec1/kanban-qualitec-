export type TaskDueOrder = 'manual' | 'nearest' | 'farthest'
export function parseTaskDueOrder(value: unknown): TaskDueOrder {
  return value === 'nearest' || value === 'farthest' ? value : 'manual'
}
function dueDay(value?: string | null): string | null {
  if (!value) return null
  const day = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const parsed = new Date(day + 'T00:00:00Z')
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : null
}
/** Stable presentation order; never changes the board's saved manual positions. */
export function sortTasksByDueDate<T extends { due_date?: string | null }>(tasks: readonly T[], order: TaskDueOrder): T[] {
  if (order === 'manual') return [...tasks]
  return tasks.map((task, index) => ({ task, index, day: dueDay(task.due_date) })).sort((a, b) => {
    if (!a.day && !b.day) return a.index - b.index
    if (!a.day) return 1
    if (!b.day) return -1
    const comparison = a.day.localeCompare(b.day)
    return (order === 'farthest' ? -comparison : comparison) || a.index - b.index
  }).map(entry => entry.task)
}
