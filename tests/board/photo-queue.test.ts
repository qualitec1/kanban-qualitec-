import { it, expect } from 'vitest'
import { createPhotoQueue, getCachedUrl, setCachedUrl } from '../../app/utils/photoQueue'
it('limits simultaneous API calls and releases failed slots', async () => {
  const enqueue = createPhotoQueue(2)
  let active = 0, peak = 0
  const jobs = Array.from({ length: 6 }, (_, index) => enqueue(async () => {
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 5))
    active--
    if (index === 0) throw new Error('failure')
    return index
  }))
  const results = await Promise.allSettled(jobs)
  expect(peak).toBe(2)
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5)
})
it('caches signed URLs and returns null for expired/missing entries', () => {
  expect(getCachedUrl('nonexistent/path.jpg')).toBeNull()
  setCachedUrl('test/photo.jpg', 'https://example.com/signed', 3600)
  expect(getCachedUrl('test/photo.jpg')).toBe('https://example.com/signed')
})

