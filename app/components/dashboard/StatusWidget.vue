<template>
  <div class="h-full flex flex-col">
    <!-- Resumo no topo -->
    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-100">
      <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p class="text-2xl font-bold text-blue-600 leading-none">{{ totalTasks }}</p>
        <p class="text-xs text-neutral-500 mt-0.5">tarefas no total</p>
      </div>
      <div v-if="doneCount > 0" class="ml-auto">
        <span class="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
          {{ donePercent }}% concluídas
        </span>
      </div>
    </div>

    <!-- Barra de progresso geral -->
    <div v-if="totalTasks > 0" class="mb-4">
      <div class="flex justify-between text-xs text-neutral-500 mb-1">
        <span>Progresso geral</span>
        <span>{{ doneCount }} / {{ totalTasks }}</span>
      </div>
      <div class="h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-blue-400 to-green-500 rounded-full transition-all duration-500"
          :style="{ width: `${donePercent}%` }"
        ></div>
      </div>
    </div>

    <!-- Lista de status -->
    <div class="flex-1 overflow-auto space-y-2 min-h-0">
      <div
        v-for="status in statuses"
        :key="status.statusName"
        class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors"
      >
        <!-- Cor do status -->
        <div
          class="w-3 h-3 rounded-full shrink-0"
          :style="{ backgroundColor: status.color || '#94a3b8' }"
        ></div>

        <!-- Nome -->
        <span class="text-sm text-neutral-700 flex-1 truncate">{{ status.statusName }}</span>

        <!-- Barra proporcional -->
        <div class="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden shrink-0">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{
              width: `${totalTasks > 0 ? (status.count / totalTasks) * 100 : 0}%`,
              backgroundColor: status.color || '#94a3b8'
            }"
          ></div>
        </div>

        <!-- Contagem -->
        <span class="text-sm font-semibold text-neutral-700 w-6 text-right shrink-0">{{ status.count }}</span>

        <!-- Badge concluído -->
        <svg v-if="status.isDone" class="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div v-else class="w-4 shrink-0"></div>
      </div>

      <!-- Empty state -->
      <div v-if="!statuses.length" class="flex flex-col items-center justify-center py-10 text-center">
        <div class="w-14 h-14 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-neutral-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm font-semibold text-neutral-700">Sem dados</p>
        <p class="text-xs text-neutral-400 mt-1">Nenhuma tarefa encontrada nos boards</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { StatusData } from '~/composables/useDashboard'

const props = defineProps<{ statuses: StatusData[] }>()

const totalTasks = computed(() => props.statuses.reduce((sum, s) => sum + s.count, 0))

const doneCount = computed(() =>
  props.statuses.filter(s => s.isDone).reduce((sum, s) => sum + s.count, 0)
)

const donePercent = computed(() =>
  totalTasks.value > 0 ? Math.round((doneCount.value / totalTasks.value) * 100) : 0
)
</script>
