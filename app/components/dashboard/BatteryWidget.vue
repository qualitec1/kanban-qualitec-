<template>
  <div class="h-full flex flex-col justify-between">
    <!-- Resumo do Progresso -->
    <div class="flex items-end justify-between mb-4">
      <div>
        <p class="text-4xl font-extrabold text-neutral-800 leading-none">
          {{ donePercent }}<span class="text-xl font-bold text-neutral-500">%</span>
        </p>
        <p class="text-xs text-neutral-400 font-medium mt-1">progresso de conclusão</p>
      </div>
      <div class="text-right">
        <p class="text-lg font-bold text-neutral-700 leading-none">{{ doneCount }} / {{ totalTasks }}</p>
        <p class="text-xs text-neutral-400 mt-1">tarefas concluídas</p>
      </div>
    </div>

    <!-- Componente de Bateria no Estilo Monday.com -->
    <div class="flex items-center w-full my-4">
      <!-- Corpo da Bateria -->
      <div class="flex-1 flex h-10 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 p-0.5 relative shadow-sm">
        <template v-if="totalTasks > 0">
          <div
            v-for="(status, index) in statusesWithPercentages"
            :key="status.statusName"
            class="h-full transition-all duration-500 relative group border-r border-white/20 last:border-r-0"
            :class="[
              index === 0 && 'rounded-l-[10px]',
              index === statusesWithPercentages.length - 1 && 'rounded-r-[10px]'
            ]"
            :style="{
              width: `${status.percent}%`,
              backgroundColor: status.color || '#94a3b8'
            }"
          >
            <!-- Tooltip no Hover -->
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-900 text-white text-xs py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap z-20 transition-all">
              <span class="font-semibold">{{ status.statusName }}</span>: {{ status.count }} ({{ status.percent }}%)
              <div class="w-2 h-2 bg-neutral-900 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
            </div>
          </div>
        </template>
        <!-- Bateria Vazia -->
        <div v-else class="flex-1 flex items-center justify-center text-xs text-neutral-400 font-medium">
          Sem tarefas conectadas
        </div>
      </div>
      <!-- Tampa da Bateria -->
      <div class="w-1.5 h-6 bg-neutral-300 rounded-r-md shrink-0 border-y border-r border-neutral-200 -ml-px shadow-sm"></div>
    </div>

    <!-- Legenda em lista -->
    <div class="flex-1 overflow-auto max-h-[140px] pr-1 space-y-1.5 mt-2 min-h-0">
      <div
        v-for="status in statusesWithPercentages"
        :key="status.statusName"
        class="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div
            class="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm border border-black/5"
            :style="{ backgroundColor: status.color || '#94a3b8' }"
          />
          <span class="font-medium text-neutral-700 truncate">{{ status.statusName }}</span>
        </div>
        <div class="flex items-center gap-3 shrink-0 text-neutral-500 font-semibold">
          <span>{{ status.count }} {{ status.count === 1 ? 'tarefa' : 'tarefas' }}</span>
          <span class="w-10 text-right text-neutral-400 font-normal">{{ status.percent }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatusData } from '~/composables/useDashboard'

const props = defineProps<{
  statuses: StatusData[]
}>()

const totalTasks = computed(() => props.statuses.reduce((sum, s) => sum + s.count, 0))

const doneCount = computed(() =>
  props.statuses.filter(s => s.isDone).reduce((sum, s) => sum + s.count, 0)
)

const donePercent = computed(() =>
  totalTasks.value > 0 ? Math.round((doneCount.value / totalTasks.value) * 100) : 0
)

const statusesWithPercentages = computed(() => {
  if (totalTasks.value === 0) return []
  return props.statuses
    .map(status => ({
      ...status,
      percent: Math.round((status.count / totalTasks.value) * 100)
    }))
    .filter(status => status.count > 0)
    .sort((a, b) => b.count - a.count)
})
</script>
