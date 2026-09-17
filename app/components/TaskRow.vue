<template>
  <div class="task-row">
    <!-- Linha principal da tarefa -->
    <div class="task-row-surface border-b border-neutral-100 relative motion-interactive">
      
      <!-- Layout mobile: coluna fixa + área rolável -->
      <div class="flex lg:hidden">
        <!-- Área fixa à esquerda (seta + título) -->
        <div class="task-mobile-identity flex-shrink-0 flex items-center gap-1 bg-white z-20 border-r border-neutral-100 sticky left-0 pointer-events-auto">
          <!-- Botão expand/collapse subtarefas -->
          <button
            v-if="canEdit || hasSubtasks"
            type="button"
            class="flex-shrink-0 p-1.5 text-neutral-400 hover:text-neutral-700 active:bg-neutral-100 rounded transition-all touch-manipulation"
            :class="{ 'rotate-90': isExpanded, 'opacity-50': !hasSubtasks }"
            :title="hasSubtasks ? 'Expandir subtarefas' : 'Adicionar subtarefa'"
            @click.stop="toggleExpand"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div v-else class="flex-shrink-0 w-8" />
          
          <!-- Título editável inline (fixo) - largura maior para mobile -->
          <div class="pr-2 py-3 flex-1 min-w-0">
            <TitleCell
              :task-id="task.id"
              :board-id="task.board_id"
              :title="currentTitle"
              @update:title="currentTitle = $event"
              @open-modal="selectedSubtaskId = ''; showModal = true"
            />
          </div>

          <!-- Botão de lembrete (mobile) -->
          <div class="flex-shrink-0 pr-2">
            <TaskReminderButton :task-id="task.id" :task-title="currentTitle" />
          </div>
        </div>

        <!-- Área rolável horizontalmente -->
        <div 
          ref="rowScrollRef"
          class="flex-1 overflow-x-auto overflow-y-visible scrollbar-mobile snap-x snap-mandatory touch-pan-x pointer-events-auto"
          @scroll="onRowScroll"
        >
          <div class="flex items-center pr-4 py-2 min-h-[52px] pointer-events-auto">
            <!-- Todas as colunas na ordem configurada (exceto título) -->
            <template v-for="col in orderedColumns" :key="col.key">
              <template v-if="isVisible(col.key)">
                <div class="flex-shrink-0 snap-start pointer-events-auto px-2" style="width: 140px; min-width: 140px;">
                  <TimelineCell
                    v-if="col.key === 'timeline'"
                    :task-id="task.id"
                    :start-date="currentStartDate"
                    :end-date="currentEndDate"
                    @update:start-date="currentStartDate = $event"
                    @update:end-date="currentEndDate = $event"
                  />
                  <BudgetCell
                    v-else-if="col.key === 'budget'"
                    :task-id="task.id"
                    :budget="currentBudget"
                    @update:budget="currentBudget = $event"
                  />
                  <AttachmentsCell
                    v-else-if="col.key === 'attachments'"
                    :task-id="task.id"
                    :initial-count="task.attachment_count"
                    :photos="task.task_attachments"
                    @updated="emit('taskUpdated', task.id)"
                  />
                  <NotesCell
                    v-else-if="col.key === 'notes'"
                    :task-id="task.id"
                    :board-id="task.board_id"
                    :note="currentNote"
                    @update:note="currentNote = $event"
                  />
                  <DueDateCell
                    v-else-if="col.key === 'dueDate'"
                    :due-date="currentEndDate"
                  />
                  <LastUpdatedCell
                    v-else-if="col.key === 'lastUpdated'"
                    :task-id="task.id"
                    :board-id="task.board_id"
                  />
                  <PriorityCell
                    v-else-if="col.key === 'priority'"
                    :task-id="task.id"
                    :board-id="task.board_id"
                    :priority-id="task.priority_id"
                  />
                  <StatusCell
                    v-else-if="col.key === 'status'"
                    :task-id="task.id"
                    :board-id="task.board_id"
                    :status-id="task.status_id"
                  />
                  <GenericTextCell
                    v-else-if="col.key === 'email'"
                    :task-id="task.id"
                    column-key="email"
                    :value="currentEmail"
                    placeholder="Adicionar e-mail"
                    type="email"
                    @update="currentEmail = $event; emit('taskUpdated', task.id)"
                  />
                  <GenericTextCell
                    v-else-if="col.key === 'phone'"
                    :task-id="task.id"
                    column-key="phone"
                    :value="currentPhone"
                    placeholder="Adicionar telefone"
                    type="tel"
                    @update="currentPhone = $event; emit('taskUpdated', task.id)"
                  />
                  <GenericTextCell
                    v-else-if="col.key === 'account'"
                    :task-id="task.id"
                    column-key="account"
                    :value="currentAccount"
                    placeholder="Adicionar conta"
                    @update="currentAccount = $event; emit('taskUpdated', task.id)"
                  />
                  <GenericTextCell
                    v-else-if="col.key === 'deal'"
                    :task-id="task.id"
                    column-key="deal"
                    :value="currentDeal"
                    placeholder="Adicionar negociação"
                    @update="currentDeal = $event; emit('taskUpdated', task.id)"
                  />
                  <GenericNumberCell
                    v-else-if="col.key === 'dealValue'"
                    :task-id="task.id"
                    column-key="deal_value"
                    :value="currentDealValue"
                    placeholder="Adicionar valor"
                    @update="currentDealValue = $event; emit('taskUpdated', task.id)"
                  />
                  <GenericTextCell
                    v-else-if="col.key === 'taskType'"
                    :task-id="task.id"
                    column-key="task_type"
                    :value="currentTaskType"
                    placeholder="Adicionar tipo"
                    @update="currentTaskType = $event; emit('taskUpdated', task.id)"
                  />
                  <GenericTextCell
                    v-else-if="col.key === 'jobTitle'"
                    :task-id="task.id"
                    column-key="job_title"
                    :value="currentJobTitle"
                    placeholder="Adicionar cargo"
                    @update="currentJobTitle = $event; emit('taskUpdated', task.id)"
                  />
                  <GenericTextCell
                    v-else-if="col.key === 'comments'"
                    :task-id="task.id"
                    column-key="comments"
                    :value="currentComments"
                    placeholder="Adicionar comentário"
                    @update="currentComments = $event; emit('taskUpdated', task.id)"
                  />
                  <div v-else-if="col.key === 'assignee'" @click.stop>
                    <AssigneeCell
                      :task-id="task.id"
                      :board-id="task.board_id"
                      :initial-assignees="task.assignees"
                      show-name
                    />
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>

        <!-- Indicador de scroll (gradiente) -->
        <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
      </div>

      <!-- Layout desktop: tudo em uma linha -->
      <div class="task-desktop-row hidden lg:flex items-stretch min-w-max">
        <div class="task-identity" :style="{ width: (getWidth('title') + 112) + 'px' }">
        <!-- Botão expand/collapse subtarefas - sempre visível se pode editar -->
        <button
          v-if="canEdit || hasSubtasks"
          type="button"
          class="flex-shrink-0 p-0.5 text-neutral-400 hover:text-neutral-700 transition-transform pointer-events-auto"
          :class="{ 'rotate-90': isExpanded, 'opacity-50': !hasSubtasks }"
          :title="hasSubtasks ? 'Expandir subtarefas' : 'Adicionar subtarefa'"
          @click="toggleExpand"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div v-else class="flex-shrink-0 w-5" />

        <!-- Drag handle (desktop only) -->
        <div
          v-if="canEdit"
          :draggable="true"
          class="flex-shrink-0 opacity-0 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-muted"
          title="Arrastar para reordenar"
          @dragstart="handleDragStart"
          @dragend="handleDragEnd"
        >
          <svg class="w-4 h-4 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          </svg>
        </div>
        
        <div v-if="!canEdit" class="w-5 shrink-0" />
        <!-- Título editável inline -->
        <div class="flex-shrink-0 pointer-events-auto" :style="getColumnStyle('title')">
          <TitleCell
            :task-id="task.id"
            :board-id="task.board_id"
            :title="currentTitle"
            @update:title="currentTitle = $event"
            @open-modal="selectedSubtaskId = ''; showModal = true"
          />
        </div>

        <!-- Botão de lembrete (desktop) -->
        <div class="flex-shrink-0 pointer-events-auto">
          <TaskReminderButton :task-id="task.id" :task-title="currentTitle" />
        </div>

        </div>
        <!-- Todas as colunas na ordem configurada -->
        <template v-for="col in orderedColumns" :key="col.key">
          <template v-if="isVisible(col.key)">
            <div class="task-data-cell flex-shrink-0 pointer-events-auto" :data-column="col.key" :style="getColumnStyle(col.key)">
              <TimelineCell
                v-if="col.key === 'timeline'"
                :task-id="task.id"
                :start-date="currentStartDate"
                :end-date="currentEndDate"
                @update:start-date="currentStartDate = $event"
                @update:end-date="currentEndDate = $event"
              />
              <BudgetCell
                v-else-if="col.key === 'budget'"
                :task-id="task.id"
                :budget="currentBudget"
                @update:budget="currentBudget = $event"
              />
              <AttachmentsCell
                v-else-if="col.key === 'attachments'"
                :task-id="task.id"
                :initial-count="task.attachment_count"
                    :photos="task.task_attachments"
                    @updated="emit('taskUpdated', task.id)"
              />
              <NotesCell
                v-else-if="col.key === 'notes'"
                :task-id="task.id"
                :board-id="task.board_id"
                :note="currentNote"
                @update:note="currentNote = $event"
              />
              <DueDateCell
                v-else-if="col.key === 'dueDate'"
                :due-date="currentEndDate"
              />
              <LastUpdatedCell
                v-else-if="col.key === 'lastUpdated'"
                :task-id="task.id"
                :board-id="task.board_id"
              />
              <PriorityCell
                v-else-if="col.key === 'priority'"
                :task-id="task.id"
                :board-id="task.board_id"
                :priority-id="task.priority_id"
              />
              <StatusCell
                v-else-if="col.key === 'status'"
                :task-id="task.id"
                :board-id="task.board_id"
                :status-id="task.status_id"
              />
              <GenericTextCell
                v-else-if="col.key === 'email'"
                :task-id="task.id"
                column-key="email"
                :value="currentEmail"
                placeholder="Adicionar e-mail"
                type="email"
                @update="currentEmail = $event; emit('taskUpdated', task.id)"
              />
              <GenericTextCell
                v-else-if="col.key === 'phone'"
                :task-id="task.id"
                column-key="phone"
                :value="currentPhone"
                placeholder="Adicionar telefone"
                type="tel"
                @update="currentPhone = $event; emit('taskUpdated', task.id)"
              />
              <GenericTextCell
                v-else-if="col.key === 'account'"
                :task-id="task.id"
                column-key="account"
                :value="currentAccount"
                placeholder="Adicionar conta"
                @update="currentAccount = $event; emit('taskUpdated', task.id)"
              />
              <GenericTextCell
                v-else-if="col.key === 'deal'"
                :task-id="task.id"
                column-key="deal"
                :value="currentDeal"
                placeholder="Adicionar negociação"
                @update="currentDeal = $event; emit('taskUpdated', task.id)"
              />
              <GenericNumberCell
                v-else-if="col.key === 'dealValue'"
                :task-id="task.id"
                column-key="deal_value"
                :value="currentDealValue"
                placeholder="Adicionar valor"
                @update="currentDealValue = $event; emit('taskUpdated', task.id)"
              />
              <GenericTextCell
                v-else-if="col.key === 'taskType'"
                :task-id="task.id"
                column-key="task_type"
                :value="currentTaskType"
                placeholder="Adicionar tipo"
                @update="currentTaskType = $event; emit('taskUpdated', task.id)"
              />
              <GenericTextCell
                v-else-if="col.key === 'jobTitle'"
                :task-id="task.id"
                column-key="job_title"
                :value="currentJobTitle"
                placeholder="Adicionar cargo"
                @update="currentJobTitle = $event; emit('taskUpdated', task.id)"
              />
              <GenericTextCell
                v-else-if="col.key === 'comments'"
                :task-id="task.id"
                column-key="comments"
                :value="currentComments"
                placeholder="Adicionar comentário"
                @update="currentComments = $event; emit('taskUpdated', task.id)"
              />
              <div v-else-if="col.key === 'assignee'" @click.stop>
                <AssigneeCell
                  :task-id="task.id"
                  :board-id="task.board_id"
                  :initial-assignees="task.assignees"
                      show-name
                />
              </div>
            </div>
          </template>
        </template>
      </div>

      <!-- Pré-visualização compartilhada entre os modos -->
      <TaskQuickPreview
        v-if="showModal"
        v-model="showModal"
        :can-edit="canEdit"
        :initial-subtask-id="selectedSubtaskId"
        :task-id="task.id"
        :board-id="task.board_id"
        :initial-task="task"
        @updated="onTaskUpdated"
        @deleted="onTaskDeleted"
      />
    </div>

    <!-- Tabela de subtarefas (aninhada) -->
    <SubtasksTable
      :task-id="task.id"
      :board-id="task.board_id"
      :is-expanded="isExpanded"
      :can-edit="canEdit"
      :initial-subtasks="task.subtasks"
      @open-details="handleOpenSubtaskDetails"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { Tables } from '#shared/types/database'
import { useBoardColumns } from '~/composables/useBoardColumns'
import { useColumnResize } from '~/composables/useColumnResize'
import { useSubtasks } from '~/composables/useSubtasks'

const props = defineProps<{
  task: Pick<Tables<'tasks'>, 'id' | 'title' | 'group_id' | 'board_id' | 'status_id' | 'priority_id' | 'due_date' | 'start_date' | 'description' | 'notes' | 'budget' | 'updated_at' | 'position'>
  canEdit?: boolean
}>()

const emit = defineEmits<{ 
  (e: 'taskUpdated', id: string): void
  (e: 'taskDeleted', id: string): void
  (e: 'dragStart', taskId: string): void
  (e: 'dragEnd'): void
}>()

const showModal = ref(false)
const isExpanded = ref(false)
const selectedSubtaskId = ref('')
const rowScrollRef = ref<HTMLElement | null>(null)

const { subtasks, fetchSubtasks } = useSubtasks(props.task.id)

// Verificar se tem subtarefas apenas após carregar
const hasSubtasks = computed(() => subtasks.value.length > 0 || !!(props.task as any).subtasks?.length)

async function toggleExpand() {
  isExpanded.value = !isExpanded.value
  // Carregar subtarefas apenas ao expandir pela primeira vez
  if (isExpanded.value && subtasks.value.length === 0) {
    await fetchSubtasks()
  }
}

function handleOpenSubtaskDetails(subtaskId: string) {
  selectedSubtaskId.value = subtaskId
  showModal.value = true
}

function onTaskUpdated() {
  fetchSubtasks()
  // Emitir evento para que o componente pai atualize os dados
  emit('taskUpdated', props.task.id)
}

function onTaskDeleted(taskId: string) {
  emit('taskDeleted', taskId)
}

function handleDragStart(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.task.id)
  }
  emit('dragStart', props.task.id)
}

function handleDragEnd() {
  emit('dragEnd')
}

const { orderedColumns, isVisible } = useBoardColumns(props.task.board_id)
const { getWidth, getColumnStyle: getColStyle, getScrollPosition, setScrollPosition } = useColumnResize(props.task.board_id)

// Função helper para obter o estilo
function getColumnStyle(key: string) {
  return getColStyle(key).value
}

// Usar refs para valores editáveis localmente
const currentTitle      = ref(props.task.title)
const currentNote       = ref(props.task.notes ?? null)
const currentBudget     = ref(props.task.budget ?? null)
const currentStartDate  = ref(props.task.start_date ?? null)
const currentEndDate    = ref(props.task.due_date ?? null)
const currentEmail      = ref((props.task as any).email ?? null)
const currentPhone      = ref((props.task as any).phone ?? null)
const currentAccount    = ref((props.task as any).account ?? null)
const currentDeal       = ref((props.task as any).deal ?? null)
const currentDealValue  = ref((props.task as any).deal_value ?? null)
const currentTaskType   = ref((props.task as any).task_type ?? null)
const currentJobTitle   = ref((props.task as any).job_title ?? null)
const currentComments   = ref((props.task as any).comments ?? null)

// Sincronizar com props quando mudarem (Realtime)
watch(() => props.task.title, (newVal) => { currentTitle.value = newVal })
watch(() => props.task.notes, (newVal) => { currentNote.value = newVal ?? null })
watch(() => props.task.budget, (newVal) => { currentBudget.value = newVal ?? null })
watch(() => props.task.start_date, (newVal) => { currentStartDate.value = newVal ?? null })
watch(() => props.task.due_date, (newVal) => { currentEndDate.value = newVal ?? null })
watch(() => (props.task as any).email, (newVal) => { currentEmail.value = newVal ?? null })
watch(() => (props.task as any).phone, (newVal) => { currentPhone.value = newVal ?? null })
watch(() => (props.task as any).account, (newVal) => { currentAccount.value = newVal ?? null })
watch(() => (props.task as any).deal, (newVal) => { currentDeal.value = newVal ?? null })
watch(() => (props.task as any).deal_value, (newVal) => { currentDealValue.value = newVal ?? null })
watch(() => (props.task as any).task_type, (newVal) => { currentTaskType.value = newVal ?? null })
watch(() => (props.task as any).job_title, (newVal) => { currentJobTitle.value = newVal ?? null })
watch(() => (props.task as any).comments, (newVal) => { currentComments.value = newVal ?? null })

// Não carregar subtarefas automaticamente no mount para evitar múltiplas requisições simultâneas
// Elas serão carregadas apenas quando o usuário expandir
onMounted(() => {
  // Restaurar posição de scroll
  if (rowScrollRef.value) {
    rowScrollRef.value.scrollLeft = getScrollPosition()
  }
})

// Sincronizar scroll com cabeçalho e outras linhas (apenas em mobile)
const isScrolling = ref(false)

function onRowScroll() {
  if (rowScrollRef.value && !isScrolling.value && import.meta.client && window.innerWidth < 1024) {
    isScrolling.value = true
    setScrollPosition(rowScrollRef.value.scrollLeft)
    nextTick(() => {
      isScrolling.value = false
    })
  }
}

// Sincronizar quando a posição de scroll mudar (de outro componente)
if (import.meta.client) {
  watch(() => getScrollPosition(), (newScrollLeft) => {
    if (rowScrollRef.value && !isScrolling.value && window.innerWidth < 1024) {
      if (Math.abs(rowScrollRef.value.scrollLeft - newScrollLeft) > 1) {
        rowScrollRef.value.scrollLeft = newScrollLeft
      }
    }
  })
}
</script>

<style scoped>
.task-row-surface { background: white; }
.task-row-surface:hover, .task-row-surface:focus-within { background: #f4f7fc; }
.task-mobile-identity { width: 236px; }
.task-identity { position: sticky; left: 0; z-index: 12; flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 0 12px; background: white; border-right: 1px solid #e2e8f0; box-shadow: 5px 0 9px -8px #64748b; }
.task-row-surface:hover .task-identity, .task-row-surface:focus-within .task-identity { background: #f4f7fc; }
.task-desktop-row { min-height: 62px; }
.task-data-cell { display: flex; align-items: center; padding: 6px 12px; border-right: 1px solid #f1f4f8; }
.task-data-cell > :deep(*) { width: 100%; min-width: 0; }
.task-data-cell[data-column="budget"], .task-data-cell[data-column="dealValue"] { font-variant-numeric: tabular-nums; }
.task-row :deep(.task-value-badge > button), .task-row :deep(.task-value-badge > div:not(.fixed)) {
  min-width: 0 !important; max-width: none; min-height: 32px !important; padding: 6px 10px; gap: 7px; border-radius: 8px; font-size: 12px; font-weight: 650;
  background: color-mix(in srgb, var(--badge-color) 12%, white) !important;
  color: color-mix(in srgb, var(--badge-color) 60%, #14243b) !important;
  border: 1px solid color-mix(in srgb, var(--badge-color) 24%, white);
}
.task-row :deep(.task-value-badge > button)::before, .task-row :deep(.task-value-badge > div:not(.fixed))::before { content: ''; width: 6px; height: 6px; flex-shrink: 0; border-radius: 50%; background: var(--badge-color); }
.task-row :deep(.task-timeline > button) { padding: 0 8px; border-radius: 7px; background: #f1f5f9; min-height: 32px; color: #475569; font-size: 12px; }
.task-row :deep(.task-title-button) { font-weight: 550; color: #203451; font-size: 13px; }
@media (min-width: 1024px) { .task-row { min-width: max-content; } }

/* Scrollbar visível em mobile, oculta em desktop */
.scrollbar-mobile {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  -webkit-overflow-scrolling: touch;
}

.scrollbar-mobile::-webkit-scrollbar {
  height: 6px;
}

.scrollbar-mobile::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-mobile::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.scrollbar-mobile::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

/* Desktop: ocultar scrollbar */
@media (min-width: 1024px) {
  .scrollbar-mobile {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .scrollbar-mobile::-webkit-scrollbar {
    display: none;
  }
}

/* Touch action para permitir scroll horizontal suave */
.touch-pan-x {
  touch-action: pan-x pan-y;
}

/* Melhorar resposta ao toque em botões */
.touch-manipulation {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
