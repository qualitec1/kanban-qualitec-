<template>
  <div v-if="mounted" class="min-h-screen bg-[#f6f7fb]">
    <!-- Header -->
    <DashboardHeader
      :connected-boards-count="connectedBoards.length"
      :search-query="searchQuery"
      :filter-by-people="filterByPeople"
      @add-widget="handleAddWidget"
      @manage-boards="handleManageBoards"
      @update:search-query="searchQuery = $event"
      @toggle-people-filter="handleTogglePeopleFilter"
      @toggle-filters="handleToggleFilters"
      @open-settings="handleOpenSettings"
      @toggle-favorite="handleToggleFavorite"
    />

    <!-- Loading state -->
    <LoadingState v-if="isLoading" label="Carregando dados do dashboard..." size="md" />

    <!-- Canvas de widgets com posicionamento livre -->
    <div v-else class="relative p-4 sm:p-6" style="min-height: calc(100vh - 120px);">

      <div
        v-for="widget in widgetsList"
        :key="widget.id"
        :style="{
          position: 'absolute',
          left: `${widget.position.x}px`,
          top: `${widget.position.y}px`,
          width: `${widget.position.width}px`,
          height: `${widget.position.height}px`,
          transition: isDragging === widget.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: isDragging === widget.id ? 1000 : widget.position.zIndex || 1
        }"
        :class="[
          'widget-container',
          isDragging === widget.id && 'dragging',
          isResizing === widget.id && 'resizing'
        ]"
        @mousedown="startDrag($event, widget)"
        @touchstart="startDrag($event, widget)"
      >
        <WidgetCard
          :widget-id="widget.id"
          :title="widget.title"
          :size="widget.size"
          :loading="widget.loading"
          @resize-start="startResize($event, widget)"
          @fullscreen="handleWidgetFullscreen"
          @exit-fullscreen="handleWidgetExitFullscreen"
          @rename="handleWidgetRename"
          @duplicate="handleWidgetDuplicate"
          @delete="handleWidgetDelete"
        >
          <!-- Widget: Tarefas por Responsável -->
          <AssigneeWidget v-if="widget.id === 'widget-1'" :assignees="assigneeData" />

          <!-- Widget: Tarefas Atrasadas -->
          <OverdueWidget v-else-if="widget.id === 'widget-3'" :tasks="overdueData" />

          <!-- Widget: Próximos Vencimentos -->
          <UpcomingWidget v-else-if="widget.id === 'widget-4'" :tasks="upcomingTasks" />

          <!-- Widget: Tarefas por Status -->
          <StatusWidget v-else-if="widget.id === 'widget-2'" :statuses="statusData" />

          <!-- Fallback genérico -->
          <div v-else class="text-center py-8">
            <p class="text-4xl font-bold" :class="widget.valueColor">{{ resolveValue(widget) }}</p>
            <p class="text-sm text-neutral-500 mt-1">{{ widget.label }}</p>
          </div>
        </WidgetCard>

        <!-- Resize handle -->
        <div
          v-if="!widget.loading"
          class="resize-handle resize-se"
          @mousedown.stop="startResize($event, widget, 'se')"
          @touchstart.stop="startResize($event, widget, 'se')"
        ></div>
      </div>
    </div>

    <!-- Modal de adicionar widget -->
    <AddWidgetModal
      v-model="showAddWidgetModal"
      @select="handleWidgetTypeSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from '#imports'
import { useDashboard } from '~/composables/useDashboard'
import DashboardHeader from '~/components/dashboard/DashboardHeader.vue'
import WidgetCard from '~/components/dashboard/WidgetCard.vue'
import AssigneeWidget from '~/components/dashboard/AssigneeWidget.vue'
import AddWidgetModal from '~/components/dashboard/AddWidgetModal.vue'
import LoadingState from '~/components/LoadingState.vue'
import OverdueWidget from '~/components/dashboard/OverdueWidget.vue'
import UpcomingWidget from '~/components/dashboard/UpcomingWidget.vue'
import StatusWidget from '~/components/dashboard/StatusWidget.vue'

definePageMeta({ layout: 'default', ssr: false })

const searchQuery = ref('')
const mounted = ref(false)
const isDragging = ref<string | null>(null)
const isResizing = ref<string | null>(null)
const dragStart = ref({ x: 0, y: 0, widgetX: 0, widgetY: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })
const showAddWidgetModal = ref(false)

let connectedBoards = ref<string[]>([])
let filterByPeople = ref<string[]>([])
let isLoading = ref(false)
let statusData = ref<any[]>([])
let assigneeData = ref<any[]>([])
let overdueData = ref<any[]>([])
let deadlineData = ref<any[]>([])
let upcomingTasks = ref<any[]>([])
let fetchAllDashboardData = async () => {}

const defaultWidgets = [
  {
    id: 'widget-1',
    title: 'Tarefas por Responsável',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-green-600',
    label: 'responsáveis',
    position: { x: 20, y: 20, width: 380, height: 340, zIndex: 1 }
  },
  {
    id: 'widget-2',
    title: 'Tarefas por Status',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-blue-600',
    label: 'status com tarefas',
    position: { x: 420, y: 20, width: 380, height: 340, zIndex: 1 }
  },
  {
    id: 'widget-3',
    title: 'Tarefas Atrasadas',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-red-600',
    label: 'tarefas atrasadas',
    position: { x: 20, y: 380, width: 380, height: 320, zIndex: 1 }
  },
  {
    id: 'widget-4',
    title: 'Próximos Vencimentos',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-orange-600',
    label: 'vencem em breve',
    position: { x: 420, y: 380, width: 380, height: 320, zIndex: 1 }
  }
]

const widgetsList = ref(defaultWidgets)

function resolveValue(widget: any): number {
  if (widget.id === 'widget-1') return assigneeData.value.length
  if (widget.id === 'widget-2') return statusData.value.length
  if (widget.id === 'widget-3') return overdueData.value.length
  if (widget.id === 'widget-4') return upcomingTasks.value.length
  return 0
}

function loadWidgetPositions() {
  if (import.meta.server) return
  try {
    const saved = localStorage.getItem('dashboard-widget-positions')
    if (saved) {
      const savedData = JSON.parse(saved)
      if (savedData.widgetIds) {
        widgetsList.value = defaultWidgets.filter(w => savedData.widgetIds.includes(w.id))
      }
      if (savedData.positions) {
        widgetsList.value.forEach(widget => {
          const sp = savedData.positions.find((p: any) => p.id === widget.id)
          if (sp?.position) widget.position = { ...sp.position }
        })
      }
    }
  } catch (e) {
    console.error('[dashboards/index] Error loading positions:', e)
  }
}

function saveWidgetPositions() {
  if (import.meta.server) return
  try {
    localStorage.setItem('dashboard-widget-positions', JSON.stringify({
      widgetIds: widgetsList.value.map(w => w.id),
      positions: widgetsList.value.map(w => ({ id: w.id, position: w.position }))
    }))
  } catch (e) {
    console.error('[dashboards/index] Error saving positions:', e)
  }
}

// ── Drag ──────────────────────────────────────────────────────────────────────
function startDrag(event: MouseEvent | TouchEvent, widget: any) {
  const target = event.target as HTMLElement
  if (target.closest('button') || target.closest('.resize-handle')) return

  isDragging.value = widget.id
  widget.position.zIndex = 100

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  dragStart.value = { x: clientX, y: clientY, widgetX: widget.position.x, widgetY: widget.position.y }

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove)
  document.addEventListener('touchend', onDragEnd)
}

function onDragMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  const widget = widgetsList.value.find(w => w.id === isDragging.value)
  if (!widget) return

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  widget.position.x = Math.max(0, dragStart.value.widgetX + clientX - dragStart.value.x)
  widget.position.y = Math.max(0, dragStart.value.widgetY + clientY - dragStart.value.y)
}

function onDragEnd() {
  if (isDragging.value) {
    const widget = widgetsList.value.find(w => w.id === isDragging.value)
    if (widget) widget.position.zIndex = 1
  }
  isDragging.value = null
  saveWidgetPositions()
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
}

// ── Resize ────────────────────────────────────────────────────────────────────
function startResize(event: MouseEvent | TouchEvent, widget: any, _direction = 'se') {
  event.preventDefault()
  event.stopPropagation()

  isResizing.value = widget.id
  widget.position.zIndex = 100

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  resizeStart.value = { x: clientX, y: clientY, width: widget.position.width, height: widget.position.height }

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.addEventListener('touchmove', onResizeMove)
  document.addEventListener('touchend', onResizeEnd)
}

function onResizeMove(event: MouseEvent | TouchEvent) {
  if (!isResizing.value) return
  const widget = widgetsList.value.find(w => w.id === isResizing.value)
  if (!widget) return

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  widget.position.width = Math.max(280, resizeStart.value.width + clientX - resizeStart.value.x)
  widget.position.height = Math.max(200, resizeStart.value.height + clientY - resizeStart.value.y)
}

function onResizeEnd() {
  if (isResizing.value) {
    const widget = widgetsList.value.find(w => w.id === isResizing.value)
    if (widget) widget.position.zIndex = 1
  }
  isResizing.value = null
  saveWidgetPositions()
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('touchmove', onResizeMove)
  document.removeEventListener('touchend', onResizeEnd)
}

// ── Handlers ──────────────────────────────────────────────────────────────────
function handleAddWidget() { showAddWidgetModal.value = true }
function handleManageBoards() {}
function handleTogglePeopleFilter() {}
function handleToggleFilters() {}
function handleOpenSettings() {}
function handleToggleFavorite() {}
function handleWidgetFullscreen(_id: string) {}
function handleWidgetExitFullscreen(_id: string) {}

function handleWidgetTypeSelected(widgetType: string) {
  const newWidget = {
    id: `widget-${Date.now()}`,
    title: getWidgetTitle(widgetType),
    size: 'half' as const,
    loading: false,
    valueColor: getWidgetColor(widgetType),
    label: getWidgetLabel(widgetType),
    position: { x: 20, y: 20 + widgetsList.value.length * 30, width: 380, height: 320, zIndex: 1 }
  }
  widgetsList.value.push(newWidget)
  saveWidgetPositions()
}

function handleWidgetRename(widgetId: string, newTitle: string) {
  const widget = widgetsList.value.find(w => w.id === widgetId)
  if (widget) { widget.title = newTitle; saveWidgetPositions() }
}

function handleWidgetDuplicate(widgetId: string) {
  const widget = widgetsList.value.find(w => w.id === widgetId)
  if (widget) {
    widgetsList.value.push({
      ...widget,
      id: `widget-${Date.now()}`,
      title: `${widget.title} (cópia)`,
      position: { ...widget.position, x: widget.position.x + 20, y: widget.position.y + 20, zIndex: 1 }
    })
    saveWidgetPositions()
  }
}

function handleWidgetDelete(widgetId: string) {
  const index = widgetsList.value.findIndex(w => w.id === widgetId)
  if (index !== -1) { widgetsList.value.splice(index, 1); saveWidgetPositions() }
}

function getWidgetTitle(type: string): string {
  const map: Record<string, string> = {
    assignee: 'Tarefas por Responsável', numbers: 'Métricas Gerais',
    progress: 'Progresso Geral', gantt: 'Cronograma', files: 'Arquivos', status: 'Tarefas por Status'
  }
  return map[type] || 'Novo Widget'
}

function getWidgetLabel(type: string): string {
  const map: Record<string, string> = {
    assignee: 'responsáveis', numbers: 'métricas', progress: '% completo',
    gantt: 'tarefas', files: 'arquivos', status: 'status'
  }
  return map[type] || 'itens'
}

function getWidgetColor(type: string): string {
  const map: Record<string, string> = {
    assignee: 'text-green-600', numbers: 'text-purple-600', progress: 'text-blue-600',
    gantt: 'text-orange-600', files: 'text-cyan-600', status: 'text-pink-600'
  }
  return map[type] || 'text-neutral-600'
}

onMounted(async () => {
  mounted.value = true
  loadWidgetPositions()

  const dashboard = useDashboard()
  connectedBoards = dashboard.connectedBoards
  filterByPeople = dashboard.filterByPeople
  isLoading = dashboard.isLoading
  statusData = dashboard.statusData
  assigneeData = dashboard.assigneeData
  overdueData = dashboard.overdueData
  deadlineData = dashboard.deadlineData
  upcomingTasks = dashboard.upcomingTasks
  fetchAllDashboardData = dashboard.fetchAllDashboardData

  await fetchAllDashboardData()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
  document.removeEventListener('touchmove', onResizeMove)
  document.removeEventListener('touchend', onResizeEnd)
})
</script>

<style scoped>
.widget-container {
  cursor: move;
  user-select: none;
  touch-action: none;
}

.widget-container.dragging {
  cursor: grabbing;
  opacity: 0.9;
  transform: rotate(1deg) scale(1.01);
  box-shadow: 0 20px 40px rgba(0, 115, 234, 0.2);
}

.widget-container.resizing { cursor: nwse-resize; }

.resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #0073ea;
  border: 2px solid white;
  border-radius: 50%;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.widget-container:hover .resize-handle { opacity: 1; }

.resize-se { bottom: -8px; right: -8px; }

@media (max-width: 640px) {
  .resize-handle { width: 24px; height: 24px; opacity: 0.7; }
  .resize-se { bottom: -12px; right: -12px; }
}
</style>
