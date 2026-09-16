import { mount, config } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Freeform from '../../app/components/board/BoardFreeformView.vue'
import Kanban from '../../app/components/KanbanView.vue'
import { readPositions, addMissingPositions } from '../../app/utils/freeformLayout'
config.global.stubs.TaskQuickPreview = { props: ['taskId', 'initialTask'], template: '<div data-preview>{{ taskId }}</div>' }
const tasks = [{ id: 'a', title: 'Revisar proposta', position: 4, status_id: 's' }, { id: 'b', title: 'Enviar orçamento', position: 5 }]
const groups = [{ id: 'g', name: 'Comercial', color: '#123456' }, { id: 'h', name: 'Operações', color: '#123456' }]
const props = { boardId: 'test', tasksByGroup: { g: tasks }, canEdit: true, groups, statuses: [{ id: 's', name: 'Em andamento', color: '#123456' }], priorities: [] }
beforeEach(() => { localStorage.clear(); HTMLElement.prototype.scrollTo = vi.fn() })
describe('Livre', () => {
  it('rejects malformed browser preferences and normalizes old small cards', () => {
    expect(readPositions('{bad')).toEqual({})
    expect(readPositions('{"a":4,"b":{"x":-1,"y":0,"width":300,"height":250}}')).toEqual({})
    expect(readPositions('{"a":{"x":10,"y":10,"width":180,"height":120}}').a.width).toBe(300)
  })
  it('places new cards outside existing cards and retains hidden positions', () => {
    const original = { hidden: { x: 24, y: 24, width: 650, height: 600 } }
    const layout = addMissingPositions(['a', 'b'], original, 3)
    expect(layout.hidden).toEqual(original.hidden)
    expect(layout.a.x >= 686 || layout.a.y >= 636).toBe(true)
    expect(layout.a).not.toEqual(layout.b)
    expect(original).not.toHaveProperty('a')
  })
  it('renders real status and unique coordinates without mutating task order', async () => {
    const wrapper = mount(Freeform, { props: props as any })
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('article')
    expect(cards[0].attributes('style')).not.toEqual(cards[1].attributes('style'))
    expect(wrapper.text()).toContain('Em andamento')
    expect(tasks.map(t => t.position)).toEqual([4, 5])
    await wrapper.find('.card-title').trigger('click')
    expect(wrapper.find('[data-preview]').text()).toBe('a')
    wrapper.unmount()
  })
  it('saves keyboard movement and restores it after reopening', async () => {
    let wrapper = mount(Freeform, { props: props as any })
    await wrapper.find('.move-handle').trigger('keydown', { key: 'ArrowRight' })
    const saved = readPositions(localStorage.getItem('board-tasks-positions-test'))
    expect(saved.a.x).toBe(34)
    wrapper.unmount()
    wrapper = mount(Freeform, { props: props as any })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('article').attributes('style')).toContain('left: 34px')
    wrapper.unmount()
  })
  it('moves and resizes with a pointer without changing task data', async () => {
    const wrapper = mount(Freeform, { props: props as any })
    await wrapper.find('.move-handle').trigger('pointerdown', { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
    document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 70, clientY: 90 }))
    document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    expect(readPositions(localStorage.getItem('board-tasks-positions-test')).a).toMatchObject({ x: 84, y: 104 })
    await wrapper.find('.resize-handle').trigger('pointerdown', { button: 0, pointerId: 2, clientX: 0, clientY: 0 })
    document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 50, clientY: 50 }))
    document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }))
    expect(readPositions(localStorage.getItem('board-tasks-positions-test')).a).toMatchObject({ width: 350, height: 298 })
    expect(tasks[0].position).toBe(4)
    wrapper.unmount()
  })
  it('remains usable when browser storage is unavailable', async () => {
    const original = globalThis.localStorage
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('blocked') } })
    const wrapper = mount(Freeform, { props: props as any })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.findAll('article')).toHaveLength(2)
    wrapper.unmount(); vi.stubGlobal('localStorage', original)
  })
})
describe('Kanban', () => {
  it('filters columns on desktop and restores all groups', async () => {
    const wrapper = mount(Kanban, { props: { ...props, visibleGroups: groups }, global: { stubs: { KanbanColumn: { props: ['group'], template: '<div>{{ group.name }}</div>' } } } })
    const buttons = wrapper.findAll('.group-filters button')
    await buttons[1].trigger('click')
    expect(wrapper.findAll('.kanban-lane')[0].isVisible()).toBe(true)
    expect(wrapper.findAll('.kanban-lane')[1].attributes('style')).toContain('display: none')
    await buttons[0].trigger('click')
    expect(wrapper.findAll('.kanban-lane')[1].attributes('style') || '').not.toContain('display: none')
    wrapper.unmount()
  })
})
