import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { sortTasksByDueDate, parseTaskDueOrder } from '../../app/utils/taskDueOrder'
import Freeform from '../../app/components/board/BoardFreeformView.vue'
import Toolbar from '../../app/components/BoardToolbar.vue'
const tasks = [
  { id: 'none', due_date: null },
  { id: 'far', due_date: '2030-12-20', position: 2 },
  { id: 'near', due_date: '2030-01-10', position: 3 },
  { id: 'overdue', due_date: '2020-01-01', position: 4 },
  { id: 'same-day', due_date: '2030-01-10T18:30:00Z', position: 5 },
  { id: 'invalid', due_date: '2030-02-30', position: 6 }
]
describe('Due date presentation order', () => {
  it('orders nearest first with overdue first, stable ties and missing dates last', () => {
    expect(sortTasksByDueDate(tasks, 'nearest').map(t => t.id)).toEqual(['overdue', 'near', 'same-day', 'far', 'none', 'invalid'])
  })
  it('orders farthest first while retaining missing dates at the end', () => {
    expect(sortTasksByDueDate(tasks, 'farthest').map(t => t.id)).toEqual(['far', 'near', 'same-day', 'overdue', 'none', 'invalid'])
  })
  it('does not change manual order or saved position fields', () => {
    const snapshot = JSON.stringify(tasks)
    sortTasksByDueDate(tasks, 'nearest')
    expect(JSON.stringify(tasks)).toBe(snapshot)
    expect(sortTasksByDueDate(tasks, 'manual')).toEqual(tasks)
    expect(parseTaskDueOrder('bad-preference')).toBe('manual')
    expect(parseTaskDueOrder('farthest')).toBe('farthest')
  })
  it('sorts the Livre canvas globally and restores its saved manual layout', async () => {
    const positions = { near: { x: 900, y: 300, width: 300, height: 248 }, far: { x: 100, y: 100, width: 300, height: 248 } }
    localStorage.setItem('board-tasks-positions-due-test', JSON.stringify(positions))
    HTMLElement.prototype.scrollTo = () => {}
    const wrapper = mount(Freeform, { props: { boardId: 'due-test', canEdit: true, tasksByGroup: { one: [{ ...tasks[1], title: 'Far' }], two: [{ ...tasks[2], title: 'Near' }] } as any, dueOrder: 'manual' }, global: { stubs: { TaskQuickPreview: true } } })
    await wrapper.vm.$nextTick()
    const saved = localStorage.getItem('board-tasks-positions-due-test')
    await wrapper.setProps({ dueOrder: 'nearest' })
    expect(wrapper.findAll('.card-title').map(w => w.text())).toEqual(['Near', 'Far'])
    expect(wrapper.find('article').attributes('style')).toContain('left: 24px')
    expect(wrapper.find('.move-handle').exists()).toBe(false)
    expect(localStorage.getItem('board-tasks-positions-due-test')).toBe(saved)
    await wrapper.setProps({ dueOrder: 'manual' })
    expect(wrapper.findAll('.card-title').map(w => w.text())).toEqual(['Far', 'Near'])
    expect(wrapper.findAll('article')[1].attributes('style')).toContain('left: 900px')
    wrapper.unmount()
  })
  it.each(['horizontal', 'vertical', 'freeform'] as const)('offers both sort directions in the %s toolbar', async viewMode => {
    const wrapper = mount(Toolbar, { props: { boardId: 'test', viewMode, showArchived: false, showEmptyGroups: true, canEdit: false, dueOrder: 'manual' }, global: { stubs: { ClientOnly: { template: '<div><slot /></div>' }, ColumnVisibilityMenu: true, BaseButton: true } } })
    await wrapper.find('select').setValue('nearest')
    await wrapper.find('select').setValue('farthest')
    expect(wrapper.emitted('update:dueOrder')).toEqual([['nearest'], ['farthest']])
    wrapper.unmount()
  })
})
