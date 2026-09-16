<template>
  <div class="kanban-view flex-1 min-w-0 p-2 sm:p-4">
    <div class="kanban-toolbar">
      <div><strong>Visão Kanban</strong><p>Organize suas tarefas por grupo e acompanhe cada etapa.</p></div>
      <span class="kanban-total">{{ visibleGroups.reduce((sum, g) => sum + (tasksByGroup[g.id]?.length || 0), 0) }} tarefas</span>
    </div>
    <nav class="group-filters" aria-label="Filtrar Kanban por grupo">
      <button type="button" :aria-pressed="showAllGroups" @click="selectAllGroups">Todos os grupos</button>
      <button v-for="group in visibleGroups" :key="group.id" type="button" :aria-pressed="!showAllGroups && activeTabGroupId === group.id" @click="selectGroup(group.id)">
        <i :style="{ background: group.color || '#64748b' }" />{{ group.name }}<span>{{ tasksByGroup[group.id]?.length || 0 }}</span>
      </button>
    </nav>
    <div class="kanban-rail" tabindex="0" aria-label="Colunas de tarefas. Role horizontalmente para ver mais grupos.">
      <!-- Coluna para cada grupo -->
      <KanbanColumn
        v-for="group in visibleGroups"
        :key="group.id"
        v-show="showAllGroups || activeTabGroupId === group.id"
        class="kanban-lane"
        :ref="el => setColumnRef(group.id, el)"
        :group="group"
        :tasks="tasksByGroup[group.id] || []"
        :statuses="statuses"
        :priorities="priorities"
        :can-edit="canEdit"
        :board-id="boardId"
        :is-creating="creatingInGroup === group.id"
        :new-task-title="newTaskTitle"
        :dragging-task-id="draggingTaskId"
        :dragging-column-id="draggingColumnId"
        :is-drag-over-column="dragOverColumnId === group.id"
        @open-task="$emit('open-task', $event)"
        @task-updated="$emit('task-updated', $event)"
        @start-create="handleStartCreate(group.id)"
        @save="handleSaveTask(group.id)"
        @cancel="handleCancelCreate"
        @update:newTaskTitle="newTaskTitle = $event"
        @drag-start="handleDragStart"
        @drag-end="handleDragEnd"
        @drop="handleDrop(group.id)"
        @touch-drag-start="handleTouchDragStart"
        @touch-drag-move="handleTouchDragMove"
        @touch-drag-end="handleTouchDragEnd"
        @column-drag-start="handleColumnDragStart(group.id)"
        @column-drag-end="handleColumnDragEnd"
        @column-drag-over="handleColumnDragOver(group.id)"
        @column-drop="handleColumnDrop(group.id)"
        @share-group="$emit('share-group', $event)"
      />

      <!-- Botão adicionar coluna -->
      <div v-if="canEdit && showAllGroups" class="kanban-add-lane">
        <button
          @click="$emit('add-group')"
          class="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 hover:border-primary-400 hover:bg-primary-50 text-muted hover:text-primary-600 transition-all"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-label-sm font-medium">Adicionar grupo</span>
        </button>
      </div>
    </div>
    
    <!-- Indicador visual de drop zone durante touch drag -->
    <div
      v-if="touchDragTargetGroupId"
      class="fixed inset-0 pointer-events-none z-50"
    >
      <div
        v-for="group in visibleGroups"
        :key="`drop-${group.id}`"
        :ref="el => setDropZoneRef(group.id, el)"
        class="absolute transition-all"
        :class="{ 'bg-primary-100 border-4 border-primary-400 rounded-xl': touchDragTargetGroupId === group.id }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import type { TaskRow } from '~/composables/useTasks'

const props = defineProps<{
  visibleGroups: Array<{
    id: string
    name: string
    color: string | null
  }>
  tasksByGroup: Record<string, TaskRow[]>
  statuses: Array<{ id: string; name: string; color: string }>
  priorities: Array<{ id: string; name: string; color: string }>
  canEdit: boolean
  boardId?: string
}>()

const emit = defineEmits<{
  (e: 'task-updated', taskId: string): void
  (e: 'open-task', task: { id: string; board_id: string; title: string; description?: string | null; status_id?: string | null; priority_id?: string | null; start_date?: string | null; due_date?: string | null; budget?: number | null }): void
  (e: 'add-group'): void
  (e: 'create-task', data: { groupId: string; title: string }): void
  (e: 'move-task', data: { taskId: string; sourceGroupId: string; targetGroupId: string }): void
  (e: 'reorder-groups', data: { fromGroupId: string; toGroupId: string }): void
  (e: 'share-group', groupId: string): void
}>()

const creatingInGroup = ref<string | null>(null)
const newTaskTitle = ref('')
const draggingTaskId = ref<string | null>(null)
const sourceGroupId = ref<string | null>(null)

// Column drag state
const draggingColumnId = ref<string | null>(null)
const dragOverColumnId = ref<string | null>(null)

// Touch drag state
const touchDraggingTaskId = ref<string | null>(null)
const touchDragTargetGroupId = ref<string | null>(null)
const columnRefs = ref<Map<string, any>>(new Map())
const dropZoneRefs = ref<Map<string, any>>(new Map())

// Mobile tab state
const activeTabGroupId = ref<string | null>(null)
const showAllGroups = ref(true) // Por padrão mostra todos os grupos
function selectAllGroups() {
  showAllGroups.value = true
}

function selectGroup(groupId: string) {
  showAllGroups.value = false
  activeTabGroupId.value = groupId
}

function setColumnRef(groupId: string, el: any) {
  if (el) {
    columnRefs.value.set(groupId, el)
  }
}

function setDropZoneRef(groupId: string, el: any) {
  if (el) {
    dropZoneRefs.value.set(groupId, el)
  }
}

function handleStartCreate(groupId: string) {
  newTaskTitle.value = ''
  creatingInGroup.value = groupId
}

function handleCancelCreate() {
  creatingInGroup.value = null
  newTaskTitle.value = ''
}

function handleSaveTask(groupId: string) {
  const title = newTaskTitle.value.trim()
  if (!title) {
    handleCancelCreate()
    return
  }
  
  emit('create-task', { groupId, title })
  handleCancelCreate()
}

function handleDragStart(taskId: string) {
  draggingTaskId.value = taskId
  
  // Encontrar o grupo de origem
  for (const groupId in props.tasksByGroup) {
    const tasks = props.tasksByGroup[groupId]
    if (tasks?.some(t => t.id === taskId)) {
      sourceGroupId.value = groupId
      break
    }
  }
}

function handleDragEnd() {
  draggingTaskId.value = null
  sourceGroupId.value = null
}

function handleDrop(targetGroupId: string) {
  if (!draggingTaskId.value || !sourceGroupId.value) return
  
  // Se for o mesmo grupo, não fazer nada
  if (sourceGroupId.value === targetGroupId) {
    handleDragEnd()
    return
  }
  
  emit('move-task', {
    taskId: draggingTaskId.value,
    sourceGroupId: sourceGroupId.value,
    targetGroupId
  })
  
  handleDragEnd()
}

// Touch drag handlers
function handleTouchDragStart(data: { taskId: string; x: number; y: number }) {
  touchDraggingTaskId.value = data.taskId
  draggingTaskId.value = data.taskId
  
  // Encontrar o grupo de origem
  for (const groupId in props.tasksByGroup) {
    const tasks = props.tasksByGroup[groupId]
    if (tasks?.some(t => t.id === data.taskId)) {
      sourceGroupId.value = groupId
      break
    }
  }
  
  // Atualizar target inicial
  updateTouchDragTarget(data.x, data.y)
}

function handleTouchDragMove(data: { x: number; y: number }) {
  if (!touchDraggingTaskId.value) return
  updateTouchDragTarget(data.x, data.y)
}

function handleTouchDragEnd() {
  if (!touchDraggingTaskId.value || !sourceGroupId.value || !touchDragTargetGroupId.value) {
    resetTouchDrag()
    return
  }
  
  // Se for o mesmo grupo, não fazer nada
  if (sourceGroupId.value !== touchDragTargetGroupId.value) {
    emit('move-task', {
      taskId: touchDraggingTaskId.value,
      sourceGroupId: sourceGroupId.value,
      targetGroupId: touchDragTargetGroupId.value
    })
  }
  
  resetTouchDrag()
}

function updateTouchDragTarget(x: number, y: number) {
  let foundTarget: string | null = null
  
  // Verificar qual coluna está sob o dedo
  for (const [groupId, colRef] of columnRefs.value.entries()) {
    if (!colRef?.$el) continue
    
    const rect = colRef.$el.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      foundTarget = groupId
      break
    }
  }
  
  touchDragTargetGroupId.value = foundTarget
}

function resetTouchDrag() {
  touchDraggingTaskId.value = null
  touchDragTargetGroupId.value = null
  draggingTaskId.value = null
  sourceGroupId.value = null
}

// Column drag and drop handlers
function handleColumnDragStart(groupId: string) {
  draggingColumnId.value = groupId
}

function handleColumnDragEnd() {
  draggingColumnId.value = null
  dragOverColumnId.value = null
}

function handleColumnDragOver(groupId: string) {
  if (!draggingColumnId.value || draggingColumnId.value === groupId) return
  dragOverColumnId.value = groupId
}

function handleColumnDrop(targetGroupId: string) {
  if (!draggingColumnId.value || draggingColumnId.value === targetGroupId) {
    handleColumnDragEnd()
    return
  }
  
  emit('reorder-groups', {
    fromGroupId: draggingColumnId.value,
    toGroupId: targetGroupId
  })
  
  handleColumnDragEnd()
}
watch(() => props.visibleGroups.map(g => g.id), ids => {
  if (!ids.includes(activeTabGroupId.value || '')) { activeTabGroupId.value = ids[0] || null; showAllGroups.value = true }
})
</script>

<style scoped>
.kanban-view { overflow: hidden; }
.kanban-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:0 4px 16px; }
.kanban-toolbar strong { color:#1e293b; font-size:15px; }
.kanban-toolbar p { color:#64748b; font-size:12px; margin-top:4px; }
.kanban-total { background:#e2e8f0; border-radius:8px; padding:6px 10px; font-size:12px; white-space:nowrap; color:#475569; }
.group-filters { display:flex; gap:8px; overflow-x:auto; padding:2px 2px 14px; }
.group-filters button { display:flex; align-items:center; gap:8px; flex-shrink:0; border:1px solid #e2e8f0; background:white; border-radius:8px; padding:8px 12px; font-size:12px; color:#64748b; }
.group-filters button[aria-pressed=true] { background:#1e355d; border-color:#1e355d; color:white; }
.group-filters i { width:7px; height:7px; border-radius:50%; }
.group-filters span { font-size:11px; opacity:.75; }
.kanban-rail { display:flex; align-items:stretch; gap:18px; overflow:auto; padding:2px 2px 18px; height:max(420px, calc(100dvh - 300px)); }
.kanban-lane { flex:0 0 340px; width:340px; min-width:0; max-height:100%; }
.kanban-add-lane { flex:0 0 260px; align-self:flex-start; }
button:focus-visible, .kanban-rail:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
@media(max-width:640px) { .kanban-lane { flex-basis: min(340px, calc(100vw - 52px)); width:min(340px, calc(100vw - 52px)); } }
</style>
