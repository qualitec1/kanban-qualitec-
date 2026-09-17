<template>
  <div v-if="photos.length" ref="galleryElement" class="task-photo-gallery" :class="{ compact }" @click.stop @pointerdown.stop @touchstart.stop @dragstart.stop.prevent>
    <button v-if="compact" type="button" class="photo-icon" :aria-label="'Ver ' + photos.length + ' fotos da tarefa'" title="Ver fotos" @click="open">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg><span>{{ photos.length }}</span>
    </button>
    <template v-else>
      <button type="button" class="photo-cover" :aria-label="'Ampliar foto: ' + current?.file_name" @click="open">
        <img v-if="url && !failed" :src="url" :alt="current?.file_name" loading="lazy" draggable="false" @error="imageFailed" />
        <span v-else>{{ failed ? 'Foto indisponível · Tentar novamente' : 'Carregando foto…' }}</span>
      </button>
      <div v-if="photos.length > 1" class="photo-navigation"><button type="button" aria-label="Foto anterior" @click="step(-1)">‹</button><span>{{ index + 1 }}/{{ photos.length }}</span><button type="button" aria-label="Próxima foto" @click="step(1)">›</button></div>
    </template>
    <BaseDrawer :model-value="opened" title="Fotos da tarefa" size="lg" @update:model-value="opened = $event">
      <div class="photo-expanded">
        <img v-if="url && !failed" :src="url" :alt="current?.file_name" @error="imageFailed" />
        <p v-else role="status">{{ failed ? errorMessage : 'Carregando foto…' }}</p>
        <button v-if="failed" type="button" @click="loadPhoto">Tentar novamente</button>
      </div>
      <p class="photo-name">{{ current?.file_name }}</p>
      <template #footer><button type="button" :disabled="photos.length < 2" aria-label="Foto anterior" @click="step(-1)">← Anterior</button><span>{{ index + 1 }} de {{ photos.length }}</span><button type="button" :disabled="photos.length < 2" aria-label="Próxima foto" @click="step(1)">Próxima →</button></template>
    </BaseDrawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useNuxtApp } from '#app'
import { enqueuePhoto } from '~/utils/photoQueue'
import { taskPhotos, type TaskPhoto } from '~/utils/taskPhotos'

const props = defineProps<{ attachments: TaskPhoto[]; compact?: boolean }>()
const supabase = useNuxtApp().$supabase as any
const photos = computed(() => taskPhotos(props.attachments))
const galleryElement = ref<HTMLElement | null>(null)
const visible = ref(typeof IntersectionObserver === 'undefined')
let observer: IntersectionObserver | undefined
const index = ref(0)
const current = computed(() => photos.value[index.value])
const opened = ref(false)
const url = ref('')
const failed = ref(false)
const loading = ref(false)
const errorMessage = ref('')
let stopWaiting: (() => void) | undefined
let request = 0

async function loadPhoto() {
  const id = ++request
  stopWaiting?.()
  url.value = ''; failed.value = false; errorMessage.value = ''; loading.value = false
  if (!current.value || (props.compact && !opened.value) || (!visible.value && !opened.value)) return
  loading.value = true
  const path = current.value.file_path
  try {
    const source = await enqueuePhoto(async () => {
      if (id !== request) throw new Error('cancelled')
      let timer: ReturnType<typeof setTimeout> | undefined
      let image: HTMLImageElement | undefined
      let settled = false
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), 12000)
          stopWaiting = () => { clearTimeout(timer); reject(new Error('cancelled')) }
        })
        const download = async () => {
          const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(path, 3600)
          if (settled || id !== request) throw new Error('cancelled')
          if (error || !data?.signedUrl) throw new Error('unavailable')
          // Hold the queue slot until the actual file has loaded, not just its signed URL.
          await new Promise<void>((resolve, reject) => {
            image = new Image()
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('download'))
            image.src = data.signedUrl
          })
          return data.signedUrl as string
        }
        return await Promise.race([download(), timeout])
      } finally {
        settled = true
        clearTimeout(timer)
        if (image) { image.onload = null; image.onerror = null; image.src = '' }
        if (id === request) stopWaiting = undefined
      }
    })
    if (id === request) url.value = source
  } catch (error) {
    if (id !== request) return
    failed.value = true
    errorMessage.value = error instanceof Error && error.message === 'timeout'
      ? 'O serviço de fotos demorou para responder. Tente novamente.'
      : 'O serviço de arquivos não entregou esta foto. Tente novamente em instantes.'
  } finally {
    if (id === request) loading.value = false
  }
}

function open() {
  opened.value = true
  if (!loading.value && (!url.value || failed.value)) loadPhoto()
}
function imageFailed() {
  failed.value = true
  errorMessage.value = 'Não foi possível exibir esta imagem. Tente novamente.'
}
function step(direction: number) {
  index.value = (index.value + direction + photos.value.length) % photos.value.length
}

watch(() => [current.value?.file_path, visible.value], loadPhoto, { immediate: true })
watch(galleryElement, element => {
  if (typeof IntersectionObserver === 'undefined' || props.compact || !element || visible.value) return
  observer?.disconnect()
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { visible.value = true; observer?.disconnect() }
  }, { rootMargin: '200px' })
  observer.observe(element)
}, { flush: 'post' })
watch(photos, value => { if (index.value >= value.length) index.value = 0; if (!value.length) opened.value = false })
onUnmounted(() => { request++; stopWaiting?.(); observer?.disconnect() })
</script>

<style scoped>
.task-photo-gallery { position:relative; flex-shrink:0; margin:8px 0; }
.photo-cover { width:100%; height:150px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px; overflow:hidden; color:#64748b; font-size:12px; }
.photo-cover img { width:100%; height:100%; object-fit:cover; }
.photo-navigation { position:absolute; bottom:6px; right:6px; display:flex; align-items:center; gap:8px; background:#0f172acc; color:white; border-radius:8px; font-size:11px; }
.photo-navigation button { width:28px; height:28px; font-size:20px; }
.photo-icon { display:flex; align-items:center; gap:5px; color:#2563eb; font-size:12px; min-height:36px; padding:4px; border-radius:6px; }
.compact { margin:0; }
.photo-expanded { min-height:420px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border-radius:12px; gap:14px; }
.photo-expanded img { max-width:100%; max-height:85dvh; min-height:50vh; object-fit:contain; }
.photo-name { margin-top:12px; color:#64748b; font-size:12px; overflow-wrap:anywhere; }
button:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
button:disabled { opacity:.4; }
</style>
