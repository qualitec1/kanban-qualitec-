export interface DashboardFilters {
  people: string[]
  statuses: string[]
  priorities: string[]
  completion: 'all' | 'open' | 'done'
  due: 'all' | 'overdue' | 'today' | 'next7' | 'no_date'
  from: string
  to: string
  search: string
}
export interface DashboardSettings {
  upcomingDays: number
  refreshSeconds: number
  lockLayout: boolean
}
export interface DashboardTask {
  id: string
  title: string
  board_id: string
  due_date: string | null
  status_id: string | null
  priority_id: string | null
  boards: { name: string } | null
  status: { name: string; color: string; is_done: boolean } | null
  priority: { name: string } | null
  task_assignees: { user_id: string; profiles: { full_name: string | null; avatar_url: string | null } | null }[]
  task_attachments: { id: string; file_name: string; size_bytes: number | null; mime_type: string | null; created_at: string }[]
}
export interface StatusData { statusName: string; count: number; color: string; isDone: boolean }
export interface AssigneeData { userId: string; userName: string; userAvatar: string | null; taskCount: number }
export interface OverdueTask { id: string; title: string; dueDate: string; boardName: string; assignees: string[] }
export interface DeadlineTask extends OverdueTask { daysUntilDue: number }
export interface DeadlineData { date: string; count: number }

export const defaultDashboardFilters = (): DashboardFilters => ({ people: [], statuses: [], priorities: [], completion: 'all', due: 'all', from: '', to: '', search: '' })
export const defaultDashboardSettings = (): DashboardSettings => ({ upcomingDays: 30, refreshSeconds: 0, lockLayout: false })
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
// Date-only arithmetic avoids UTC conversion and daylight-saving boundaries.
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86400000)
}
const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export function filterDashboardTasks(tasks: DashboardTask[], filters: DashboardFilters, today = localDateKey()) {
  const search = normalized(filters.search)
  return tasks.filter(task => {
    const due = task.due_date?.slice(0, 10)
    const done = !!task.status?.is_done
    if (filters.people.length && !task.task_assignees.some(a => filters.people.includes(a.user_id))) return false
    if (filters.statuses.length && !filters.statuses.includes(task.status_id || 'none')) return false
    if (filters.priorities.length && !filters.priorities.includes(task.priority_id || 'none')) return false
    if (filters.completion === 'open' && done || filters.completion === 'done' && !done) return false
    if (filters.due === 'no_date' && due) return false
    if (filters.due === 'overdue' && (!due || due >= today || done)) return false
    if (filters.due === 'today' && due !== today) return false
    if (filters.due === 'next7' && (!due || daysBetween(today, due) < 0 || daysBetween(today, due) > 7)) return false
    if (filters.from && (!due || due < filters.from)) return false
    if (filters.to && (!due || due > filters.to)) return false
    if (search && !normalized([task.title, task.boards?.name, ...task.task_assignees.map(a => a.profiles?.full_name)].filter(Boolean).join(' ')).includes(search)) return false
    return true
  })
}
export function summarizeDashboard(tasks: DashboardTask[], upcomingDays = 30, today = localDateKey()) {
  const statuses = new Map<string, StatusData>()
  const assignees = new Map<string, AssigneeData>()
  const overdueData: OverdueTask[] = []
  const upcomingTasks: DeadlineTask[] = []
  const files = tasks.flatMap(task => task.task_attachments.map(file => ({ id: file.id, name: file.file_name, size: file.size_bytes, mimeType: file.mime_type, createdAt: file.created_at, taskName: task.title })))
  for (const task of tasks) {
    const key = task.status_id || 'none'
    const status = statuses.get(key) || { statusName: task.status?.name || 'Sem status', color: task.status?.color || '#94a3b8', isDone: !!task.status?.is_done, count: 0 }
    status.count++
    statuses.set(key, status)
    for (const person of task.task_assignees) {
      const entry = assignees.get(person.user_id) || { userId: person.user_id, userName: person.profiles?.full_name || 'Sem nome', userAvatar: person.profiles?.avatar_url || null, taskCount: 0 }
      entry.taskCount++
      assignees.set(person.user_id, entry)
    }
    if (!task.due_date || task.status?.is_done) continue
    const dueDate = task.due_date.slice(0, 10)
    const item = { id: task.id, title: task.title, dueDate, boardName: task.boards?.name || 'Quadro', assignees: task.task_assignees.map(a => a.profiles?.full_name || 'Sem nome') }
    const daysUntilDue = daysBetween(today, dueDate)
    if (daysUntilDue < 0) overdueData.push(item)
    else if (daysUntilDue <= upcomingDays) upcomingTasks.push({ ...item, daysUntilDue })
  }
  overdueData.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  upcomingTasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const dates = new Map<string, number>()
  upcomingTasks.forEach(t => dates.set(t.dueDate, (dates.get(t.dueDate) || 0) + 1))
  return {
    statusData: [...statuses.values()].sort((a, b) => b.count - a.count),
    assigneeData: [...assignees.values()].sort((a, b) => b.taskCount - a.taskCount),
    overdueData, upcomingTasks,
    deadlineData: [...dates].map(([date, count]) => ({ date, count })),
    fileCount: files.length,
    recentFiles: files.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  }
}

export function readDashboardPreferences(raw: string | null) {
  const filters = defaultDashboardFilters()
  const settings = defaultDashboardSettings()
  try {
    const value = JSON.parse(raw || '{}')
    const input = value?.filters
    if (input) {
      for (const key of ['people', 'statuses', 'priorities'] as const) {
        if (Array.isArray(input[key])) filters[key] = input[key].filter((id: unknown) => typeof id === 'string')
      }
      if (['all', 'open', 'done'].includes(input.completion)) filters.completion = input.completion
      if (['all', 'overdue', 'today', 'next7', 'no_date'].includes(input.due)) filters.due = input.due
      for (const key of ['from', 'to'] as const) {
        if (typeof input[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input[key]) && Number.isFinite(Date.parse(input[key]))) filters[key] = input[key]
      }
      if (filters.from && filters.to && filters.from > filters.to) { filters.from = ''; filters.to = '' }
      if (typeof input.search === 'string') filters.search = input.search.slice(0, 200)
    }
    if ([7, 14, 30, 60, 90].includes(value?.settings?.upcomingDays)) settings.upcomingDays = value.settings.upcomingDays
    if ([0, 60, 300].includes(value?.settings?.refreshSeconds)) settings.refreshSeconds = value.settings.refreshSeconds
    settings.lockLayout = value?.settings?.lockLayout === true
  } catch { /* Invalid or old preferences fall back to safe defaults. */ }
  return { filters, settings }
}
