<template>
  <div class="select-none">
    <!-- Card principal -->
    <div
      ref="cardRef"
      :draggable="!!canEdit"
      class="kanban-task bg-white rounded-xl p-4 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow group/card"
      :class="{ 
        'opacity-50 scale-95': isDragging, 
        'cursor-pointer': !isDragging,
        'cursor-move': isDragging,
        'ring-2 ring-primary-400': isLongPressing,
        'rounded-b-none': showSubtasks && subtasks.length > 0
      }"
      :style="dragStyle"
      @click="handleClick"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchCancel"
    >
      <div class="flex items-center justify-between gap-2 mb-2">
        <h3 class="kanban-task-title text-sm font-semibold text-neutral-900 flex-1"><button type="button" class="text-left w-full" @click.stop="handleClick">{{ task.title }}</button></h3>
        <TaskReminderButton :task-id="task.id" :task-title="task.title" />
      </div>
      
      <TaskPhotoGallery v-if="task.task_attachments?.length" :attachments="task.task_attachments" />
      <div class="kanban-badges">
        <span v-if="statusData" class="kanban-badge" :style="{ '--badge-color': statusData.color }">{{ statusData.name }}</span>
        <span v-if="priorityData" class="kanban-badge" :style="{ '--badge-color': priorityData.color }">{{ priorityData.name }}</span>
      </div>
      <p v-if="task.description" class="kanban-description">{{ task.description }}</p>
      <div class="kanban-card-footer flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-label-xs text-muted flex-wrap">
          <span class="kanban-date">{{ task.due_date ? 'Até ' + formatDate(task.due_date) : 'Sem prazo' }}</span>
          <!-- Subtasks indicator -->
          <button
            v-if="subtasks.length > 0"
            @click.stop="toggleSubtasks"
            class="flex items-center gap-1 hover:text-primary-600 transition-colors"
            :title="showSubtasks ? 'Ocultar subtarefas' : 'Mostrar subtarefas'"
          >
            <svg 
              class="w-3 h-3 transition-transform"
              :class="{ 'rotate-180': showSubtasks }"
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            <span>{{ completedSubtasksCount }}/{{ subtasks.length }}</span>
          </button>
        </div>

        <!-- Assignees section -->
        <div class="flex items-center gap-1 shrink-0" ref="assigneeRef">
          <!-- Avatars -->
          <AvatarStack v-if="assignees.length > 0" :assignees="assignees" :max-visible="2" />
          
          <!-- Add assignee button (always visible on mobile, hover on desktop) -->
          <button
            v-if="canEdit"
            @click.stop="toggleAssigneeDropdown"
            class="w-6 h-6 rounded-full bg-neutral-100 hover:bg-primary-100 flex items-center justify-center transition-colors opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100"
            :class="{ 'opacity-100': assigneeDropdownOpen }"
            title="Adicionar responsável"
          >
            <svg class="w-3 h-3 text-neutral-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Assignee Dropdown -->
      <Teleport to="body">
        <div
          v-if="assigneeDropdownOpen"
          ref="dropdownRef"
          class="fixed z-[99999] w-[320px] bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden"
          :style="dropdownStyle"
        >
          <!-- Chips de responsáveis selecionados -->
          <div v-if="assignees.length > 0" class="px-3 py-2 border-b border-neutral-200 bg-neutral-50">
            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="assignee in assignees"
                :key="assignee.id"
                class="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs hover:border-neutral-300 transition-colors"
              >
                <Avatar
                  :profile="assignee"
                  size="xs"
                />
                <span class="text-xs text-neutral-700 max-w-[80px] truncate">
                  {{ assignee.full_name || assignee.email }}
                </span>
                <button
                  type="button"
                  @click.stop="removeAssignee(assignee.id)"
                  class="p-0.5 rounded hover:bg-neutral-100 transition-colors"
                >
                  <svg class="w-2.5 h-2.5 text-neutral-400 hover:text-neutral-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Campo de busca -->
          <div class="px-3 py-2 border-b border-neutral-200">
            <div class="relative">
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar membros..."
                class="w-full pl-9 pr-2 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="loadingMembers" class="px-3 py-4 text-xs text-neutral-400 text-center">
            Carregando...
          </div>

          <!-- Lista de membros -->
          <div v-else class="max-h-[240px] overflow-y-auto">
            <div v-if="filteredMembers.length > 0" class="py-1">
              <button
                v-for="member in filteredMembers"
                :key="member.user_id"
                type="button"
                class="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-2"
                @mousedown.prevent="toggleAssignee(member.user_id)"
              >
                <Avatar
                  :profile="{
                    id: member.user_id,
                    full_name: member.profile.full_name,
                    email: member.profile.email,
                    avatar_url: member.profile.avatar_url
                  }"
                  size="xs"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-neutral-800 truncate">
                    {{ member.profile.full_name || 'Sem nome' }}
                  </div>
                  <div class="text-[10px] text-neutral-500 truncate">
                    {{ member.profile.email }}
                  </div>
                </div>
                <svg
                  v-if="isAssigned(member.user_id)"
                  class="w-4 h-4 text-primary-600 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
            <div v-else class="px-3 py-4 text-xs text-neutral-400 text-center">
              Nenhum membro encontrado
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- Subtasks expandable section -->
    <div
      v-if="showSubtasks && subtasks.length > 0"
      class="bg-neutral-50 border border-t-0 border-neutral-200 rounded-b-lg"
    >
      <div
        v-for="subtask in subtasks"
        :key="subtask.id"
        class="border-b border-neutral-100 last:border-b-0"
      >
        <!-- Subtask row -->
        <div
          class="flex items-center gap-2.5 px-3 py-2.5 text-xs group/subtask hover:bg-neutral-100 transition-all"
        >
          <button
            :disabled="!canEdit"
            @click.stop="toggleSubtaskDone(subtask.id, !subtask.is_done)"
            class="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110"
            :class="subtask.is_done 
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 border-primary-600 shadow-sm' 
              : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-50'"
          >
            <svg
              v-if="subtask.is_done"
              class="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            @click.stop="toggleSubtaskPreview(subtask.id)"
            aria-label="Pré-visualizar subtarefa"
            class="flex-1 text-left truncate font-medium transition-colors"
            :class="subtask.is_done ? 'line-through text-neutral-400' : 'text-neutral-700 hover:text-neutral-900'"
          >
            {{ subtask.title }}
          </button>
          
          <!-- Info badges -->
          <div class="flex items-center gap-1 shrink-0">
            <!-- Has assignees indicator -->
            <div v-if="subtask.assignees && subtask.assignees.length > 0" class="flex items-center">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500" />
            </div>
            
            <!-- Has due date indicator -->
            <div v-if="subtask.due_date" class="flex items-center">
              <div class="w-1.5 h-1.5 rounded-full bg-amber-500" />
            </div>
          </div>
          
          <!-- Pré-visualização da subtarefa -->
          <button
            @click.stop="toggleSubtaskPreview(subtask.id)"
            class="p-1 hover:bg-neutral-200 rounded-md transition-all"
          >
            <svg 
              class="w-3.5 h-3.5 text-neutral-500 transition-transform shrink-0"
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  </div>

  <TaskQuickPreview v-if="showPreview" v-model="showPreview" :task-id="task.id" :board-id="boardId || task.board_id" :initial-task="task" :initial-subtask-id="previewSubtaskId" :can-edit="canEdit" @updated="handlePreviewUpdated" @deleted="handlePreviewUpdated" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { TaskRow } from '~/composables/useTasks'
import { useTaskAssignees } from '~/composables/useTaskAssignees'
import { useBoardMembers } from '~/composables/useBoardMembers'
import { useSubtasks } from '~/composables/useSubtasks'

const props = defineProps<{
  task: TaskRow
  statuses: Array<{ id: string; name: string; color: string }>
  priorities: Array<{ id: string; name: string; color: string }>
  isDragging?: boolean
  boardId?: string
  canEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'task-updated', taskId: string): void
  (e: 'drag-start'): void
  (e: 'drag-end'): void
  (e: 'touch-drag-start', data: { taskId: string; x: number; y: number }): void
  (e: 'touch-drag-move', data: { x: number; y: number }): void
  (e: 'touch-drag-end'): void
}>()

const cardRef = ref<HTMLElement | null>(null)
const isLongPressing = ref(false)
const isTouchDragging = ref(false)
const longPressTimer = ref<number | null>(null)
const touchStartPos = ref({ x: 0, y: 0 })
const currentTouchPos = ref({ x: 0, y: 0 })

// Assignee management
const assigneeRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const assigneeDropdownOpen = ref(false)
const dropdownStyle = ref<Record<string, string>>({})
const searchQuery = ref('')

// Subtasks management
const showPreview = ref(false)
const previewSubtaskId = ref<string | null>(null)
const showSubtasks = ref(false)
const { subtasks, fetchSubtasks, toggleSubtask } = useSubtasks(props.task.id)

const { assignees, loading: loadingAssignees, fetchAssignees, addAssignee: addAssigneeToTask, removeAssignee: removeAssigneeFromTask } = useTaskAssignees(props.task.id)
const { members, loading: loadingMembers, fetchMembers } = useBoardMembers()

// Carregar statuses e priorities para as subtarefas

const statusData = computed(() => 
  props.task.status_id ? props.statuses.find(s => s.id === props.task.status_id) : null
)

const priorityData = computed(() => 
  props.task.priority_id ? props.priorities.find(p => p.id === props.task.priority_id) : null
)

const filteredMembers = computed(() => {
  if (!searchQuery.value.trim()) return members.value
  
  const query = searchQuery.value.toLowerCase()
  return members.value.filter(member => {
    const name = member.profile.full_name?.toLowerCase() || ''
    const email = member.profile.email?.toLowerCase() || ''
    return name.includes(query) || email.includes(query)
  })
})

const completedSubtasksCount = computed(() => 
  subtasks.value.filter(s => s.is_done).length
)

const dragStyle = computed(() => {
  if (!isTouchDragging.value) return {}
  
  return {
    position: 'fixed' as const,
    left: `${currentTouchPos.value.x - 160}px`,
    top: `${currentTouchPos.value.y - 40}px`,
    width: '320px',
    zIndex: 9999,
    pointerEvents: 'none' as const,
    transform: 'rotate(3deg)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
  }
})

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  // Parse a data como local, não UTC
  const [year, month, day] = dateStr.split('T')[0].split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function handleClick() {
  if (!isTouchDragging.value && !isLongPressing.value) {
    previewSubtaskId.value = null
    showPreview.value = true
  }
}

// Subtask functions
function toggleSubtasks() {
  showSubtasks.value = !showSubtasks.value

}

function toggleSubtaskPreview(subtaskId: string) {
  previewSubtaskId.value = subtaskId
  showPreview.value = true
}
function handlePreviewUpdated() {
  fetchSubtasks(); fetchAssignees(); emit('task-updated', props.task.id)
}

async function toggleSubtaskDone(subtaskId: string, isDone: boolean) {
  if (!props.canEdit) return
  await toggleSubtask(subtaskId, isDone)
}

// Assignee functions
function calcDropdownPosition() {
  if (!assigneeRef.value) return
  const rect = assigneeRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceRight = window.innerWidth - rect.left

  const dropdownHeight = 400
  const dropdownWidth = 320

  const top = spaceBelow > dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4
  const left = spaceRight >= dropdownWidth ? rect.left : rect.right - dropdownWidth

  dropdownStyle.value = {
    top: `${Math.max(8, top)}px`,
    left: `${Math.max(8, left)}px`,
  }
}

function toggleAssigneeDropdown() {
  if (!props.canEdit) return
  
  calcDropdownPosition()
  assigneeDropdownOpen.value = !assigneeDropdownOpen.value
  
  if (assigneeDropdownOpen.value) {
    searchQuery.value = ''
  }
}

function isAssigned(userId: string): boolean {
  return assignees.value.some(a => a.id === userId)
}

async function toggleAssignee(userId: string) {
  if (!props.canEdit) return
  
  const assigned = isAssigned(userId)
  const previousAssignees = [...assignees.value]
  
  // Optimistic update
  if (assigned) {
    assignees.value = assignees.value.filter(a => a.id !== userId)
  } else {
    const member = members.value.find(m => m.user_id === userId)
    if (member) {
      assignees.value.push({
        id: member.user_id,
        full_name: member.profile.full_name,
        email: member.profile.email,
        avatar_url: member.profile.avatar_url
      })
    }
  }

  // Persist to database (com envio de email)
  try {
    if (assigned) {
      const success = await removeAssigneeFromTask(userId, props.task.id)
      if (!success) throw new Error('Failed to remove assignee')
    } else {
      const success = await addAssigneeToTask(userId, props.task.id)
      if (!success) throw new Error('Failed to add assignee')
    }
  } catch (err) {
    // Reverter em caso de erro
    assignees.value = previousAssignees
    console.error('Error toggling assignee:', err)
  }
}

async function removeAssignee(userId: string) {
  if (!props.canEdit) return
  
  const previousAssignees = [...assignees.value]
  assignees.value = assignees.value.filter(a => a.id !== userId)
  
  try {
    const success = await removeAssigneeFromTask(userId, props.task.id)
    if (!success) {
      assignees.value = previousAssignees
    }
  } catch (err) {
    assignees.value = previousAssignees
    console.error('Error removing assignee:', err)
  }
}

function onClickOutside(e: MouseEvent) {
  if (!assigneeDropdownOpen.value) return
  const target = e.target as Node
  
  if (assigneeRef.value && assigneeRef.value.contains(target)) return
  if (dropdownRef.value && dropdownRef.value.contains(target)) return
  
  assigneeDropdownOpen.value = false
}

function handleDragStart(e: DragEvent) {
  if (!props.canEdit) { e.preventDefault(); return }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', props.task.id)
  }
  emit('drag-start')
}

function handleDragEnd() {
  emit('drag-end')
}

// Touch events para mobile
function handleTouchStart(e: TouchEvent) {
  if (!props.canEdit || (e.target as HTMLElement).closest("button, input, a")) return
  const touch = e.touches[0]
  if (!touch) return
  
  touchStartPos.value = { x: touch.clientX, y: touch.clientY }
  currentTouchPos.value = { x: touch.clientX, y: touch.clientY }
  
  // Iniciar timer de long press (500ms)
  longPressTimer.value = window.setTimeout(() => {
    isLongPressing.value = true
    isTouchDragging.value = true
    
    // Vibração háptica se disponível
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    
    const t = e.touches[0]
    if (t) {
      emit('touch-drag-start', {
        taskId: props.task.id,
        x: t.clientX,
        y: t.clientY
      })
    }
  }, 500)
}

function handleTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  
  const deltaX = Math.abs(touch.clientX - touchStartPos.value.x)
  const deltaY = Math.abs(touch.clientY - touchStartPos.value.y)
  
  // Se moveu mais de 10px antes do long press, cancelar
  if (!isTouchDragging.value && (deltaX > 10 || deltaY > 10)) {
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }
    isLongPressing.value = false
    return
  }
  
  // Se está arrastando, atualizar posição
  if (isTouchDragging.value) {
    e.preventDefault()
    currentTouchPos.value = { x: touch.clientX, y: touch.clientY }
    emit('touch-drag-move', { x: touch.clientX, y: touch.clientY })
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  if (isTouchDragging.value) {
    e.preventDefault()
    emit('touch-drag-end')
  }
  
  isLongPressing.value = false
  isTouchDragging.value = false
}

function handleTouchCancel() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  isLongPressing.value = false
  isTouchDragging.value = false
  
  if (isTouchDragging.value) {
    emit('touch-drag-end')
  }
}

onMounted(() => {
  // Carregar assignees e membros se boardId foi fornecido
  if (props.boardId) {
    fetchAssignees()
    fetchMembers(props.boardId)
    fetchSubtasks()
  }
  
  document.addEventListener('mousedown', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
})
watch(() => props.task.subtasks, value => {
  if (value) subtasks.value = [...value] as any
})
</script>

<style scoped>
.kanban-task-title { min-width:0; line-height:1.5; overflow-wrap:anywhere; }
.kanban-task-title button:focus-visible { outline:2px solid #2563eb; outline-offset:3px; border-radius:3px; }
.kanban-badges { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0; }
.kanban-badge { max-width:100%; overflow:hidden; text-overflow:ellipsis; font-size:11px; font-weight:600; padding:4px 8px; border-radius:6px; color:color-mix(in srgb, var(--badge-color, #64748b) 70%, #0f172a); background:color-mix(in srgb, var(--badge-color, #64748b) 12%, white); }
.kanban-description { font-size:12px; color:#64748b; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:12px; overflow-wrap:anywhere; }
.kanban-card-footer { border-top:1px solid #f1f5f9; padding-top:12px; margin-top:12px; }
.kanban-date { font-size:11px; color:#64748b; }
</style>
