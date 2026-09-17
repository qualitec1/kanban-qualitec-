/** Share a small request budget across cards, including the image download. */
export function createPhotoQueue(limit = 2) {
  let active = 0
  const waiting: Array<() => void> = []
  function drain() {
    while (active < limit && waiting.length) { active++; waiting.shift()!() }
  }
  return function enqueue<T>(work: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      waiting.push(() => {
        Promise.resolve().then(work).then(resolve, reject).finally(() => { active--; drain() })
      })
      drain()
    })
  }
}
export const enqueuePhoto = createPhotoQueue(6)
