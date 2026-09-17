import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
const storage = vi.hoisted(() => ({ sign: vi.fn() }))
vi.mock('#app', () => ({ useNuxtApp: () => ({ $supabase: { storage: { from: () => ({ createSignedUrl: storage.sign }) } } }) }))
import Gallery from '../../app/components/TaskPhotoGallery.vue'
import { taskPhotos } from '../../app/utils/taskPhotos'
const photos = [{ id: 'a', file_name: 'Foto.jpg', file_path: 'task/a.jpg', mime_type: 'image/jpeg' }, { id: 'b', file_name: 'Foto 2.png', file_path: 'task/b.png', mime_type: 'image/png' }]
const setup = (compact = false) => mount(Gallery, { props: { attachments: photos, compact }, global: { stubs: { BaseDrawer: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>' } } } })
afterEach(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', undefined)
  vi.stubGlobal('Image', class { onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(value: string) { if (value) Promise.resolve().then(() => this.onload?.()) } })
  storage.sign.mockReset().mockImplementation(path => Promise.resolve({ data: { signedUrl: 'https://example.test/' + path }, error: null })) })
describe('Task photos', () => {
  it('includes image uploads and extension fallback, excluding other files', () => {
    expect(taskPhotos([...photos, { id: 'pdf', file_name: 'doc.pdf', file_path: 'doc.pdf', mime_type: 'application/pdf' }])).toHaveLength(2)
    expect(taskPhotos([{ ...photos[0], mime_type: null }])).toHaveLength(1)
  })
  it('loads a protected cover immediately in card mode and navigates photos', async () => {
    const w = setup(); await flushPromises()
    expect(w.find('img').attributes('src')).toContain('task/a.jpg')
    expect(storage.sign).toHaveBeenCalledWith('task/a.jpg', 3600)
    await w.find('[aria-label="Próxima foto"]').trigger('click'); await flushPromises()
    expect(w.find('img').attributes('src')).toContain('task/b.png')
    w.unmount()
  })
  it('only fetches a signed image after clicking the table icon', async () => {
    const w = setup(true); await flushPromises()
    expect(storage.sign).not.toHaveBeenCalled()
    await w.find('.photo-icon').trigger('click'); await flushPromises()
    expect(w.find('.photo-expanded img').exists()).toBe(true)
    w.unmount()
  })
  it('offers retry when the photo cannot be loaded', async () => {
    storage.sign.mockResolvedValueOnce({ error: new Error('denied') })
    const w = setup(); await flushPromises()
    expect(w.text()).toContain('Foto indisponível')
    await w.find('.photo-cover').trigger('click'); await flushPromises()
    expect(w.find('.photo-expanded img').exists()).toBe(true)
    w.unmount()
  })
  it('ignores a previous photo response after navigating', async () => {
    let finish: any
    storage.sign.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const w = setup()
    await flushPromises()
    await w.find('[aria-label="Próxima foto"]').trigger('click'); await flushPromises()
    finish({ data: { signedUrl: 'https://example.test/old.jpg' } }); await flushPromises()
    expect(w.find('img').attributes('src')).toContain('task/b.png')
    w.unmount()
  })
  it('stops waiting after 12 seconds, retries and ignores the late first response', async () => {
    vi.useFakeTimers()
    let finish: any
    storage.sign.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const w = setup()
    try {
      await vi.advanceTimersByTimeAsync(12001)
      expect(w.text()).toContain('Foto indisponível')
      await w.find('.photo-cover').trigger('click'); await flushPromises()
      expect(w.find('.photo-expanded img').attributes('src')).toContain('task/a.jpg')
      finish({ data: { signedUrl: 'https://example.test/stale.jpg' } }); await flushPromises()
      expect(w.find('.photo-expanded img').attributes('src')).not.toContain('stale')
    } finally { w.unmount(); vi.useRealTimers() }
  })
  it('does not repeat a pending request when opening the large photo', async () => {
    storage.sign.mockImplementationOnce(() => new Promise(() => {}))
    const w = setup()
    await w.find('.photo-cover').trigger('click')
    await flushPromises()
    expect(storage.sign).toHaveBeenCalledTimes(1)
    w.unmount()
  })

  it('does not request photos outside the visible area', async () => {
    let intersect: any
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: any) { intersect = callback } observe() {} disconnect() {} })
    const w = setup(); await flushPromises()
    expect(storage.sign).not.toHaveBeenCalled()
    intersect([{ isIntersecting: true }]); await flushPromises()
    expect(w.find('img').exists()).toBe(true)
    w.unmount()
  })
  it('reports file download failure even when URL signing succeeds', async () => {
    vi.stubGlobal('Image', class { onerror: (() => void) | null = null; onload: (() => void) | null = null; set src(value: string) { if (value) Promise.resolve().then(() => this.onerror?.()) } })
    const w = setup(); await flushPromises()
    expect(w.text()).toContain('Foto indisponível')
    w.unmount()
  })

})
