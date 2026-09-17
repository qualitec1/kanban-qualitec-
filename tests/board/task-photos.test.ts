import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const storage = vi.hoisted(() => ({ sign: vi.fn() }))
vi.mock('#app', () => ({ useNuxtApp: () => ({ $supabase: { storage: { from: () => ({ createSignedUrl: storage.sign }) } } }) }))
// Mock cache to always miss so tests always call the API
vi.mock('../../app/utils/photoQueue', async (importOriginal) => {
  const actual = await importOriginal() as any
  return { ...actual, getCachedUrl: () => null, setCachedUrl: () => {} }
})
import Gallery from '../../app/components/TaskPhotoGallery.vue'
import { taskPhotos } from '../../app/utils/taskPhotos'

const photos = [
  { id: 'a', file_name: 'Foto.jpg', file_path: 'task/a.jpg', mime_type: 'image/jpeg' },
  { id: 'b', file_name: 'Foto 2.png', file_path: 'task/b.png', mime_type: 'image/png' },
]
const setup = (compact = false) => mount(Gallery, {
  props: { attachments: photos, compact },
  global: { stubs: { BaseDrawer: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>' } } },
})

afterEach(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', undefined)
  storage.sign.mockReset().mockImplementation(path =>
    Promise.resolve({ data: { signedUrl: 'https://example.test/' + path }, error: null })
  )
})

describe('Task photos', () => {
  it('includes image and PDF uploads, excluding other unsupported files', () => {
    expect(taskPhotos([...photos, { id: 'pdf', file_name: 'doc.pdf', file_path: 'doc.pdf', mime_type: 'application/pdf' }])).toHaveLength(3)
    expect(taskPhotos([...photos, { id: 'zip', file_name: 'archive.zip', file_path: 'archive.zip', mime_type: 'application/zip' }])).toHaveLength(2)
    expect(taskPhotos([{ ...photos[0], mime_type: null }])).toHaveLength(1)
  })

  it('renders a PDF cover and expanded PDF viewer', async () => {
    const pdfPhotos = [
      { id: 'p1', file_name: 'manual.pdf', file_path: 'task/manual.pdf', mime_type: 'application/pdf' },
    ]
    const w = mount(Gallery, {
      props: { attachments: pdfPhotos },
      global: { stubs: { BaseDrawer: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>' } } },
    })
    await flushPromises()
    expect(w.find('.pdf-cover-frame').attributes('src')).toContain('task/manual.pdf')
    expect(w.find('.pdf-badge').text()).toBe('PDF')
    await w.find('.photo-cover').trigger('click')
    await flushPromises()
    expect(w.find('.pdf-expanded iframe').attributes('src')).toContain('task/manual.pdf')
    w.unmount()
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
})
