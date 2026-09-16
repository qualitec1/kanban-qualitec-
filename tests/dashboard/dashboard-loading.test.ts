import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
const db = vi.hoisted(() => ({ from: vi.fn(), range: vi.fn() }))
vi.mock('#app', () => ({ useNuxtApp: () => ({ $supabase: { from: db.from } }) }))
import { useDashboard } from '../../app/composables/useDashboard'
const task = (id: string) => ({ id, title: id, board_id: 'board', due_date: null, status_id: null, priority_id: null, boards: { name: 'Quadro' }, status: null, priority: null, task_assignees: [], task_attachments: [] })
let wrapper: ReturnType<typeof mount> | undefined
function setup() {
  let dashboard!: ReturnType<typeof useDashboard>
  wrapper = mount(defineComponent({ setup() { dashboard = useDashboard(); return () => null } }))
  return dashboard
}
beforeEach(() => {
  vi.clearAllMocks()
  db.from.mockImplementation(() => {
    const query: any = { select: () => query, in: () => query, is: () => query, order: () => query, range: db.range }
    return query
  })
})
afterEach(() => wrapper?.unmount())
describe('Dashboard data loading', () => {
  it('loads all pages so metrics are not truncated', async () => {
    db.range.mockResolvedValueOnce({ data: Array.from({ length: 250 }, (_, i) => task(String(i))) }).mockResolvedValueOnce({ data: [task('last')] })
    const d = setup(); d.connectedBoards.value = ['board']
    await d.fetchAllDashboardData()
    expect(d.filteredTaskCount.value).toBe(251)
    expect(db.range.mock.calls).toEqual([[0, 249], [250, 499]])
  })
  it('clears the data without reconnecting boards after deselecting all', async () => {
    db.range.mockResolvedValue({ data: [task('first')] })
    const d = setup(); d.connectedBoards.value = ['board']; await d.fetchAllDashboardData()
    d.connectedBoards.value = []; await d.fetchAllDashboardData()
    expect(d.connectedBoards.value).toEqual([]); expect(d.filteredTaskCount.value).toBe(0)
    expect(db.from).toHaveBeenCalledTimes(1)
  })
  it('ignores an older request that completes after a newer board selection', async () => {
    let finishOld!: (result: any) => void
    db.range.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve })).mockResolvedValueOnce({ data: [task('new')] })
    const d = setup(); d.connectedBoards.value = ['board']; const old = d.fetchAllDashboardData()
    d.connectedBoards.value = ['other']; await d.fetchAllDashboardData()
    finishOld({ data: [task('old'), task('older')] }); await old
    expect(d.filteredTaskCount.value).toBe(1)
    expect(d.isLoading.value).toBe(false)
  })
  it('shows an error instead of displaying stale totals when loading fails', async () => {
    db.range.mockResolvedValueOnce({ data: [task('old')] }).mockResolvedValueOnce({ error: new Error('offline') })
    const d = setup(); d.connectedBoards.value = ['board']; await d.fetchAllDashboardData(); await d.fetchAllDashboardData()
    expect(d.error.value).toContain('Não foi possível')
    expect(d.filteredTaskCount.value).toBe(0); expect(d.isLoading.value).toBe(false)
  })
})
