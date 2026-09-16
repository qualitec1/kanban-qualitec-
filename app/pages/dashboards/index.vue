<template>
  <div v-if="mounted" class="min-h-screen bg-[#f6f7fb]">
    <!-- Header -->
    <DashboardHeader
      :connected-boards-count="connectedBoards.length"
      :search-query="searchQuery"
      :filter-by-people="filterByPeople"
      :is-favorite="isDashboardFavorite"
      :active-filter-count="advancedFilterCount"
      @add-widget="handleAddWidget"
      @manage-boards="handleManageBoards"
      @update:search-query="searchQuery = $event"
      @toggle-people-filter="handleTogglePeopleFilter"
      @toggle-filters="handleToggleFilters"
      @open-settings="handleOpenSettings"
      @toggle-favorite="handleToggleFavorite"
    />

    <div class="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 text-sm" aria-live="polite">
      <span>{{ filteredTaskCount }} tarefa(s) nos quadros selecionados</span>
      <span v-if="hasActiveFilters" class="text-primary-700">Filtros ativos</span>
      <button v-if="hasActiveFilters" type="button" class="text-primary-700 underline" @click="clearFilters">Limpar todos os filtros</button>
      <button type="button" class="ml-auto rounded-lg border bg-white px-3 py-2 disabled:opacity-50" :disabled="isLoading" @click="fetchAllDashboardData()">Atualizar dados</button>
      <p v-if="preferenceNotice" role="status" class="w-full text-amber-700">{{ preferenceNotice }}</p>
    </div>
    <div v-if="error" role="alert" class="mx-4 rounded-lg bg-red-50 p-4 text-red-700">{{ error }}</div>
    <div v-if="!isLoading && !error && !connectedBoards.length" class="p-8 text-center text-neutral-500">
      Conecte um quadro para visualizar os indicadores.
      <button type="button" class="ml-2 text-primary-700 underline" @click="handleManageBoards">Selecionar quadros</button>
    </div>
    <div v-else-if="!isLoading && !error && !filteredTaskCount" class="px-6 py-3 text-neutral-500">Nenhuma tarefa corresponde à seleção atual.</div>

    <!-- Loading state -->
    <LoadingState v-if="isLoading" label="Carregando dados do dashboard..." size="md" />

    <!-- Canvas de widgets com posicionamento livre -->
    <div v-else-if="!error && connectedBoards.length" ref="canvasRef" class="dashboard-canvas relative p-4 sm:p-6" :style="{ minHeight: `${canvasHeight}px` }">
      <p v-if="!widgetsList.length" class="text-neutral-500">Adicione uma ferramenta para montar seu painel.</p>

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
          isResizing === widget.id && 'resizing',
          settings.lockLayout && 'layout-locked'
        ]"
        @mousedown="startDrag($event, widget)"
        @touchstart="startDrag($event, widget)"
      >
        <WidgetCard
          :widget-id="widget.id"
          :title="widget.title"
          :size="widget.size"
          :loading="widget.loading"
          @filter="handleToggleFilters"
          @settings="handleOpenSettings"
          @resize-start="startResize($event, widget)"
          @fullscreen="handleWidgetFullscreen"
          @exit-fullscreen="handleWidgetExitFullscreen"
          @rename="handleWidgetRename"
          @duplicate="handleWidgetDuplicate"
          @delete="handleWidgetDelete"
        >
          <!-- Widget: Tarefas por Responsável -->
          <AssigneeWidget v-if="widget.type === 'assignee' || widget.id === 'widget-1'" :assignees="assigneeData" />

          <!-- Widget: Tarefas Atrasadas -->
          <OverdueWidget v-else-if="widget.type === 'overdue' || widget.id === 'widget-3'" :tasks="filteredOverdueData" />

          <!-- Widget: Próximos Vencimentos -->
          <UpcomingWidget v-else-if="widget.type === 'upcoming' || widget.type === 'deadline' || widget.id === 'widget-4'" :tasks="filteredUpcomingTasks" :days="settings.upcomingDays" />

          <!-- Widget: Tarefas por Status -->
          <StatusWidget v-else-if="widget.type === 'status' || widget.id === 'widget-2'" :statuses="statusData" />

          <!-- Widget: Progresso Geral (Bateria de Status) -->
          <BatteryWidget v-else-if="widget.type === 'progress'" :statuses="statusData" />

          <!-- Widget: Cronograma (Linha do Tempo) -->
          <ScheduleWidget v-else-if="widget.type === 'gantt'" :upcoming-tasks="filteredUpcomingTasks" :overdue-tasks="filteredOverdueData" />

          <!-- Widget: Arquivos Recentes -->
          <FilesWidget v-else-if="widget.type === 'files'" :files="recentFiles" :file-count="fileCount" />

          <!-- Widget: Métricas Gerais -->
          <NumbersWidget
            v-else-if="widget.type === 'numbers'"
            :statuses="statusData"
            :overdue-count="filteredOverdueData.length"
            :upcoming-count="filteredUpcomingTasks.length"
            :assignees-count="assigneeData.length"
            :file-count="fileCount"
          />

          <!-- Fallback genérico -->
          <div v-else class="text-center py-8">
            <p class="text-4xl font-bold" :class="widget.valueColor">{{ resolveValue(widget) }}</p>
            <p class="text-sm text-neutral-500 mt-1">{{ widget.label }}</p>
          </div>
        </WidgetCard>

        <!-- Resize handle -->
        <div
          v-if="!widget.loading && !settings.lockLayout"
          class="resize-handle resize-se"
          @mousedown.stop="startResize($event, widget, 'se')"
          @touchstart.stop="startResize($event, widget, 'se')"
        ></div>
      </div>
    </div>

    <DashboardControls
      :panel="activePanel" :filters="filters" :settings="settings"
      :people="availablePeople" :statuses="availableStatuses" :priorities="availablePriorities"
      @close="activePanel = null" @apply-filters="filters = $event"
      @apply-settings="settings = $event" @reorganize="reorganizeWidgets"
    />
    <!-- Modal de gerenciar quadros -->
    <ManageBoardsModal
      v-model="showManageBoardsModal"
      :initial-connected-ids="connectedBoards"
      @save="handleSaveBoards"
    />

    <!-- Modal de adicionar widget -->
    <AddWidgetModal
      v-model="showAddWidgetModal"
      @select="handleWidgetTypeSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import DashboardControls from '~/components/dashboard/DashboardControls.vue'
import { defaultDashboardFilters, readDashboardPreferences } from '~/utils/dashboard'
import { useDashboard } from '~/composables/useDashboard'
import DashboardHeader from '~/components/dashboard/DashboardHeader.vue'
import WidgetCard from '~/components/dashboard/WidgetCard.vue'
import AssigneeWidget from '~/components/dashboard/AssigneeWidget.vue'
import AddWidgetModal from '~/components/dashboard/AddWidgetModal.vue'
import LoadingState from '~/components/LoadingState.vue'
import OverdueWidget from '~/components/dashboard/OverdueWidget.vue'
import UpcomingWidget from '~/components/dashboard/UpcomingWidget.vue'
import StatusWidget from '~/components/dashboard/StatusWidget.vue'
import ManageBoardsModal from '~/components/dashboard/ManageBoardsModal.vue'
import BatteryWidget from '~/components/dashboard/BatteryWidget.vue'
import FilesWidget from '~/components/dashboard/FilesWidget.vue'
import ScheduleWidget from '~/components/dashboard/ScheduleWidget.vue'
import NumbersWidget from '~/components/dashboard/NumbersWidget.vue'

definePageMeta({ layout: 'default', ssr: false })

const activePanel = ref<'people' | 'filters' | 'settings' | null>(null)
const preferenceNotice = ref('')
const canvasRef = ref<HTMLElement | null>(null)
const { user } = useAuth()
const preferencesKey = computed(() => `dashboard-controls:${user.value?.id || 'anonymous'}`)
let preferencesReady = false
let refreshTimer: ReturnType<typeof setInterval> | undefined
const mounted = ref(false)
const isDragging = ref<string | null>(null)
const isResizing = ref<string | null>(null)
const dragStart = ref({ x: 0, y: 0, widgetX: 0, widgetY: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })
const showAddWidgetModal = ref(false)
const showManageBoardsModal = ref(false)
const isDashboardFavorite = ref(false)

// Chamar useDashboard no nível do setup para garantir a reatividade completa
const {
  connectedBoards,
  filterByPeople,
  filters, settings, error, filteredTaskCount,
  availablePeople, availableStatuses, availablePriorities,
  isLoading,
  statusData,
  assigneeData,
  overdueData,
  upcomingTasks,
  fileCount,
  recentFiles,
  fetchAllDashboardData
} = useDashboard()

// All widgets share the same filtered task set.
const searchQuery = computed({ get: () => filters.value.search, set: (value: string) => { filters.value.search = value } })
const filteredOverdueData = overdueData
const filteredUpcomingTasks = upcomingTasks
const advancedFilterCount = computed(() => filters.value.statuses.length + filters.value.priorities.length + Number(filters.value.completion !== 'all') + Number(filters.value.due !== 'all') + Number(!!filters.value.from || !!filters.value.to))
const hasActiveFilters = computed(() => !!searchQuery.value.trim() || filterByPeople.value.length > 0 || advancedFilterCount.value > 0)
function clearFilters() { filters.value = defaultDashboardFilters() }
function configureRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = undefined
  if (settings.value.refreshSeconds) {
    refreshTimer = setInterval(() => {
      if (!isLoading.value && document.visibilityState === 'visible') void fetchAllDashboardData()
    }, settings.value.refreshSeconds * 1000)
  }
}
watch([filters, settings], () => {
  if (!preferencesReady) return
  try {
    localStorage.setItem(preferencesKey.value, JSON.stringify({ filters: filters.value, settings: settings.value }))
    preferenceNotice.value = ''
  } catch { preferenceNotice.value = 'As preferências funcionam nesta sessão, mas não puderam ser salvas no navegador.' }
}, { deep: true })
watch(() => settings.value.refreshSeconds, () => { if (preferencesReady) configureRefresh() })

const defaultWidgets = [
  {
    id: 'widget-1',
    type: 'assignee',
    title: 'Tarefas por Responsável',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-green-600',
    label: 'responsáveis',
    position: { x: 20, y: 20, width: 380, height: 340, zIndex: 1 }
  },
  {
    id: 'widget-2',
    type: 'status',
    title: 'Tarefas por Status',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-blue-600',
    label: 'status com tarefas',
    position: { x: 420, y: 20, width: 380, height: 340, zIndex: 1 }
  },
  {
    id: 'widget-3',
    type: 'overdue',
    title: 'Tarefas Atrasadas',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-red-600',
    label: 'tarefas atrasadas',
    position: { x: 20, y: 380, width: 380, height: 320, zIndex: 1 }
  },
  {
    id: 'widget-4',
    type: 'upcoming',
    title: 'Próximos Vencimentos',
    size: 'half' as const,
    loading: false,
    valueColor: 'text-orange-600',
    label: 'vencem em breve',
    position: { x: 420, y: 380, width: 380, height: 320, zIndex: 1 }
  }
]

const widgetsList = ref(defaultWidgets.map(w => ({ ...w, position: { ...w.position } })))
const canvasHeight = computed(() => Math.max(500, ...widgetsList.value.map(w => w.position.y + w.position.height + 40)))
function reorganizeWidgets() {
  const width = canvasRef.value?.clientWidth || 800
  const columns = Math.max(1, Math.floor((width - 20) / 400))
  widgetsList.value.forEach((widget, index) => {
    widget.position = { x: 20 + (index % columns) * 400, y: 20 + Math.floor(index / columns) * 360, width: Math.min(380, width - 40), height: 340, zIndex: 1 }
  })
  saveWidgetPositions()
}

function resolveValue(widget: any): number {
  const type = widget.type || (
    widget.id === 'widget-1' ? 'assignee' :
    widget.id === 'widget-2' ? 'status' :
    widget.id === 'widget-3' ? 'overdue' :
    widget.id === 'widget-4' ? 'upcoming' : ''
  )
  
  if (type === 'assignee') return assigneeData.value.length
  if (type === 'status') return statusData.value.length
  if (type === 'overdue') return filteredOverdueData.value.length
  if (type === 'upcoming') return filteredUpcomingTasks.value.length
  
  // Tipos customizados/adicionais:
  if (type === 'numbers') {
    // Métricas Gerais: total de tarefas ativas em todos os status
    return statusData.value.reduce((sum, s) => sum + s.count, 0)
  }
  if (type === 'progress') {
    // Progresso Geral: porcentagem de conclusão
    const total = statusData.value.reduce((sum, s) => sum + s.count, 0)
    if (total === 0) return 0
    const completed = statusData.value.filter(s => s.isDone).reduce((sum, s) => sum + s.count, 0)
    return Math.round((completed / total) * 100)
  }
  if (type === 'gantt') {
    // Cronograma: tarefas com data de vencimento (atrasadas + próximas)
    return filteredOverdueData.value.length + filteredUpcomingTasks.value.length
  }
  if (type === 'files') {
    // Arquivos: quantidade total de anexos
    return fileCount.value
  }
  
  return 0
}

function loadWidgetPositions() {
  if (import.meta.server) return
  try {
    const saved = localStorage.getItem('dashboard-widget-positions')
    if (saved) {
      const savedData = JSON.parse(saved)
      if (savedData.widgets) {
        widgetsList.value = savedData.widgets
      } else if (savedData.widgetIds) {
        widgetsList.value = defaultWidgets.filter(w => savedData.widgetIds.includes(w.id))
        if (savedData.positions) {
          widgetsList.value.forEach(widget => {
            const sp = savedData.positions.find((p: any) => p.id === widget.id)
            if (sp?.position) widget.position = { ...sp.position }
          })
        }
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
      widgets: widgetsList.value
    }))
  } catch (e) {
    console.error('[dashboards/index] Error saving positions:', e)
  }
}

// ── Drag ──────────────────────────────────────────────────────────────────────
function startDrag(event: MouseEvent | TouchEvent, widget: any) {
  const target = event.target as HTMLElement
  if (settings.value.lockLayout || window.innerWidth < 640 || target.closest('button, input, select, a, .resize-handle')) return

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
  if (settings.value.lockLayout || window.innerWidth < 640) return
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
function handleManageBoards() { showManageBoardsModal.value = true }

async function handleSaveBoards(selectedIds: string[]) {
  connectedBoards.value = selectedIds
  if (import.meta.client) {
    try { localStorage.setItem('dashboard-connected-boards', JSON.stringify(selectedIds)) }
    catch { preferenceNotice.value = 'A seleção de quadros foi aplicada, mas não pôde ser salva neste navegador.' }
  }
  await fetchAllDashboardData()
}

function handleTogglePeopleFilter() {
  activePanel.value = 'people'
}

function handleToggleFilters() {
  activePanel.value = 'filters'
}

function handleOpenSettings() {
  activePanel.value = 'settings'
}

function handleToggleFavorite() {
  isDashboardFavorite.value = !isDashboardFavorite.value
  if (import.meta.client) {
    try { localStorage.setItem('dashboard-favorite', String(isDashboardFavorite.value)) }
    catch { preferenceNotice.value = 'O favorito não pôde ser salvo neste navegador.' }
  }
}

function handleWidgetFullscreen(_id: string) {}
function handleWidgetExitFullscreen(_id: string) {}

function handleWidgetTypeSelected(widgetType: string) {
  const newWidget = {
    id: `widget-${Date.now()}`,
    type: widgetType,
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
  let initializeBoards = true
  try {
    const savedPreferences = readDashboardPreferences(localStorage.getItem(preferencesKey.value))
    filters.value = savedPreferences.filters
    settings.value = savedPreferences.settings
    isDashboardFavorite.value = localStorage.getItem('dashboard-favorite') === 'true'
    const saved = localStorage.getItem('dashboard-connected-boards')
    if (saved !== null) {
      const ids = JSON.parse(saved)
      if (Array.isArray(ids) && ids.every(id => typeof id === 'string')) {
        connectedBoards.value = ids
        initializeBoards = false
      }
    }
  } catch { preferenceNotice.value = 'Não foi possível recuperar todas as preferências salvas.' }
  preferencesReady = true
  configureRefresh()
  await fetchAllDashboardData(initializeBoards)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
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
.widget-container.layout-locked { cursor: default; user-select: auto; touch-action: auto; }

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

@media (max-width: 639px) {
  .dashboard-canvas { display: flex; flex-direction: column; gap: 16px; min-height: auto !important; }
  .widget-container { position: relative !important; left: auto !important; top: auto !important; width: 100% !important; height: 360px !important; cursor: default; touch-action: auto; }
  .resize-handle { display: none; }
  .resize-handle { width: 24px; height: 24px; opacity: 0.7; }
  .resize-se { bottom: -12px; right: -12px; }
}
</style>
