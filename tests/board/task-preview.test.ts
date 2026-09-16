import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { effectScope } from 'vue'
const db = vi.hoisted(() => ({ from: vi.fn(), taskResult: null as any, statuses: [] as any[], calls: [] as any[] }))
vi.mock('#app', () => ({ useNuxtApp: () => ({ $supabase: { from: db.from } }) }))
import Preview from '../../app/components/TaskQuickPreview.vue'
import Drawer from '../../app/components/BaseDrawer.vue'
import { useTaskPreview } from '../../app/composables/useTaskPreview'
let wrappers: any[] = []
const initialTask = { id: 'task', title: 'Resumo inicial' }
function setup(canEdit = true, extra = {}) {
  const wrapper = mount(Preview, { props: { modelValue: true, taskId: 'task', boardId: 'board', initialTask, canEdit, ...extra }, global: { components: { BaseDrawer: Drawer }, stubs: { teleport: true, TaskModal: { emits: ['updated', 'update:modelValue'], template: `<button class="save-editor" @click="$emit('updated'); $emit('update:modelValue', false)">Salvar</button>` }, SubtaskModal: true } } })
  wrappers.push(wrapper); return wrapper
}
beforeEach(() => {
  vi.clearAllMocks(); db.calls = []
  db.statuses = [{ id: 'done', name: 'Concluído', is_done: true, color: '#008855' }]
  db.taskResult = { data: { id: 'task', title: 'Revisar contrato', budget: 0, due_date: '2020-01-01', status_id: 'done', description: 'Texto completo', task_attachments: [{ count: 2 }], task_assignees: [{ profiles: { id: 'person', full_name: 'Ana' } }], subtasks: [{ id: 'sub', title: 'Validar assinatura', is_done: false, sort_order: 2, notes: 'Conferir com equipe', subtask_assignees: [] }, { id: 'done-sub', title: 'Conferir dados', is_done: true, sort_order: 1, subtask_assignees: [] }] }, error: null }
  db.from.mockImplementation(table => {
    const result = () => table === 'tasks' ? db.taskResult : { data: table === 'task_statuses' ? db.statuses : [], error: null }
    const query: any = { select: () => query, eq: (key: string, value: string) => { db.calls.push([table,key,value]); return query }, single: () => Promise.resolve(result()), then: (resolve: any) => Promise.resolve(result()).then(resolve) }
    return query
  })
})
afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers = [] })
describe('Shared task preview', () => {
  it('loads the task within the board, displays progress, people and zero budget', async () => {
    const w = setup(); await flushPromises()
    expect(w.text()).toContain('Revisar contrato'); expect(w.text()).toContain('Ana')
    expect(w.text()).toContain('50% concluído'); expect(w.text()).toContain('0,00')
    expect(w.find('.preview-overdue').exists()).toBe(false)
    expect(db.calls).toContainEqual(['tasks','board_id','board'])
  })
  it('navigates to a subtask and back without editing it', async () => {
    const w = setup(); await flushPromises()
    await w.findAll('.preview-child')[1].trigger('click')
    expect(w.find('h3').text()).toBe('Validar assinatura')
    expect(w.text()).toContain('Conferir com equipe')
    await w.find('.preview-back').trigger('click')
    expect(w.find('h3').text()).toBe('Revisar contrato')
  })
  it('opens directly on the requested subtask and hides editing from readers', async () => {
    const w = setup(false, { initialSubtaskId: 'sub' }); await flushPromises()
    expect(w.find('h3').text()).toBe('Validar assinatura')
    expect(w.find('.preview-edit').exists()).toBe(false)
  })
  it('discards stale initial content on denied/missing tasks and supports retry', async () => {
    db.taskResult = { data: null, error: new Error('denied') }
    const w = setup(); await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Resumo inicial')
    db.taskResult = { data: { id: 'task', title: 'Disponível novamente' }, error: null }
    await w.find('.preview-error button').trigger('click'); await flushPromises()
    expect(w.find('h3').text()).toBe('Disponível novamente')
  })
  it('refreshes after closing the editor and notifies the board', async () => {
    const w = setup(); await flushPromises()
    await w.find('.preview-edit').trigger('click')
    db.taskResult.data.title = 'Título atualizado'
    await w.find('.save-editor').trigger('click'); await flushPromises()
    expect(w.find('h3').text()).toBe('Título atualizado')
    expect(w.emitted('updated')).toHaveLength(1)
  })
  it('ignores slow responses from a previously selected task', async () => {
    let finishOld: any
    const original = db.from.getMockImplementation()!
    let first = true
    db.from.mockImplementation(table => {
      const q = original(table)
      if (table === 'tasks' && first) { first = false; q.single = () => new Promise(resolve => { finishOld = resolve }) }
      return q
    })
    const scope = effectScope(); const preview = scope.run(() => useTaskPreview())!
    const old = preview.load('old', 'board'); await preview.load('new', 'board')
    finishOld({ data: { id: 'old', title: 'Old task' } }); await old
    expect(preview.task.value.title).toBe('Revisar contrato'); scope.stop()
  })
})

describe('Preview drawer keyboard navigation', () => {
  it('keeps Tab inside the drawer and restores focus when closing', async () => {
    const trigger = document.createElement('button'); document.body.appendChild(trigger); trigger.focus()
    const w = mount(Drawer, { props: { modelValue: true, title: 'Preview' }, attachTo: document.body, slots: { default: '<button class="last-action">Detalhes</button>' } })
    wrappers.push(w); await flushPromises()
    const last = document.querySelector<HTMLButtonElement>('.last-action')!
    last.focus(); last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Fechar painel')
    await w.setProps({ modelValue: false }); await flushPromises()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
