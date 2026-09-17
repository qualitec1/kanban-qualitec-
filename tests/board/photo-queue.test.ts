import { it, expect } from 'vitest'
import { createPhotoQueue } from '../../app/utils/photoQueue'
it('limits simultaneous downloads and releases failed slots', async () => {
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
