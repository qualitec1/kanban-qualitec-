<template>
  <div class="h-full flex flex-col justify-between">
    <!-- Resumo do Cronograma -->
    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-100">
      <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <div>
        <p class="text-2xl font-bold text-orange-600 leading-none">{{ totalCount }}</p>
        <p class="text-xs text-neutral-500 mt-0.5">tarefas agendadas</p>
      </div>
      <div class="ml-auto flex gap-2">
        <span v-if="overdueTasks.length > 0" class="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
          {{ overdueTasks.length }} atrasadas
        </span>
      </div>
    </div>

    <!-- Lista da Linha do Tempo -->
    <div class="flex-1 overflow-auto space-y-2 pr-1 min-h-0">
      <template v-if="allTasks && allTasks.length > 0">
        <div
          v-for="task in allTasks"
          :key="task.id"
          class="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200 transition-all duration-[150ms]"
        >
          <!-- Indicador lateral de status de prazo -->
          <div class="w-1.5 h-10 rounded-full shrink-0 mt-0.5" :class="task.isOverdue ? 'bg-red-500' : 'bg-orange-400'" />

          <!-- Detalhes da Tarefa -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-semibold text-neutral-800 truncate" :title="task.title">
                {{ task.title }}
              </span>
            </div>
            
            <div class="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
              <span class="truncate">Quadro: <span class="font-medium text-neutral-500">{{ task.boardName }}</span></span>
              <span>•</span>
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatDate(task.dueDate) }}
              </span>
            </div>
          </div>

          <!-- Badges e Avatares dos Responsáveis -->
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <!-- Em quanto tempo vence ou se já está atrasada -->
            <span
              class="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              :class="task.isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'"
            >
              {{ task.isOverdue ? 'Atrasada' : getRemainingText(task.daysUntilDue) }}
            </span>

            <!-- Avatares (Pilha) -->
            <div class="flex -space-x-1 overflow-hidden" v-if="task.assignees && task.assignees.length > 0">
              <div
                v-for="(assignee, idx) in task.assignees.slice(0, 3)"
                :key="idx"
                class="inline-block h-4 w-4 rounded-full ring-1 ring-white bg-neutral-200 flex items-center justify-center text-[8px] font-semibold text-neutral-600"
                :title="assignee"
              >
                {{ assignee.charAt(0).toUpperCase() }}
              </div>
              <div
                v-if="task.assignees.length > 3"
                class="inline-block h-4 w-4 rounded-full ring-1 ring-white bg-neutral-300 flex items-center justify-center text-[7px] font-bold text-neutral-600"
              >
                +{{ task.assignees.length - 3 }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Estado Vazio -->
      <div v-else class="flex flex-col items-center justify-center py-10 text-center">
        <div class="w-14 h-14 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-neutral-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <p class="text-sm font-semibold text-neutral-700">Sem agendamentos</p>
        <p class="text-xs text-neutral-400 mt-1">Nenhuma tarefa com data definida para este painel</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  upcomingTasks: any[]
  overdueTasks: any[]
}>()

const totalCount = computed(() => props.upcomingTasks.length + props.overdueTasks.length)

const allTasks = computed(() => {
  const overdue = props.overdueTasks.map(t => ({ ...t, isOverdue: true, daysUntilDue: -1 }))
  const upcoming = props.upcomingTasks.map(t => ({ ...t, isOverdue: false }))
  
  return [...overdue, ...upcoming].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch (e) {
    return dateStr
  }
}

function getRemainingText(days: number): string {
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return `Em ${days} dias`
}
</script>
