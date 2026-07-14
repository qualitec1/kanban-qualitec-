<template>
  <div class="h-full flex flex-col justify-between">
    <!-- Resumo dos Arquivos -->
    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-100">
      <div class="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <div>
        <p class="text-2xl font-bold text-cyan-600 leading-none">{{ fileCount }}</p>
        <p class="text-xs text-neutral-500 mt-0.5">arquivos no total</p>
      </div>
    </div>

    <!-- Lista de Arquivos Recentes -->
    <div class="flex-1 overflow-auto space-y-2 pr-1 min-h-0">
      <template v-if="files && files.length > 0">
        <div
          v-for="file in files"
          :key="file.id"
          class="flex items-center gap-3 p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200 transition-all duration-[150ms]"
        >
          <!-- Ícone do tipo de arquivo -->
          <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="getFileIconClasses(file.mimeType)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="getFileIconPath(file.mimeType)" />
            </svg>
          </div>

          <!-- Informações do arquivo -->
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-neutral-700 truncate" :title="file.name">
              {{ file.name }}
            </p>
            <p class="text-[10px] text-neutral-400 mt-0.5 truncate">
              Em: <span class="font-medium text-neutral-500">{{ file.taskName }}</span>
            </p>
          </div>

          <!-- Tamanho e Data -->
          <div class="text-right shrink-0">
            <p class="text-[10px] font-bold text-neutral-600">{{ formatBytes(file.size) }}</p>
            <p class="text-[9px] text-neutral-400 mt-0.5">{{ formatDate(file.createdAt) }}</p>
          </div>
        </div>
      </template>

      <!-- Estado Vazio -->
      <div v-else class="flex flex-col items-center justify-center py-10 text-center">
        <div class="w-14 h-14 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-neutral-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p class="text-sm font-semibold text-neutral-700">Sem arquivos</p>
        <p class="text-xs text-neutral-400 mt-1">Nenhum arquivo anexado nas tarefas deste painel</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineProps<{
  files: any[]
  fileCount: number
}>()

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch (e) {
    return ''
  }
}

function getFileIconClasses(mime: string | null): string {
  if (!mime) return 'bg-neutral-100 text-neutral-500'
  if (mime.startsWith('image/')) return 'bg-rose-50 text-rose-500'
  if (mime.includes('pdf')) return 'bg-red-50 text-red-500'
  if (mime.includes('word') || mime.includes('officedocument.word')) return 'bg-blue-50 text-blue-500'
  if (mime.includes('excel') || mime.includes('officedocument.sheet') || mime.includes('spreadsheet')) return 'bg-green-50 text-green-500'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) return 'bg-amber-50 text-amber-500'
  return 'bg-neutral-50 text-neutral-500'
}

function getFileIconPath(mime: string | null): string {
  if (!mime) return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  if (mime.startsWith('image/')) return 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z'
  if (mime.includes('pdf')) return 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12h5.25m-5.25 3h5.25'
  return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
}
</script>
