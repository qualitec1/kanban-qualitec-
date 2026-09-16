import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardControls from '../../app/components/dashboard/DashboardControls.vue'
import { defaultDashboardFilters, defaultDashboardSettings } from '../../app/utils/dashboard'
function mountControls(panel: 'people' | 'filters' | 'settings') {
  return mount(DashboardControls, {
    props: { panel, filters: defaultDashboardFilters(), settings: defaultDashboardSettings(), people: [{ userId: 'ana', userName: 'Ana', userAvatar: null, taskCount: 2 }], statuses: [{ id: 'open', name: 'Aberta' }], priorities: [{ id: 'high', name: 'Alta' }] },
    global: { stubs: { BaseModal: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })
}
function button(wrapper: ReturnType<typeof mountControls>, label: string) { return wrapper.findAll('button').find(b => b.text() === label)! }
describe('Dashboard control interactions', () => {
  it('applies a selected person only after confirmation', async () => {
    const wrapper = mountControls('people')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(wrapper.props('filters').people).toEqual([])
    expect(wrapper.emitted('apply-filters')).toBeUndefined()
    await button(wrapper, 'Aplicar filtros').trigger('click')
    expect(wrapper.emitted('apply-filters')?.[0]?.[0]).toMatchObject({ people: ['ana'] })
    wrapper.unmount()
  })
  it('discards cancelled edits when reopening', async () => {
    const wrapper = mountControls('people')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await button(wrapper, 'Cancelar').trigger('click')
    expect(wrapper.emitted('apply-filters')).toBeUndefined()
    await wrapper.setProps({ panel: null }); await wrapper.setProps({ panel: 'people' })
    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    wrapper.unmount()
  })
  it('prevents applying an inverted date range', async () => {
    const wrapper = mountControls('filters')
    const dates = wrapper.findAll('input[type="date"]')
    await dates[0].setValue('2026-09-20'); await dates[1].setValue('2026-09-16')
    expect(wrapper.get('[role="alert"]').text()).toContain('data final')
    expect(button(wrapper, 'Aplicar filtros').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('clears conflicting dates when selecting no deadline', async () => {
    const wrapper = mountControls('filters')
    await wrapper.findAll('input[type="date"]')[0].setValue('2026-09-16')
    await wrapper.findAll('select')[1].setValue('no_date')
    await button(wrapper, 'Aplicar filtros').trigger('click')
    expect(wrapper.emitted('apply-filters')?.[0]?.[0]).toMatchObject({ due: 'no_date', from: '', to: '' })
    wrapper.unmount()
  })
  it('applies settings and reorganizes only on save', async () => {
    const wrapper = mountControls('settings')
    await wrapper.findAll('select')[0].setValue('7'); await wrapper.findAll('select')[1].setValue('60')
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)
    expect(wrapper.emitted('reorganize')).toBeUndefined()
    await button(wrapper, 'Salvar configurações').trigger('click')
    expect(wrapper.emitted('apply-settings')?.[0]?.[0]).toEqual({ upcomingDays: 7, refreshSeconds: 60, lockLayout: true })
    expect(wrapper.emitted('reorganize')).toHaveLength(1)
    wrapper.unmount()
  })
})
