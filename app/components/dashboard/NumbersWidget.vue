<template>
  <div class="h-full flex flex-col justify-between">
    <!-- Resumo Geral de Tarefas -->
    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-100">
      <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </div>
      <div>
        <p class="text-2xl font-bold text-purple-600 leading-none">{{ totalTasks }}</p>
        <p class="text-xs text-neutral-500 mt-0.5">total de tarefas</p>
      </div>
    </div>

    <!-- Grid de Métricas Principais (Cards) -->
    <div class="grid grid-cols-2 gap-3 flex-1 overflow-auto pr-1 min-h-0 py-1">
      <!-- Tarefas Concluídas -->
      <div class="flex flex-col justify-between p-3 rounded-xl border border-neutral-100 hover:border-green-200 hover:bg-green-50/10 transition-all duration-[150ms] shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Concluídas</span>
          <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold text-green-600 mt-2">{{ completedTasks }}</p>
      </div>

      <!-- Tarefas Atrasadas -->
      <div class="flex flex-col justify-between p-3 rounded-xl border border-neutral-100 hover:border-red-200 hover:bg-red-50/10 transition-all duration-[150ms] shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Atrasadas</span>
          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold text-red-600 mt-2">{{ overdueCount }}</p>
      </div>

      <!-- Total de Responsáveis -->
      <div class="flex flex-col justify-between p-3 rounded-xl border border-neutral-100 hover:border-blue-200 hover:bg-blue-50/10 transition-all duration-[150ms] shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Membros</span>
          <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold text-blue-600 mt-2">{{ assigneesCount }}</p>
      </div>

      <!-- Total de Arquivos -->
      <div class="flex flex-col justify-between p-3 rounded-xl border border-neutral-100 hover:border-cyan-200 hover:bg-cyan-50/10 transition-all duration-[150ms] shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Arquivos</span>
          <svg class="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold text-cyan-600 mt-2">{{ fileCount }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatusData } from '~/composables/useDashboard'

const props = defineProps<{
  statuses: StatusData[]
  overdueCount: number
  upcomingCount: number
  assigneesCount: number
  fileCount: number
}>()

const totalTasks = computed(() => props.statuses.reduce((sum, s) => sum + s.count, 0))

const completedTasks = computed(() => 
  props.statuses.filter(s => s.isDone).reduce((sum, s) => sum + s.count, 0)
)
</script>
