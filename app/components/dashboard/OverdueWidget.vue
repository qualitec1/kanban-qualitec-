<template>
  <div class="h-full flex flex-col">
    <!-- Resumo no topo -->
    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-100">
      <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <p class="text-2xl font-bold text-red-600 leading-none">{{ tasks.length }}</p>
        <p class="text-xs text-neutral-500 mt-0.5">
          {{ tasks.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas' }}
        </p>
      </div>
      <div v-if="tasks.length > 0" class="ml-auto">
        <span class="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
          Atenção necessária
        </span>
      </div>
    </div>

    <!-- Lista de tarefas -->
    <div class="flex-1 overflow-auto space-y-2 min-h-0">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex items-start gap-3 p-2.5 rounded-lg bg-red-50/60 border border-red-100 hover:bg-red-50 transition-colors"
      >
        <!-- Ícone de alerta -->
        <div class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
          <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-neutral-800 truncate">{{ task.title }}</p>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <!-- Board -->
            <span class="text-xs text-neutral-500 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
              </svg>
              {{ task.boardName }}
            </span>
            <!-- Data -->
            <span class="text-xs font-medium text-red-600 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
              </svg>
              {{ formatDate(task.dueDate) }}
            </span>
            <!-- Responsáveis -->
            <span v-if="task.assignees.length" class="text-xs text-neutral-500">
              {{ task.assignees.slice(0, 2).join(', ') }}{{ task.assignees.length > 2 ? ` +${task.assignees.length - 2}` : '' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!tasks.length" class="flex flex-col items-center justify-center py-10 text-center">
        <div class="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm font-semibold text-neutral-700">Tudo em dia</p>
        <p class="text-xs text-neutral-400 mt-1">Nenhuma tarefa atrasada</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OverdueTask } from '~/composables/useDashboard'

defineProps<{ tasks: OverdueTask[] }>()

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>
