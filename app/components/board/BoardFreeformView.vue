<template>
  <section class="freeform-view">
    <div class="canvas-toolbar">
      <div><strong>Seu espaço de tarefas</strong><p>{{ allTasks.length }} tarefas · {{ dueOrder && dueOrder !== 'manual' ? 'Ordenadas por vencimento. Selecione Ordem manual para mover.' : 'Arraste pela alça para organizar' }}</p></div>
      <div class="canvas-actions">
        <button type="button" :disabled="!allTasks.length || !!dueOrder && dueOrder !== 'manual'" @click="organize">Organizar cartões</button>
        <button type="button" @click="viewport?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })">Voltar ao início</button>
      </div>
    </div>
    <p v-if="storageError" role="status" class="storage-message">A organização está disponível nesta sessão, mas não pôde ser salva no navegador.</p>
    <div ref="viewport" class="canvas-viewport" tabindex="0" aria-label="Espaço livre de tarefas. Use as barras de rolagem para navegar.">
      <div v-if="allTasks.length" class="canvas-surface" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
        <article v-for="task in allTasks" :key="task.id" class="freeform-card" :class="{ moving: interaction?.id === task.id }" :style="cardStyle(task.id)">
          <div class="card-topline">
            <span class="group-label"><i :style="{ background: groupFor(task.id)?.color || '#64748b' }" />{{ groupFor(task.id)?.name || 'Tarefa' }}</span>
            <button type="button" v-if="!dueOrder || dueOrder === 'manual'" class="move-handle" aria-label="Mover cartão. Use as setas para ajustar a posição." title="Arraste para mover · Setas para ajustar" @pointerdown="startInteraction($event, task.id, 'move')" @keydown="moveWithKeyboard($event, task.id)">⠿</button>
          </div>
          <button type="button" class="card-title" @click="previewTask = task">{{ task.title || 'Sem título' }}</button>
          <div class="card-badges">
            <span v-if="statusFor(task)" class="card-badge" :style="{ '--badge-color': statusFor(task)?.color }">{{ statusFor(task)?.name }}</span>
            <span v-if="priorityFor(task)" class="card-badge" :style="{ '--badge-color': priorityFor(task)?.color }">{{ priorityFor(task)?.name }}</span>
          </div>
          <p class="card-description">{{ task.description || 'Abra a tarefa para ver os detalhes.' }}</p>
          <button v-if="task.subtasks?.length" type="button" class="freeform-subtasks" @click="previewTask = task">✓ {{ task.subtasks.filter(s => s.is_done).length }}/{{ task.subtasks.length }} subtarefas · Pré-visualizar</button>
          <div class="card-footer">
            <span class="due-date">{{ task.due_date ? 'Até ' + formatDate(task.due_date) : 'Sem prazo' }}</span>
            <div class="card-assignees" :title="(task.assignees || []).map(a => a.full_name || a.email).join(', ')">
              <span v-for="person in (task.assignees || []).slice(0, 2)" :key="person.id" class="person-avatar">
                <img v-if="person.avatar_url" :src="person.avatar_url" alt="" draggable="false" />
                <span v-else>{{ (person.full_name || person.email || '?').slice(0, 1).toUpperCase() }}</span>
              </span>
              <span v-if="task.assignees?.length > 2" class="person-avatar">+{{ task.assignees.length - 2 }}</span>
              <span v-if="!task.assignees?.length" class="unassigned">Sem responsável</span>
            </div>
          </div>
          <button type="button" v-if="!dueOrder || dueOrder === 'manual'" class="resize-handle" title="Arraste para redimensionar · Setas para ajustar" aria-label="Redimensionar cartão. Use as setas para ajustar o tamanho." @pointerdown="startInteraction($event, task.id, 'resize')" @keydown="moveWithKeyboard($event, task.id, true)">◢</button>
        </article>
      </div>
      <div v-else class="canvas-empty"><strong>Nenhuma tarefa para mostrar</strong><p>Crie uma tarefa no Kanban ou ajuste os filtros do quadro.</p></div>
    </div>
    <TaskQuickPreview v-if="previewTask" :model-value="true" :task-id="previewTask.id" :board-id="boardId" :initial-task="previewTask" :can-edit="canEdit" @update:model-value="previewTask = null" @updated="$emit('task-updated', previewTask.id)" @deleted="$emit('task-updated', $event); previewTask = null" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { sortTasksByDueDate, type TaskDueOrder } from '~/utils/taskDueOrder'
import type { TaskRow } from '~/composables/useTasks'
import { CARD_WIDTH, CARD_HEIGHT, readPositions, gridPosition, addMissingPositions, type CardPosition } from '~/utils/freeformLayout'
type FreeformTask = TaskRow & { assignees?: Array<{ id: string; full_name: string | null; email: string; avatar_url: string | null }> }
const props = defineProps<{
  boardId: string
  tasksByGroup: Record<string, FreeformTask[]>
  canEdit: boolean
  dueOrder?: TaskDueOrder
  groups?: Array<{ id: string; name: string; color: string | null }>
  statuses?: Array<{ id: string; name: string; color: string }>
  priorities?: Array<{ id: string; name: string; color: string }>
}>()
defineEmits<{ 'open-task': [task: TaskRow]; 'task-updated': [id: string] }>()
const previewTask = ref<FreeformTask | null>(null)
const viewport = ref<HTMLElement | null>(null)
const positions = ref<Record<string, CardPosition>>({})
const storageError = ref(false)
const ready = ref(false)
const interaction = ref<{ id: string; mode: 'move' | 'resize'; pointerId: number; x: number; y: number; scrollX: number; scrollY: number; origin: CardPosition } | null>(null)
const allTasks = computed(() => sortTasksByDueDate(Object.values(props.tasksByGroup).flat(), props.dueOrder || 'manual'))
const key = computed(() => 'board-tasks-positions-' + props.boardId)
const columns = () => Math.max(1, Math.floor(((viewport.value?.clientWidth || 1024) - 24) / (CARD_WIDTH + 24)))
const displayedPositions = computed(() => !props.dueOrder || props.dueOrder === 'manual' ? positions.value : Object.fromEntries(allTasks.value.map((task, i) => [task.id, gridPosition(i, columns())])))
const canvasWidth = computed(() => Math.max(350, ...allTasks.value.map(t => (displayedPositions.value[t.id]?.x || 0) + (displayedPositions.value[t.id]?.width || CARD_WIDTH) + 48)))
const canvasHeight = computed(() => Math.max(500, ...allTasks.value.map(t => (displayedPositions.value[t.id]?.y || 0) + (displayedPositions.value[t.id]?.height || CARD_HEIGHT) + 48)))
const statusFor = (task: TaskRow) => props.statuses?.find(s => s.id === task.status_id)
const priorityFor = (task: TaskRow) => props.priorities?.find(p => p.id === task.priority_id)
function groupFor(id: string) {
  const entry = Object.entries(props.tasksByGroup).find(([, tasks]) => tasks.some(t => t.id === id))
  return props.groups?.find(g => g.id === entry?.[0])
}
function cardStyle(id: string) {
  const p = displayedPositions.value[id] || gridPosition(0, 1)
  return { left: p.x + 'px', top: p.y + 'px', width: p.width + 'px', height: p.height + 'px', zIndex: interaction.value?.id === id ? 2 : 1 }
}
function syncPositions() {
  if (!ready.value) return
  positions.value = addMissingPositions(allTasks.value.map(t => t.id), positions.value, columns())
  save()
}
function save() {
  try { localStorage.setItem(key.value, JSON.stringify(positions.value)); storageError.value = false }
  catch { storageError.value = true }
}
function load() {
  try { positions.value = readPositions(localStorage.getItem(key.value)) }
  catch { positions.value = {}; storageError.value = true }
  syncPositions()
}
function organize() {
  if (props.dueOrder && props.dueOrder !== 'manual') return
  allTasks.value.forEach((task, i) => { positions.value[task.id] = gridPosition(i, columns()) })
  save()
  viewport.value?.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
}
function startInteraction(event: PointerEvent, id: string, mode: 'move' | 'resize') {
  if (props.dueOrder && props.dueOrder !== 'manual') return
  if (event.button !== 0 || !positions.value[id]) return
  event.preventDefault()
  interaction.value = { id, mode, pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollX: viewport.value?.scrollLeft || 0, scrollY: viewport.value?.scrollTop || 0, origin: { ...positions.value[id] } }
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', finish)
  document.addEventListener('pointercancel', cancel)
}
function move(event: PointerEvent) {
  const state = interaction.value
  if (!state || state.pointerId !== event.pointerId) return
  const dx = event.clientX - state.x + (viewport.value?.scrollLeft || 0) - state.scrollX
  const dy = event.clientY - state.y + (viewport.value?.scrollTop || 0) - state.scrollY
  positions.value[state.id] = state.mode === 'move'
    ? { ...state.origin, x: Math.max(0, state.origin.x + dx), y: Math.max(0, state.origin.y + dy) }
    : { ...state.origin, width: Math.min(800, Math.max(CARD_WIDTH, state.origin.width + dx)), height: Math.min(800, Math.max(CARD_HEIGHT, state.origin.height + dy)) }
}
function cleanup() {
  document.removeEventListener('pointermove', move)
  document.removeEventListener('pointerup', finish)
  document.removeEventListener('pointercancel', cancel)
  interaction.value = null
}
function finish(event: PointerEvent) { if (event.pointerId !== interaction.value?.pointerId) return; cleanup(); save() }
function cancel() { if (interaction.value) positions.value[interaction.value.id] = interaction.value.origin; cleanup() }
function moveWithKeyboard(event: KeyboardEvent, id: string, resize = false) {
  if (props.dueOrder && props.dueOrder !== 'manual') return
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const p = positions.value[id]
  if (!p) return
  const step = event.shiftKey ? 40 : 10
  const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0
  const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0
  positions.value[id] = resize ? { ...p, width: Math.min(800, Math.max(CARD_WIDTH, p.width + dx)), height: Math.min(800, Math.max(CARD_HEIGHT, p.height + dy)) } : { ...p, x: Math.max(0, p.x + dx), y: Math.max(0, p.y + dy) }
  save()
}
function formatDate(value: string) { return new Date(value.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
watch(() => allTasks.value.map(t => t.id), syncPositions)
watch(() => props.dueOrder, () => { cancel(); viewport.value?.scrollTo({ top: 0, left: 0 }) })
watch(() => props.boardId, () => { if (ready.value) { cancel(); load() } })
onMounted(() => { ready.value = true; load() })
onUnmounted(cleanup)
</script>

<style scoped>
.freeform-view { min-width: 0; display: flex; flex: 1; flex-direction: column; margin: 0 16px 16px; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #f8fafc; }
.canvas-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; background: white; border-bottom: 1px solid #e2e8f0; }
.canvas-toolbar strong { font-size: 14px; color: #1e293b; }
.canvas-toolbar p { margin-top: 4px; font-size: 12px; color: #64748b; }
.canvas-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.canvas-actions button { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; font-size: 12px; color: #334155; }
.canvas-actions button:hover { background: #f1f5f9; }
.canvas-actions button:disabled { opacity: .5; }
.canvas-viewport { overflow: auto; height: max(440px, calc(100dvh - 275px)); background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 20px 20px; }
.canvas-surface { position: relative; min-width: 100%; }
.freeform-card { position: absolute; display: flex; flex-direction: column; gap: 8px; padding: 16px 18px 22px; background: white; border: 1px solid #dbe2ea; border-radius: 14px; box-shadow: 0 3px 10px #0f172a08; overflow: hidden; }
.freeform-card:hover, .freeform-card:focus-within { border-color: #94a3b8; box-shadow: 0 8px 24px #0f172a10; }
.freeform-card.moving { box-shadow: 0 16px 32px #0f172a25; border-color: #64748b; }
.card-topline, .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.group-label { display: flex; align-items: center; gap: 6px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #64748b; font-size: 11px; }
.group-label i { width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; }
.move-handle { width: 28px; height: 28px; flex-shrink: 0; cursor: grab; touch-action: none; color: #64748b; background: #f8fafc; border-radius: 6px; font-size: 20px; }
.card-title { text-align: left; font-size: 15px; font-weight: 600; line-height: 1.4; color: #1e293b; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex-shrink: 0; }
.card-title:hover { color: #2563eb; }
.card-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.card-badge { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 600; border-radius: 6px; padding: 4px 7px; color: color-mix(in srgb, var(--badge-color, #64748b) 70%, #0f172a); background: color-mix(in srgb, var(--badge-color, #64748b) 12%, white); }
.freeform-subtasks { font-size:11px; color:#475569; text-align:left; flex-shrink:0; }
.card-description { flex: 1; min-height: 0; font-size: 12px; line-height: 1.6; color: #64748b; overflow: hidden; }
.card-footer { border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: auto; flex-shrink: 0; }
.due-date, .unassigned { font-size: 11px; color: #64748b; }
.card-assignees { display: flex; align-items: center; }
.person-avatar { width: 26px; height: 26px; flex: 0 0 26px; overflow: hidden; border-radius: 50%; border: 2px solid white; background: #e2e8f0; color: #334155; font-size: 10px; display: flex; align-items: center; justify-content: center; margin-left: -5px; }
.person-avatar img { width: 100%; height: 100%; object-fit: cover; }
.resize-handle { position: absolute; right: 3px; bottom: 2px; width: 20px; height: 20px; color: #94a3b8; cursor: nwse-resize; touch-action: none; font-size: 14px; }
button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.canvas-empty { padding: 100px 24px; text-align: center; color: #64748b; }
.canvas-empty p { margin-top: 8px; font-size: 13px; }
.storage-message { padding: 8px 20px; font-size: 12px; color: #92400e; background: #fffbeb; }
@media (max-width: 640px) { .canvas-toolbar { align-items: flex-start; flex-direction: column; } .freeform-view { margin: 0 8px 8px; } }
</style>
