import { describe, expect, it } from 'vitest'
import { defaultDashboardFilters, defaultDashboardSettings, filterDashboardTasks, summarizeDashboard, readDashboardPreferences, daysBetween } from '../../app/utils/dashboard'
import type { DashboardTask, DashboardFilters } from '../../app/utils/dashboard'
const today = '2026-09-16'
const person = (id: string, name: string) => ({ user_id: id, profiles: { full_name: name, avatar_url: null } })
const base: DashboardTask = { id: 'a', title: 'Calibração', board_id: 'board', boards: { name: 'Laboratório' }, due_date: today, status_id: 'open', status: { name: 'Aberta', color: '#00f', is_done: false }, priority_id: 'high', priority: { name: 'Alta' }, task_assignees: [person('ana', 'Ana')], task_attachments: [{ id: 'file', file_name: 'a.pdf', size_bytes: 1, mime_type: 'application/pdf', created_at: today }] }
const tasks: DashboardTask[] = [
  base,
  { ...base, id: 'b', title: 'Entrega', due_date: '2026-09-15', task_assignees: [person('bia', 'Bia')], task_attachments: [], priority_id: 'low' },
  { ...base, id: 'c', due_date: '2026-09-14', status_id: 'done', status: { name: 'Concluída', color: '#0f0', is_done: true }, task_assignees: [person('ana', 'Ana'), person('bia', 'Bia')], task_attachments: [] },
  { ...base, id: 'd', due_date: null, status_id: null, status: null, priority_id: null, priority: null, task_assignees: [], task_attachments: [] },
  { ...base, id: 'e', due_date: '2026-09-23', task_attachments: [] },
  { ...base, id: 'f', due_date: '2026-10-01', task_attachments: [] },
]
const filtered = (changes: Partial<DashboardFilters>) => filterDashboardTasks(tasks, { ...defaultDashboardFilters(), ...changes }, today)
describe('Shared dashboard filters', () => {
  it('includes unassigned and statusless tasks by default', () => expect(filtered({})).toHaveLength(6))
  it('matches any selected person without duplicating shared tasks', () => expect(filtered({ people: ['ana', 'bia'] }).map(t => t.id)).toEqual(['a', 'b', 'c', 'e', 'f']))
  it('combines people, priority, completion and date range', () => expect(filtered({ people: ['ana'], priorities: ['high'], completion: 'open', from: today, to: today }).map(t => t.id)).toEqual(['a']))
  it('supports missing status and priority', () => expect(filtered({ statuses: ['none'], priorities: ['none'] }).map(t => t.id)).toEqual(['d']))
  it('excludes completed tasks from overdue', () => expect(filtered({ due: 'overdue' }).map(t => t.id)).toEqual(['b']))
  it('includes today and the seventh day in next-seven-days', () => expect(filtered({ due: 'next7' }).map(t => t.id)).toEqual(['a', 'e']))
  it('filters tasks without a due date', () => expect(filtered({ due: 'no_date' }).map(t => t.id)).toEqual(['d']))
  it('filters completed tasks', () => expect(filtered({ completion: 'done' }).map(t => t.id)).toEqual(['c']))
  it('searches without case or accent sensitivity', () => expect(filtered({ search: 'CALIBRACAO', due: 'today' }).map(t => t.id)).toEqual(['a']))
  it('searches board and assignee names', () => { expect(filtered({ search: 'laboratorio' })).toHaveLength(6); expect(filtered({ search: 'bia' }).map(t => t.id)).toEqual(['b', 'c']) })
  it('keeps metrics, people and files on the same filtered set', () => {
    const result = summarizeDashboard(filtered({ people: ['ana'], due: 'today' }), 30, today)
    expect(result.statusData.reduce((n, s) => n + s.count, 0)).toBe(1)
    expect(result.assigneeData).toHaveLength(1)
    expect(result.fileCount).toBe(1)
    expect(result.recentFiles.map(f => f.id)).toEqual(['file'])
    expect(result.upcomingTasks.map(t => t.id)).toEqual(['a'])
    expect(result.overdueData).toEqual([])
  })
  it('counts tasks without a status and applies the configured upcoming window', () => {
    const result = summarizeDashboard(tasks, 7, today)
    expect(result.statusData.reduce((n, s) => n + s.count, 0)).toBe(6)
    expect(result.upcomingTasks.map(t => t.id)).toEqual(['a', 'e'])
    expect(result.upcomingTasks.map(t => t.daysUntilDue)).toEqual([0, 7])
    expect(summarizeDashboard(tasks, 30, today).upcomingTasks).toHaveLength(3)
  })
  it('returns zeroes after all boards or tasks are removed', () => {
    const result = summarizeDashboard([], 30, today)
    expect(result.statusData).toEqual([]); expect(result.fileCount).toBe(0); expect(result.recentFiles).toEqual([])
  })
  it('uses calendar days over month boundaries', () => expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1))
})
describe('Dashboard preferences', () => {
  it('restores valid selections and settings', () => {
    const preferences = { filters: { ...defaultDashboardFilters(), people: ['ana'], search: 'teste' }, settings: { upcomingDays: 7, refreshSeconds: 60, lockLayout: true } }
    expect(readDashboardPreferences(JSON.stringify(preferences))).toEqual(preferences)
  })
  it.each([null, 'broken json', 'null', '{"filters":{"people":1},"settings":{"refreshSeconds":-1}}'])('recovers from invalid saved preferences: %s', value => {
    expect(readDashboardPreferences(value)).toEqual({ filters: defaultDashboardFilters(), settings: defaultDashboardSettings() })
  })
  it('clears an inverted date range and rejects unexpected values', () => {
    const result = readDashboardPreferences(JSON.stringify({ filters: { from: '2026-09-20', to: '2026-09-16', completion: 'invalid', people: [42, 'ana'] }, settings: { upcomingDays: 999, lockLayout: 'false' } }))
    expect(result.filters.from).toBe(''); expect(result.filters.people).toEqual(['ana']); expect(result.settings).toEqual(defaultDashboardSettings())
  })
})
