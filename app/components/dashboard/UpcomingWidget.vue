<template>
  <div class="h-full flex flex-col">
    <!-- Resumo no topo -->
    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-100">
      <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <div>
        <p class="text-2xl font-bold text-orange-600 leading-none">{{ tasks.length }}</p>
        <p class="text-xs text-neutral-500 mt-0.5">
          {{ tasks.length === 1 ? 'tarefa nos próximos 30 dias' : 'tarefas nos próximos 30 dias' }}
        </p>
      </div>
      <div v-if="todayCount > 0" class="ml-auto">
        <span class="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-full">
          {{ todayCount }} {{ todayCount === 1 ? 'vence hoje' : 'vencem hoje' }}
        </span>
      </div>
    </div>

    <!-- Lista de tarefas -->
    <div class="flex-1 overflow-auto space-y-2 min-h-0">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex items-start gap-3 p-2.5 rounded-lg border transition-colors"
        :class="getRowClass(task.daysUntilDue)"
      >
        <!-- Badge de dias -->
        <div
          class="shrink-0 min-w-[44px] text-center px-1.5 py-1 rounded-md text-xs font-bold leading-tight"
          :class="getBadgeClass(task.daysUntilDue)"
        >
          <span v-if="task.daysUntilDue === 0">Hoje</span>
          <span v-else-if="task.daysUntilDue === 1">Amanhã</span>
          <span v-else>{{ task.daysUntilDue }}d</span>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-neutral-800 truncate">{{ task.title }}</p>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="text-xs text-neutral-500 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
              </svg>
              {{ task.boardName }}
            </span>
            <span class="text-xs text-neutral-400">{{ formatDate(task.dueDate) }}</span>
            <span v-if="task.assignees.length" class="text-xs text-neutral-500">
              {{ task.assignees.slice(0, 2).join(', ') }}{{ task.assignees.length > 2 ? ` +${task.assignees.length - 2}` : '' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!tasks.length" class="flex flex-col items-center justify-center py-10 text-center">
        <div class="w-14 h-14 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-neutral-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
          </svg>
        </div>
        <p class="text-sm font-semibold text-neutral-700">Agenda limpa</p>
        <p class="text-xs text-neutral-400 mt-1">Nenhum vencimento nos próximos 30 dias</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { DeadlineTask } from '~/composables/useDashboard'

const props = defineProps<{ tasks: DeadlineTask[] }>()

const todayCount = computed(() => props.tasks.filter(t => t.daysUntilDue === 0).length)

function getRowClass(days: number): string {
  if (days === 0) return 'bg-orange-50 border-orange-200'
  if (days <= 3) return 'bg-yellow-50/60 border-yellow-100'
  return 'bg-neutral-50/60 border-neutral-100 hover:bg-neutral-50'
}

function getBadgeClass(days: number): string {
  if (days === 0) return 'bg-orange-500 text-white'
  if (days <= 3) return 'bg-yellow-400 text-yellow-900'
  if (days <= 7) return 'bg-blue-100 text-blue-700'
  return 'bg-neutral-100 text-neutral-600'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>
