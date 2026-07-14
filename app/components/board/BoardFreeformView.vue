<template>
  <div class="flex-1 overflow-auto bg-neutral-50 relative p-6 select-none" style="min-height: calc(100vh - 200px);">
    <!-- Container do Canvas com cartões de tarefas com posição absoluta -->
    <template v-if="allTasks && allTasks.length > 0">
      <div
        v-for="task in allTasks"
        :key="task.id"
        :style="{
          position: 'absolute',
          left: `${task.position?.x ?? 0}px`,
          top: `${task.position?.y ?? 0}px`,
          width: `${task.position?.width ?? 260}px`,
          height: `${task.position?.height ?? 160}px`,
          transition: isDragging === task.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: isDragging === task.id ? 1000 : task.position?.zIndex || 1
        }"
        :class="[
          'task-card-container bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer touch-action-none flex flex-col justify-between p-3.5',
          isDragging === task.id && 'dragging',
          isResizing === task.id && 'resizing'
        ]"
        @mousedown="startDrag($event, task)"
        @touchstart="startDrag($event, task)"
        @click="handleTaskClick(task)"
      >
        <!-- Topo: Badges de Status & Prioridade -->
        <div class="flex items-center justify-between gap-2 shrink-0">
          <span
            v-if="task.status"
            class="px-2 py-0.5 text-[9px] font-bold rounded-full border truncate"
            :style="{
              color: task.status.color || '#64748b',
              borderColor: `${task.status.color}30` || '#e2e8f0',
              backgroundColor: `${task.status.color}10` || '#f8fafc'
            }"
          >
            {{ task.status.name }}
          </span>
          <span v-else class="w-1" />

          <span
            v-if="task.priority"
            class="px-1.5 py-0.5 text-[8px] font-extrabold rounded-md uppercase tracking-wider shrink-0"
            :class="getPriorityClass(task.priority.level)"
          >
            {{ task.priority.name }}
          </span>
        </div>

        <!-- Título da Tarefa -->
        <div class="flex-1 flex items-center justify-center my-2 text-center overflow-hidden">
          <h4 class="text-xs font-semibold text-neutral-800 line-clamp-3 leading-snug">
            {{ task.title }}
          </h4>
        </div>

        <!-- Rodapé: Vencimento & stack de Avatares -->
        <div class="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2 shrink-0">
          <!-- Vencimento -->
          <span v-if="task.due_date" class="flex items-center gap-1 text-[9px] text-neutral-400 font-medium">
            <svg class="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ formatDate(task.due_date) }}
          </span>
          <span v-else class="w-1" />

          <!-- Stack de Membros -->
          <div class="flex -space-x-1.5 overflow-hidden animate-fade-in" v-if="task.assignees && task.assignees.length > 0">
            <div
              v-for="(assignee, idx) in task.assignees.slice(0, 3)"
              :key="idx"
              class="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white bg-neutral-100 flex items-center justify-center text-[9px] font-bold text-neutral-600 shadow-sm shrink-0"
              :title="assignee.full_name"
            >
              <img
                v-if="assignee.avatar_url"
                :src="assignee.avatar_url"
                class="h-full w-full rounded-full object-cover"
              />
              <span v-else>{{ assignee.full_name?.charAt(0).toUpperCase() || 'U' }}</span>
            </div>
            <div
              v-if="task.assignees.length > 3"
              class="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white bg-neutral-200 flex items-center justify-center text-[8px] font-extrabold text-neutral-600 shadow-sm shrink-0"
            >
              +{{ task.assignees.length - 3 }}
            </div>
          </div>
        </div>

        <!-- Alça de Redimensionamento -->
        <div
          class="resize-handle resize-se"
          @mousedown.stop="startResize($event, task, 'se')"
          @touchstart.stop="startResize($event, task, 'se')"
        ></div>
      </div>
    </template>

    <!-- Estado Vazio -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-base font-semibold text-neutral-800">Sem tarefas neste quadro</p>
      <p class="text-sm text-neutral-500 mt-1">Crie tarefas na visualização de Tabela ou Kanban primeiro.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  boardId: string
  tasksByGroup: Record<string, any[]>
  canEdit: boolean
}>()

const emit = defineEmits<{
  'open-task': [task: any]
}>()

const isDragging = ref<string | null>(null)
const isResizing = ref<string | null>(null)
const dragStart = ref({ x: 0, y: 0, widgetX: 0, widgetY: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })
let dragDistance = 0

// Achata as tarefas de todos os grupos
const allTasks = computed(() => {
  const list: any[] = []
  Object.values(props.tasksByGroup).forEach(groupTasks => {
    if (groupTasks) list.push(...groupTasks)
  })
  return list
})

// Monitora as tarefas para carregar/gerar posições
watch(allTasks, (newTasks) => {
  if (!newTasks || newTasks.length === 0) return
  
  // Carregar posições salvas
  let savedPositions: Record<string, any> = {}
  try {
    const saved = localStorage.getItem(`board-tasks-positions-${props.boardId}`)
    if (saved) savedPositions = JSON.parse(saved)
  } catch (e) {
    console.error('Error loading tasks layout:', e)
  }

  const cardWidth = 260
  const cardHeight = 160
  const gap = 20
  const cols = 4

  newTasks.forEach((task: any, idx: number) => {
    if (!task.position) {
      if (savedPositions[task.id]) {
        task.position = { ...savedPositions[task.id] }
      } else {
        const colIndex = idx % cols
        const rowIndex = Math.floor(idx / cols)
        task.position = {
          x: colIndex * (cardWidth + gap) + 10,
          y: rowIndex * (cardHeight + gap) + 10,
          width: cardWidth,
          height: cardHeight,
          zIndex: 1
        }
      }
    }
  })
}, { immediate: true })

function saveTasksPositions() {
  const positions: Record<string, any> = {}
  allTasks.value.forEach((task: any) => {
    if (task.position) {
      positions[task.id] = { ...task.position }
    }
  })
  localStorage.setItem(`board-tasks-positions-${props.boardId}`, JSON.stringify(positions))
}

function startDrag(event: MouseEvent | TouchEvent, task: any) {
  const target = event.target as HTMLElement
  if (target.closest('button') || target.closest('.resize-handle') || target.closest('a') || target.closest('input')) return

  isDragging.value = task.id
  if (task.position) task.position.zIndex = 100
  dragDistance = 0

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  dragStart.value = { x: clientX, y: clientY, widgetX: task.position?.x ?? 0, widgetY: task.position?.y ?? 0 }

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove)
  document.addEventListener('touchend', onDragEnd)
}

function onDragMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  const task = allTasks.value.find(t => t.id === isDragging.value) as any
  if (!task || !task.position) return

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  const dx = clientX - dragStart.value.x
  const dy = clientY - dragStart.value.y
  dragDistance += Math.sqrt(dx * dx + dy * dy)

  task.position.x = Math.max(0, dragStart.value.widgetX + dx)
  task.position.y = Math.max(0, dragStart.value.widgetY + dy)
}

function onDragEnd() {
  if (isDragging.value) {
    const task = allTasks.value.find(t => t.id === isDragging.value) as any
    if (task && task.position) task.position.zIndex = 1
  }
  isDragging.value = null
  saveTasksPositions()
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
}

function startResize(event: MouseEvent | TouchEvent, task: any, _direction = 'se') {
  event.preventDefault()
  event.stopPropagation()

  isResizing.value = task.id
  if (task.position) task.position.zIndex = 100

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  resizeStart.value = { x: clientX, y: clientY, width: task.position?.width ?? 260, height: task.position?.height ?? 160 }

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.addEventListener('touchmove', onResizeMove)
  document.addEventListener('touchend', onResizeEnd)
}

function onResizeMove(event: MouseEvent | TouchEvent) {
  if (!isResizing.value) return
  const task = allTasks.value.find(t => t.id === isResizing.value) as any
  if (!task || !task.position) return

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  task.position.width = Math.max(180, resizeStart.value.width + clientX - resizeStart.value.x)
  task.position.height = Math.max(120, resizeStart.value.height + clientY - resizeStart.value.y)
}

function onResizeEnd() {
  if (isResizing.value) {
    const task = allTasks.value.find(t => t.id === isResizing.value) as any
    if (task && task.position) task.position.zIndex = 1
  }
  isResizing.value = null
  saveTasksPositions()
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('touchmove', onResizeMove)
  document.removeEventListener('touchend', onResizeEnd)
}

function handleTaskClick(task: any) {
  if (dragDistance > 5) return
  emit('open-task', task)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch (e) {
    return dateStr
  }
}

function getPriorityClass(level: string | number): string {
  const lvl = String(level)
  if (lvl === 'high' || lvl === '3') return 'bg-red-50 text-red-600 border border-red-200'
  if (lvl === 'medium' || lvl === '2') return 'bg-amber-50 text-amber-600 border border-amber-200'
  return 'bg-neutral-50 text-neutral-500 border border-neutral-200'
}
</script>

<style scoped>
.task-card-container {
  touch-action: none;
}

.task-card-container.dragging {
  cursor: grabbing;
  opacity: 0.9;
  transform: rotate(1deg) scale(1.01);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.15);
}

.task-card-container.resizing {
  cursor: nwse-resize;
}

.resize-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #6366f1;
  border: 2px solid white;
  border-radius: 50%;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.task-card-container:hover .resize-handle {
  opacity: 1;
}

.resize-se {
  bottom: -6px;
  right: -6px;
}

@media (max-width: 640px) {
  .resize-handle {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }
  .resize-se {
    bottom: -10px;
    right: -10px;
  }
}
</style>
