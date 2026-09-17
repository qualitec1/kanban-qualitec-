<template>
  <div v-if="photos.length" ref="galleryElement" class="task-photo-gallery" :class="{ compact }" @click.stop @pointerdown.stop @touchstart.stop @dragstart.stop.prevent>
    <button v-if="compact" type="button" class="photo-icon" :aria-label="'Ver ' + photos.length + ' anexos da tarefa'" :title="'Ver ' + photos.length + ' fotos/PDFs'" @click="open">
      <svg v-if="hasPdf && !hasOnlyImages" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
      <svg v-else width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg>
      <span>{{ photos.length }}</span>
    </button>
    <template v-else>
      <div
        role="button"
        tabindex="0"
        class="photo-cover"
        :aria-label="'Ampliar ' + (isPdf(current) ? 'PDF' : 'foto') + ': ' + current?.file_name"
        @click="open"
        @keydown.enter="open"
        @keydown.space.prevent="open"
      >
        <!-- Pré-visualização de PDF -->
        <template v-if="isPdf(current)">
          <div v-if="url && !failed" class="pdf-cover-container">
            <iframe
              :src="url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'"
              class="pdf-cover-frame"
              tabindex="-1"
              title="Pré-visualização do PDF"
              loading="lazy"
            />
            <div class="pdf-badge">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5h-1v2H7V8.5h2.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V8.5H13c.83 0 1.5.67 1.5 1.5v3.5zm4-3.5h-1.5v1.5h1v1.5h-1v2H17V8.5h3.5v1.5z"/></svg>
              <span>PDF</span>
            </div>
          </div>
          <span v-else>{{ failed ? 'PDF indisponível · Tentar novamente' : 'Carregando PDF…' }}</span>
        </template>

        <!-- Pré-visualização de Imagem / Padrão -->
        <template v-else>
          <img v-if="url && !failed" :src="url" :alt="current?.file_name" loading="lazy" draggable="false" @error="imageFailed" />
          <span v-else>{{ failed ? 'Foto indisponível · Tentar novamente' : 'Carregando foto…' }}</span>
        </template>
      </div>
      <div v-if="photos.length > 1" class="photo-navigation">
        <button type="button" aria-label="Foto anterior" @click="step(-1)">‹</button>
        <span>{{ index + 1 }}/{{ photos.length }}</span>
        <button type="button" aria-label="Próxima foto" @click="step(1)">›</button>
      </div>
    </template>
    <BaseDrawer :model-value="opened" :title="drawerTitle" size="lg" @update:model-value="opened = $event">
      <!-- Visualizador expandido de PDF -->
      <div v-if="isPdf(current)" class="pdf-expanded">
        <div class="pdf-toolbar">
          <span class="pdf-filename" :title="current?.file_name">{{ current?.file_name }}</span>
          <a v-if="url" :href="url" target="_blank" rel="noopener noreferrer" class="pdf-external-btn">
            Abrir em nova aba ↗
          </a>
        </div>
        <iframe
          v-if="url && !failed"
          :src="url + '#view=FitH'"
          class="pdf-viewer-frame"
          :title="current?.file_name"
        />
        <div v-else class="pdf-status" role="status">
          <p>{{ failed ? errorMessage : 'Carregando PDF…' }}</p>
          <button v-if="failed" type="button" class="retry-btn" @click="retry">Tentar novamente</button>
        </div>
      </div>

      <!-- Visualizador expandido de Imagem -->
      <div v-else class="photo-expanded">
        <img v-if="url && !failed" :src="url" :alt="current?.file_name" @error="imageFailed" />
        <p v-else role="status">{{ failed ? errorMessage : 'Carregando foto…' }}</p>
        <button v-if="failed" type="button" class="retry-btn" @click="retry">Tentar novamente</button>
      </div>

      <p v-if="!isPdf(current)" class="photo-name">{{ current?.file_name }}</p>
      <template #footer>
        <button type="button" :disabled="photos.length < 2" aria-label="Foto anterior" @click="step(-1)">← Anterior</button>
        <span>{{ index + 1 }} de {{ photos.length }}</span>
        <button type="button" :disabled="photos.length < 2" aria-label="Próxima foto" @click="step(1)">Próxima →</button>
      </template>
    </BaseDrawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useNuxtApp } from '#app'
import { enqueuePhoto, getCachedUrl, setCachedUrl } from '~/utils/photoQueue'
import { taskPhotos, isPdf, isImage, type TaskPhoto } from '~/utils/taskPhotos'

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
let request = 0

const hasPdf = computed(() => photos.value.some(isPdf))
const hasOnlyImages = computed(() => photos.value.every(isImage))
const drawerTitle = computed(() => {
  if (isPdf(current.value)) return 'Documento PDF'
  return 'Fotos da tarefa'
})

function resolvePhotoUrl(path: string): string {
  if (!path) return ''
  const cached = getCachedUrl(path)
  if (cached) return cached

  try {
    const storage = supabase?.storage?.from?.('task-attachments')
    if (typeof storage?.getPublicUrl === 'function') {
      const res = storage.getPublicUrl(path)
      if (res?.data?.publicUrl) {
        setCachedUrl(path, res.data.publicUrl, 86400)
        return res.data.publicUrl
      }
    }
  } catch {}

  return ''
}

async function loadPhoto() {
  const id = ++request
  const path = current.value?.file_path
  if (!path) return
  if (props.compact && !opened.value) return
  if (!visible.value && !opened.value) return

  failed.value = false
  errorMessage.value = ''

  // 1. URL pública direta do Cloudflare CDN (0ms)
  const publicUrl = resolvePhotoUrl(path)
  if (publicUrl) {
    if (id === request) {
      url.value = publicUrl
      loading.value = false
    }
    return
  }

  // 2. Fallback assinado para ambientes/testes que usam createSignedUrl
  url.value = ''
  loading.value = true

  try {
    const signedUrl = await enqueuePhoto(async () => {
      if (id !== request) throw new Error('cancelled')
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(path, 3600)
      if (id !== request) throw new Error('cancelled')
      if (error || !data?.signedUrl) throw new Error(error?.message || 'unavailable')
      return data.signedUrl as string
    })
    if (id === request) {
      setCachedUrl(path, signedUrl, 3600)
      url.value = signedUrl
    }
  } catch (e: any) {
    if (id !== request) return
    failed.value = true
    errorMessage.value = isPdf(current.value)
      ? 'O serviço demorou para responder ao carregar o PDF. Tente novamente.'
      : 'O serviço de fotos demorou para responder. Tente novamente.'
  } finally {
    if (id === request) loading.value = false
  }
}

function open() {
  opened.value = true
  loadPhoto()
}

function retry() {
  loadPhoto()
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
    if (entries.some(e => e.isIntersecting)) { visible.value = true; observer?.disconnect() }
  }, { rootMargin: '600px' })
  observer.observe(element)
}, { flush: 'post' })

watch(photos, value => {
  if (index.value >= value.length) index.value = 0
  if (!value.length) opened.value = false
})

onUnmounted(() => { request++; observer?.disconnect() })
</script>

<style scoped>
.task-photo-gallery { position:relative; flex-shrink:0; margin:8px 0; }
.photo-cover { width:100%; height:260px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px; overflow:hidden; color:#64748b; font-size:12px; cursor:pointer; }
.photo-cover img { width:100%; height:100%; object-fit:contain; background:#f8fafc; }
.photo-navigation { position:absolute; bottom:6px; right:6px; display:flex; align-items:center; gap:8px; background:#0f172acc; color:white; border-radius:8px; font-size:11px; z-index:10; }
.photo-navigation button { width:28px; height:28px; font-size:20px; }
.photo-icon { display:flex; align-items:center; gap:5px; color:#2563eb; font-size:12px; min-height:36px; padding:4px; border-radius:6px; }
.compact { margin:0; }
.photo-expanded { min-height:80vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border-radius:12px; gap:14px; padding:8px; }
.photo-expanded img { max-width:100%; max-height:82vh; min-height:60vh; object-fit:contain; border-radius:8px; }
.photo-name { margin-top:12px; color:#64748b; font-size:12px; overflow-wrap:anywhere; }
.retry-btn { padding:6px 12px; background:#2563eb; color:white; border-radius:6px; font-size:13px; font-weight:500; }
button:focus-visible, .photo-cover:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
button:disabled { opacity:.4; }

/* PDF preview & viewer styles */
.pdf-cover-container { position:relative; width:100%; height:100%; overflow:hidden; background:#f8fafc; display:flex; align-items:center; justify-content:center; }
.pdf-cover-frame { width:100%; height:100%; border:none; pointer-events:none; }
.pdf-badge { position:absolute; top:8px; left:8px; display:flex; align-items:center; gap:4px; padding:3px 8px; background:#ef4444; color:#ffffff; border-radius:6px; font-size:11px; font-weight:700; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(0,0,0,0.15); pointer-events:none; z-index:5; }
.pdf-expanded { width:100%; height:80vh; min-height:80vh; display:flex; flex-direction:column; background:#f8fafc; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; }
.pdf-toolbar { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; background:#ffffff; border-bottom:1px solid #e2e8f0; font-size:12px; }
.pdf-filename { font-weight:500; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%; }
.pdf-external-btn { display:inline-flex; align-items:center; gap:4px; color:#2563eb; font-weight:600; text-decoration:none; padding:4px 8px; border-radius:4px; background:#eff6ff; }
.pdf-external-btn:hover { background:#dbeafe; }
.pdf-viewer-frame { width:100%; height:100%; flex:1; border:none; }
.pdf-status { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:#64748b; font-size:13px; }
</style>
