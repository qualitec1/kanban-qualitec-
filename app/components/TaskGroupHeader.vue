<template>
  <!-- Layout mobile: coluna fixa + área rolável (estilo Monday.com) -->
  <div class="flex lg:hidden items-center bg-neutral-50 border-b border-neutral-200 overflow-hidden">
    <!-- Área fixa à esquerda (título) -->
    <div class="flex-shrink-0 flex items-center gap-0.5 bg-neutral-50 z-20 border-r border-neutral-200 sticky left-0 shadow-sm">
      <!-- Espaço para seta de expansão -->
      <div class="flex-shrink-0 w-9" />
      
      <!-- Coluna de título (fixa) -->
      <div class="py-2.5 flex-1" style="min-width: 140px; max-width: 180px;">
        <div class="text-xs font-semibold text-neutral-600 uppercase tracking-wide px-3">
          Tarefa
        </div>
      </div>
    </div>

    <!-- Área rolável horizontalmente - sincronizada com as linhas -->
    <div 
      ref="headerScrollRef"
      class="flex-1 overflow-x-auto scrollbar-thin touch-pan-x"
      @scroll="onHeaderScroll"
    >
      <div class="flex items-center py-2.5">
        <!-- Colunas dinâmicas baseadas na visibilidade (exceto título) -->
        <template v-for="col in orderedColumns" :key="col.key">
          <div
            v-if="isVisible(col.key)"
            class="relative flex-shrink-0 group/col px-2 border-r border-neutral-100"
            style="width: 140px; min-width: 140px;"
          >
            <div class="flex items-center gap-1 px-2">
              <div class="text-xs font-semibold text-neutral-600 uppercase tracking-wide truncate flex-1">
                {{ col.label }}
              </div>
              <ColumnFilter
                v-if="getFilterOptions(col.key).length > 0"
                :column-key="col.key as any"
                :column-label="col.label"
                :options="getFilterOptions(col.key)"
              />
            </div>
            <!-- Handle de redimensionamento (apenas desktop) -->
            <div
              class="hidden lg:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover/col:opacity-100 hover:!opacity-100 transition-opacity z-10"
              :class="{ '!opacity-100 bg-primary-500': resizingColumn === col.key }"
              @mousedown="startResize($event, col.key)"
              @touchstart="startResize($event, col.key)"
            >
              <div class="absolute -left-2 -right-2 top-0 bottom-0" />
              <div class="absolute right-0 top-0 bottom-0 w-0.5 bg-primary-400 hover:bg-primary-500" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- Layout desktop: tudo em uma linha -->
  <div class="hidden lg:flex items-center gap-2 px-4 min-h-[52px] min-w-max bg-neutral-50 border-b border-neutral-100">
    
    <!-- Espaço para botão expand/collapse (p-0.5 + w-4 + h-4 = ~20px) -->
    <div class="flex-shrink-0 p-0.5">
      <div class="w-4 h-4" />
    </div>
    
    <!-- Espaço para drag handle (p-0.5 + w-4 + h-4 = ~20px) -->
    <div class="flex-shrink-0 p-0.5">
      <div class="w-4 h-4" />
    </div>
    
    <!-- Coluna de título (sempre visível) -->
    <div 
      class="relative flex-shrink-0 group/col"
      :style="getColumnStyle('title')"
    >
      <div class="text-xs font-semibold text-neutral-600 uppercase tracking-wide px-2">
        Tarefa
      </div>
      <!-- Handle de redimensionamento -->
      <div
        class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover/col:opacity-100 hover:!opacity-100 transition-opacity z-10"
        :class="{ '!opacity-100 bg-primary-500': resizingColumn === 'title' }"
        @mousedown="startResize($event, 'title')"
        @touchstart="startResize($event, 'title')"
      >
        <div class="absolute -left-2 -right-2 top-0 bottom-0" />
        <div class="absolute right-0 top-0 bottom-0 w-0.5 bg-primary-400 hover:bg-primary-500" />
      </div>
    </div>

    <!-- Colunas dinâmicas baseadas na visibilidade -->
    <template v-for="col in orderedColumns" :key="col.key">
      <div
        v-if="isVisible(col.key)"
        class="relative flex-shrink-0 group/col"
        :style="getColumnStyle(col.key)"
      >
        <div class="flex items-center gap-1 px-2">
          <div class="text-xs font-semibold text-neutral-600 uppercase tracking-wide truncate flex-1">
            {{ col.label }}
          </div>
          <ColumnFilter
            v-if="getFilterOptions(col.key).length > 0"
            :column-key="col.key as any"
            :column-label="col.label"
            :options="getFilterOptions(col.key)"
          />
        </div>
        <!-- Handle de redimensionamento -->
        <div
          class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover/col:opacity-100 hover:!opacity-100 transition-opacity z-10"
          :class="{ '!opacity-100 bg-primary-500': resizingColumn === col.key }"
          @mousedown="startResize($event, col.key)"
          @touchstart="startResize($event, col.key)"
        >
          <div class="absolute -left-2 -right-2 top-0 bottom-0" />
          <div class="absolute right-0 top-0 bottom-0 w-0.5 bg-primary-400 hover:bg-primary-500" />
        </div>
      </div>
    </template>
    
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useBoardColumns } from '~/composables/useBoardColumns'
import { useColumnResize } from '~/composables/useColumnResize'
import { useTaskStatuses } from '~/composables/useTaskStatuses'
import { useTaskPriorities } from '~/composables/useTaskPriorities'
import { useBoardMembers } from '~/composables/useBoardMembers'

const props = defineProps<{
  boardId: string
}>()

const { orderedColumns, isVisible } = useBoardColumns(props.boardId)
const { getWidth, setWidth, getColumnStyle: getColStyle, getScrollPosition, setScrollPosition } = useColumnResize(props.boardId)

// Carregar dados para filtros
const { statuses, fetchStatuses } = useTaskStatuses(props.boardId)
const { priorities, fetchPriorities } = useTaskPriorities(props.boardId)
const { members, fetchMembers } = useBoardMembers()

// Carregar dados ao montar
onMounted(async () => {
  await Promise.all([
    fetchStatuses(),
    fetchPriorities(),
    fetchMembers(props.boardId)
  ])
  
  // Restaurar posição de scroll
  if (headerScrollRef.value) {
    headerScrollRef.value.scrollLeft = getScrollPosition()
  }
})

// Função para obter opções de filtro baseado na coluna
function getFilterOptions(columnKey: string) {
  switch (columnKey) {
    case 'status':
      return [
        { value: 'no-status', label: 'Sem status' },
        ...statuses.value.map(s => ({ value: s.id, label: s.name }))
      ]
    case 'priority':
      return [
        { value: 'no-priority', label: 'Sem prioridade' },
        ...priorities.value.map(p => ({ value: p.id, label: p.name }))
      ]
    case 'assignee':
      return [
        { value: 'no-assignee', label: 'Sem responsável' },
        ...members.value.map(m => ({ 
          value: m.profile.id, 
          label: m.profile.full_name || m.profile.email 
        }))
      ]
    case 'timeline':
    case 'dueDate':
      return [
        { value: 'no-date', label: 'Sem data' },
        { value: 'overdue', label: 'Atrasado' },
        { value: 'today', label: 'Hoje' },
        { value: 'next-7-days', label: 'Próximos 7 dias' },
        { value: 'next-30-days', label: 'Próximos 30 dias' }
      ]
    default:
      return []
  }
}

const headerScrollRef = ref<HTMLElement | null>(null)
const isScrolling = ref(false)

// Função helper para obter o estilo
function getColumnStyle(key: string) {
  return getColStyle(key).value
}

const resizingColumn = ref<string | null>(null)
const startX = ref(0)
const startWidth = ref(0)

function startResize(e: MouseEvent | TouchEvent, columnKey: string) {
  e.preventDefault()
  e.stopPropagation()
  
  resizingColumn.value = columnKey
  startWidth.value = getWidth(columnKey)
  
  if (e instanceof MouseEvent) {
    startX.value = e.clientX
  } else if (e instanceof TouchEvent && e.touches[0]) {
    startX.value = e.touches[0].clientX
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', onResize)
  document.addEventListener('touchend', stopResize)
  
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

function onResize(e: MouseEvent | TouchEvent) {
  if (!resizingColumn.value) return
  
  let currentX = 0
  if (e instanceof MouseEvent) {
    currentX = e.clientX
  } else if (e instanceof TouchEvent && e.touches[0]) {
    currentX = e.touches[0].clientX
  }
  
  const diff = currentX - startX.value
  const newWidth = startWidth.value + diff
  
  setWidth(resizingColumn.value, newWidth)
}

function stopResize() {
  resizingColumn.value = null
  
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', onResize)
  document.removeEventListener('touchend', stopResize)
  
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

function onHeaderScroll() {
  if (headerScrollRef.value && !isScrolling.value) {
    isScrolling.value = true
    setScrollPosition(headerScrollRef.value.scrollLeft)
    nextTick(() => {
      isScrolling.value = false
    })
  }
}

// Sincronizar scroll quando a posição mudar (de outro componente)
if (import.meta.client) {
  watch(() => getScrollPosition(), (newScrollLeft) => {
    if (headerScrollRef.value && !isScrolling.value && Math.abs(headerScrollRef.value.scrollLeft - newScrollLeft) > 1) {
      headerScrollRef.value.scrollLeft = newScrollLeft
    }
  })
}
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

/* Touch action para permitir scroll horizontal suave */
.touch-pan-x {
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
}
</style>
