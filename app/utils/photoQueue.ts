/**
 * Limita apenas chamadas à API (createSignedUrl) — não o download da imagem.
 * O browser gerencia os downloads em paralelo de forma nativa e eficiente.
 */
export function createPhotoQueue(limit = 10) {
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
export const enqueuePhoto = createPhotoQueue(10)

/** Cache de URLs assinadas: evita re-chamar a API quando a foto já foi carregada. */
const urlCache = new Map<string, { url: string; exp: number }>()

export function getCachedUrl(path: string): string | null {
  const entry = urlCache.get(path)
  // Considerar válida se ainda tiver mais de 5 minutos de vida
  if (entry && entry.exp - Date.now() > 5 * 60 * 1000) return entry.url
  urlCache.delete(path)
  return null
}

export function setCachedUrl(path: string, url: string, ttlSeconds = 3600) {
  urlCache.set(path, { url, exp: Date.now() + ttlSeconds * 1000 })
}
