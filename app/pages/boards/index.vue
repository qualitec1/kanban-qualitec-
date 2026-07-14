<template>
  <div class="max-w-7xl mx-auto">

    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-heading-lg font-semibold text-neutral-900 mb-1">Quadros</h1>
        <p class="text-body text-muted">Todos os quadros da organização</p>
      </div>
      <ClientOnly>
        <BaseButton variant="primary" @click="showCreateModal = true">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo quadro
        </BaseButton>
      </ClientOnly>
    </div>

    <!-- Banner de ajuda -->
    <ClientOnly>
      <div v-if="showHelp" class="mb-6 bg-primary-50 border border-primary-200 rounded-xl p-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex gap-3">
          <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-body-sm font-semibold text-primary-900 mb-1">Como funcionam os Quadros?</p>
            <p class="text-label-sm text-primary-700 mb-3">
              Um quadro representa um projeto ou área de trabalho — ex: "Comercial", "Produção", "Expedição".
              Dentro de cada quadro você organiza tarefas em grupos como "A fazer", "Em andamento" e "Concluído".
            </p>
            <div class="flex flex-wrap gap-4 text-label-sm text-primary-700">
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-primary-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Clique em <strong>Novo quadro</strong> para criar
              </span>
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-primary-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>
                Clique no card para abrir o quadro
              </span>
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-primary-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Use <strong>Acesso</strong> para convidar membros
              </span>
            </div>
          </div>
        </div>
        <button @click="showHelp = false" class="p-1 text-primary-400 hover:text-primary-600 transition-colors shrink-0" title="Fechar">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      </div>
    </ClientOnly>

    <!-- Filtro por workspace -->
    <div class="mb-5 flex flex-wrap gap-2">
      <button
        @click="selectedWorkspace = null"
        :class="[
          'px-3 py-1.5 rounded-lg text-label-sm font-medium transition-colors',
          selectedWorkspace === null
            ? 'bg-primary-600 text-white'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        ]"
      >
        Todos
      </button>
      <button
        v-for="ws in workspaces"
        :key="ws.id"
        @click="selectedWorkspace = ws.id"
        :class="[
          'px-3 py-1.5 rounded-lg text-label-sm font-medium transition-colors',
          selectedWorkspace === ws.id
            ? 'bg-primary-600 text-white'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        ]"
      >
        {{ ws.name }}
      </button>
    </div>

    <LoadingState v-if="loading" message="Carregando quadros..." />
    <ErrorState v-else-if="error" :message="error" @retry="loadBoards" />

    <EmptyState
      v-else-if="filteredBoards.length === 0"
      title="Nenhum quadro encontrado"
      description="Crie seu primeiro quadro para começar a organizar tarefas."
    >
      <BaseButton variant="primary" @click="showCreateModal = true">
        Criar primeiro quadro
      </BaseButton>
    </EmptyState>

    <!-- Canvas de boards com posicionamento e dimensionamento livre -->
    <div v-else class="relative p-1" style="min-height: calc(100vh - 200px);">
      <div
        v-for="board in filteredBoards"
        :key="board.id"
        :style="{
          position: 'absolute',
          left: `${board.position?.x ?? 0}px`,
          top: `${board.position?.y ?? 0}px`,
          width: `${board.position?.width ?? 280}px`,
          height: `${board.position?.height ?? 220}px`,
          zIndex: board.position?.zIndex || 1
        }"
        :class="[
          'board-card-container group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer select-none touch-action-none flex flex-col justify-between',
          isDragging === board.id && 'dragging',
          isResizing === board.id && 'resizing'
        ]"
        @mousedown="startDrag($event, board)"
        @touchstart="startDrag($event, board)"
        @click="handleBoardClick(board.id)"
      >
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <!-- Cover -->
            <div
              class="h-16 flex items-center justify-center shrink-0"
              :style="`background: ${board.cover_color || '#6366f1'}`"
            >
              <svg class="w-7 h-7 text-white/70" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>

            <!-- Info -->
            <div class="p-3.5">
              <div class="flex items-start justify-between gap-2 mb-1">
                <h3 class="text-xs font-bold text-neutral-900 group-hover:text-primary-600 transition-colors truncate">
                  {{ board.name }}
                </h3>
                <span class="shrink-0 px-1.5 py-0.5 text-[9px] font-semibold rounded-full" :class="boardTypeClass(board.board_type)">
                  {{ boardTypeLabel(board.board_type) }}
                </span>
              </div>
              <p v-if="board.description" class="text-[10px] text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
                {{ board.description }}
              </p>
            </div>
          </div>

          <div class="p-3.5 pt-0 mt-auto">
            <div class="flex items-center justify-between text-[9px] text-neutral-400">
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {{ visibilityLabel(board.visibility) }}
              </span>
              <span>{{ formatDate(board.created_at) }}</span>
            </div>

            <!-- Botões master -->
            <div v-if="isMaster" class="mt-2.5 pt-2.5 border-t border-neutral-100 flex gap-2">
              <button
                @click.stop="managingBoardId = board.id"
                class="flex-1 flex items-center justify-center gap-1 text-[10px] text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Acesso
              </button>
              <button
                @click.stop="savingAsTemplate = board.id"
                class="flex-1 flex items-center justify-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-600 font-semibold transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Template
              </button>
              <button
                @click.stop="deletingBoardId = board.id"
                class="flex items-center justify-center gap-1 px-1.5 text-red-500 hover:text-red-600 transition-colors"
                title="Excluir quadro"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Alça de redimensionamento -->
        <div
          class="resize-handle resize-se"
          @mousedown.stop="startResize($event, board, 'se')"
          @touchstart.stop="startResize($event, board, 'se')"
        ></div>
      </div>
    </div>

    <!-- Modal acesso -->
    <BaseModal v-model="showGuestModal" title="Gerenciar acesso ao quadro" size="md">
      <BoardGuestManager
        v-if="managingBoardId"
        :board-id="managingBoardId"
        :can-manage="isMaster"
        :org-users="orgUsers"
        @retry="() => {}"
      />
    </BaseModal>

    <!-- Modal template -->
    <BaseModal v-model="showSaveTemplateModal" title="Salvar como template" size="md">
      <form @submit.prevent="handleSaveAsTemplate" class="space-y-4">
        <BaseInput v-model="templateForm.name" label="Nome do template" placeholder="Ex: Quadro de Vendas Padrão" required :error="formErrors.template_name" />
        <div>
          <label class="text-label-md text-default block mb-1.5">Descrição <span class="text-muted">(opcional)</span></label>
          <textarea v-model="templateForm.description" rows="2" placeholder="Descreva quando usar este template..." class="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-body-sm text-strong placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all resize-none" />
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="is-public" v-model="templateForm.is_public" class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500" />
          <label for="is-public" class="text-body-sm text-default cursor-pointer">Tornar público para toda a organização</label>
        </div>
        <div class="flex gap-3 justify-end pt-2">
          <BaseButton type="button" variant="ghost" @click="showSaveTemplateModal = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary">Salvar template</BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Modal de confirmação de exclusão -->
    <BaseModal v-model="showDeleteModal" title="Excluir quadro?" size="sm">
      <div class="space-y-4">
        <p class="text-body-sm text-default">
          Tem certeza que deseja excluir o quadro <span class="font-semibold">"{{ boards.find(b => b.id === deletingBoardId)?.name }}"</span>?
        </p>
        <p class="text-body-sm text-muted">
          Esta ação não pode ser desfeita. Todas as tarefas, grupos e dados relacionados serão permanentemente removidos.
        </p>
      </div>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="ghost" @click="showDeleteModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" @click="handleDeleteBoard" :disabled="loading">
            {{ loading ? 'Excluindo...' : 'Excluir quadro' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal criar quadro -->
    <BaseModal v-model="showCreateModal" title="Novo quadro" size="md">
      <form @submit.prevent="handleCreate" class="space-y-4">
        <div v-if="templates.length > 0" class="flex items-center gap-2">
          <input type="checkbox" id="from-template" v-model="form.from_template" class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500" />
          <label for="from-template" class="text-body-sm text-default cursor-pointer">Criar a partir de um template</label>
        </div>
        <BaseSelect v-if="form.from_template" v-model="form.template_id" label="Template" :options="templateOptions" placeholder="Selecione um template..." />
        <BaseInput v-model="form.name" label="Nome do quadro" placeholder="Ex: Comercial, Produção, Expedição" required :error="formErrors.name" />
        <div>
          <label class="text-label-md text-default block mb-1.5">Descrição <span class="text-muted">(opcional)</span></label>
          <textarea v-model="form.description" rows="2" placeholder="Descreva o objetivo deste quadro..." class="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-body-sm text-strong placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all resize-none" />
        </div>
        <BaseSelect v-model="form.workspace_id" label="Área de trabalho" :options="workspaceOptions" :error="formErrors.workspace_id" />
        <div v-if="!form.from_template" class="grid grid-cols-2 gap-3">
          <BaseSelect v-model="form.board_type" label="Tipo" :options="boardTypeOptions" />
          <BaseSelect v-model="form.visibility" label="Visibilidade" :options="visibilityOptions" />
        </div>
        <div v-if="!form.from_template">
          <label class="text-label-md text-default block mb-2">Cor de capa</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="color in coverColors" :key="color" type="button" @click="form.cover_color = color" class="w-8 h-8 rounded-lg border-2 transition-all" :style="`background: ${color}`" :class="form.cover_color === color ? 'border-neutral-900 scale-110' : 'border-transparent'" />
          </div>
        </div>
        <div v-if="formErrors.general" class="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3">
          <p class="text-body-sm text-danger-700">{{ formErrors.general }}</p>
        </div>
        <div class="flex gap-3 justify-end pt-2">
          <BaseButton type="button" variant="ghost" @click="showCreateModal = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :disabled="loading">{{ loading ? 'Criando...' : 'Criar quadro' }}</BaseButton>
        </div>
      </form>
    </BaseModal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { navigateTo } from '#imports'
import { useBoards } from '~/composables/useBoards'
import { useWorkspaces } from '~/composables/useWorkspaces'
import { useBoardGuests } from '~/composables/useBoardGuests'
import { useBoardTemplates } from '~/composables/useBoardTemplates'
import { useAuth } from '~/composables/useAuth'
import type { Database } from '#shared/types/database'
import Sortable from 'sortablejs'

const { boards, loading, error, fetchBoards, createBoard, deleteBoard } = useBoards()
const { workspaces, fetchWorkspaces } = useWorkspaces()
const { orgUsers, fetchOrgUsers } = useBoardGuests()
const { templates, fetchTemplates, saveAsTemplate, createFromTemplate } = useBoardTemplates()
const { isMaster } = useAuth()

const showCreateModal = ref(false)
const selectedWorkspace = ref<string | null>(null)
const managingBoardId = ref<string | null>(null)
const savingAsTemplate = ref<string | null>(null)
const deletingBoardId = ref<string | null>(null)
const showHelp = ref(true)
const boardsGridRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

const showGuestModal = computed({
  get: () => managingBoardId.value !== null,
  set: (v) => { if (!v) managingBoardId.value = null }
})
const showSaveTemplateModal = computed({
  get: () => savingAsTemplate.value !== null,
  set: (v) => { if (!v) savingAsTemplate.value = null }
})
const showDeleteModal = computed({
  get: () => deletingBoardId.value !== null,
  set: (v) => { if (!v) deletingBoardId.value = null }
})

const form = ref({
  name: '', description: '', workspace_id: '',
  board_type: 'kanban' as Database['public']['Enums']['board_type'],
  visibility: 'org' as Database['public']['Enums']['visibility_type'],
  cover_color: '#6366f1', from_template: false, template_id: ''
})
const templateForm = ref({ name: '', description: '', is_public: false })
const formErrors = ref<{ name: string; workspace_id: string; general: string; template_name: string }>({ name: '', workspace_id: '', general: '', template_name: '' })

const coverColors = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#06b6d4','#0ea5e9','#64748b','#1e293b']
const boardTypeOptions = [{ value: 'kanban', label: 'Kanban' },{ value: 'scrum', label: 'Scrum' },{ value: 'list', label: 'Lista' }]
const visibilityOptions = [{ value: 'org', label: 'Organização' },{ value: 'private', label: 'Privado' }]

const workspaceOptions = computed(() => workspaces.value.map(ws => ({ value: ws.id, label: ws.name })))
const templateOptions = computed(() => templates.value.map((t: { id: string; name: string }) => ({ value: t.id, label: t.name })))
const filteredBoards = computed(() => selectedWorkspace.value ? boards.value.filter(b => b.workspace_id === selectedWorkspace.value) : boards.value)

function boardTypeLabel(type: string) { return { kanban: 'Kanban', scrum: 'Scrum', list: 'Lista' }[type] ?? type }
function boardTypeClass(type: string) { return { kanban: 'bg-indigo-100 text-indigo-700', scrum: 'bg-purple-100 text-purple-700', list: 'bg-neutral-100 text-neutral-600' }[type] ?? 'bg-neutral-100 text-neutral-600' }
function visibilityLabel(v: string) { return { org: 'Organização', private: 'Privado', public: 'Público' }[v] ?? v }
function formatDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }

function validate() {
  formErrors.value = { name: '', workspace_id: '', general: '', template_name: '' }
  let ok = true
  if (!form.value.name.trim()) { formErrors.value.name = 'Nome obrigatório.'; ok = false }
  if (!form.value.workspace_id) { formErrors.value.workspace_id = 'Selecione uma área.'; ok = false }
  return ok
}

async function handleCreate() {
  if (!validate()) return
  let result: any = null
  if (form.value.from_template && form.value.template_id) {
    const boardId = await createFromTemplate({ templateId: form.value.template_id, name: form.value.name.trim(), description: form.value.description.trim() || undefined, workspaceId: form.value.workspace_id, visibility: form.value.visibility })
    result = !!boardId
  } else {
    result = await createBoard({ name: form.value.name.trim(), description: form.value.description.trim() || undefined, workspace_id: form.value.workspace_id, board_type: form.value.board_type, visibility: form.value.visibility, cover_color: form.value.cover_color })
  }
  if (result) {
    showCreateModal.value = false
    form.value = { name: '', description: '', workspace_id: '', board_type: 'kanban', visibility: 'org', cover_color: '#6366f1', from_template: false, template_id: '' }
  } else {
    formErrors.value.general = 'Erro ao criar quadro. Tente novamente.'
  }
}

async function handleSaveAsTemplate() {
  if (!savingAsTemplate.value) return
  if (!templateForm.value.name.trim()) { formErrors.value.template_name = 'Nome obrigatório.'; return }
  const ok = await saveAsTemplate({ boardId: savingAsTemplate.value, name: templateForm.value.name.trim(), description: templateForm.value.description.trim() || undefined, isPublic: templateForm.value.is_public })
  if (ok) { savingAsTemplate.value = null; templateForm.value = { name: '', description: '', is_public: false }; formErrors.value.template_name = '' }
  else { formErrors.value.template_name = 'Erro ao salvar template.' }
}

async function handleDeleteBoard() {
  if (!deletingBoardId.value) return
  
  const success = await deleteBoard(deletingBoardId.value)
  
  if (success) {
    deletingBoardId.value = null
  } else {
    formErrors.value.general = 'Erro ao excluir quadro. Tente novamente.'
  }
}

async function loadBoards() { await fetchBoards() }

function initSortable() {
  if (!boardsGridRef.value || sortableInstance) return
  
  sortableInstance = new Sortable(boardsGridRef.value, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'opacity-50',
    dragClass: 'shadow-2xl',
    chosenClass: 'ring-2 ring-primary-500',
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        // Reordenar array local
        const movedBoard = filteredBoards.value[oldIndex]
        
        // Aqui você pode salvar a nova ordem no banco de dados se necessário
        // Por enquanto, apenas reordena localmente
      }
    }
  })
}

const isDragging = ref<string | null>(null)
const isResizing = ref<string | null>(null)
const dragStart = ref({ x: 0, y: 0, widgetX: 0, widgetY: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })
let dragDistance = 0
let activeElement: HTMLElement | null = null
let activeResizeElement: HTMLElement | null = null

// Watch when boards value changes, to load or initialize their positions
watch(boards, (newBoards) => {
  if (!newBoards) return
  
  // Carregar posições do localStorage
  let savedPositions: Record<string, any> = {}
  try {
    const saved = localStorage.getItem('boards-catalog-positions')
    if (saved) savedPositions = JSON.parse(saved)
  } catch (e) {
    console.error('Error loading board positions:', e)
  }

  const colWidth = 280
  const rowHeight = 220
  const gap = 16
  const cols = 4

  newBoards.forEach((board: any, idx: number) => {
    if (!board.position) {
      if (savedPositions[board.id]) {
        board.position = { ...savedPositions[board.id] }
      } else {
        const colIndex = idx % cols
        const rowIndex = Math.floor(idx / cols)
        board.position = {
          x: colIndex * (colWidth + gap),
          y: rowIndex * (rowHeight + gap),
          width: colWidth,
          height: rowHeight,
          zIndex: 1
        }
      }
    }
  })
}, { immediate: true })

function saveBoardPositions() {
  const positions: Record<string, any> = {}
  boards.value.forEach((board: any) => {
    if (board.position) {
      positions[board.id] = { ...board.position }
    }
  })
  localStorage.setItem('boards-catalog-positions', JSON.stringify(positions))
}

function startDrag(event: MouseEvent | TouchEvent, board: any) {
  const target = (event.currentTarget || event.target) as HTMLElement
  if (!target) return

  const clickTarget = event.target as HTMLElement
  if (clickTarget.closest('button') || clickTarget.closest('.resize-handle')) return

  isDragging.value = board.id
  activeElement = target

  target.style.transition = 'none'
  target.style.zIndex = '1000'
  dragDistance = 0

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  dragStart.value = { x: clientX, y: clientY, widgetX: board.position?.x ?? 0, widgetY: board.position?.y ?? 0 }

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

function onDragMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value || !activeElement) return

  if (event.cancelable) {
    event.preventDefault()
  }

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  const dx = clientX - dragStart.value.x
  const dy = clientY - dragStart.value.y
  dragDistance += Math.sqrt(dx * dx + dy * dy)

  const newX = Math.max(0, dragStart.value.widgetX + dx)
  const newY = Math.max(0, dragStart.value.widgetY + dy)

  activeElement.style.left = `${newX}px`
  activeElement.style.top = `${newY}px`
}

function onDragEnd() {
  if (isDragging.value && activeElement) {
    const board = boards.value.find(b => b.id === isDragging.value) as any
    if (board && board.position) {
      const leftVal = parseFloat(activeElement.style.left)
      const topVal = parseFloat(activeElement.style.top)
      board.position.x = leftVal
      board.position.y = topVal
      board.position.zIndex = 1
    }
    activeElement.style.transition = ''
    activeElement.style.zIndex = ''
  }
  isDragging.value = null
  activeElement = null
  saveBoardPositions()
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
}

function startResize(event: MouseEvent | TouchEvent, board: any, _direction = 'se') {
  event.preventDefault()
  event.stopPropagation()

  const parentCard = (event.target as HTMLElement).closest('.board-card-container') as HTMLElement
  if (!parentCard) return

  isResizing.value = board.id
  activeResizeElement = parentCard

  parentCard.style.transition = 'none'
  parentCard.style.zIndex = '1000'

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  resizeStart.value = { x: clientX, y: clientY, width: board.position?.width ?? 280, height: board.position?.height ?? 220 }

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.addEventListener('touchmove', onResizeMove, { passive: false })
  document.addEventListener('touchend', onResizeEnd)
}

function onResizeMove(event: MouseEvent | TouchEvent) {
  if (!isResizing.value || !activeResizeElement) return

  if (event.cancelable) {
    event.preventDefault()
  }

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  const newWidth = Math.max(200, resizeStart.value.width + clientX - resizeStart.value.x)
  const newHeight = Math.max(140, resizeStart.value.height + clientY - resizeStart.value.y)

  activeResizeElement.style.width = `${newWidth}px`
  activeResizeElement.style.height = `${newHeight}px`
}

function onResizeEnd() {
  if (isResizing.value && activeResizeElement) {
    const board = boards.value.find(b => b.id === isResizing.value) as any
    if (board && board.position) {
      const widthVal = parseFloat(activeResizeElement.style.width)
      const heightVal = parseFloat(activeResizeElement.style.height)
      board.position.width = widthVal
      board.position.height = heightVal
      board.position.zIndex = 1
    }
    activeResizeElement.style.transition = ''
    activeResizeElement.style.zIndex = ''
  }
  isResizing.value = null
  activeResizeElement = null
  saveBoardPositions()
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('touchmove', onResizeMove)
  document.removeEventListener('touchend', onResizeEnd)
}

function handleBoardClick(boardId: string) {
  if (dragDistance > 5) return
  navigateTo(`/boards/${boardId}`)
}

onMounted(async () => {
  await fetchWorkspaces()
  await fetchBoards()
  await fetchOrgUsers()
  await fetchTemplates()
  if (workspaces.value.length > 0) form.value.workspace_id = workspaces.value[0]?.id ?? ''
})
</script>

<style scoped>
.board-card-container {
  touch-action: none;
}

.board-card-container.dragging {
  cursor: grabbing;
  opacity: 0.9;
  transform: rotate(1deg) scale(1.01);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.15);
}

.board-card-container.resizing {
  cursor: nwse-resize;
}

.resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #6366f1;
  border: 2px solid white;
  border-radius: 50%;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.board-card-container:hover .resize-handle {
  opacity: 1;
}

.resize-se {
  bottom: -8px;
  right: -8px;
}

@media (max-width: 640px) {
  .resize-handle {
    width: 24px;
    height: 24px;
    opacity: 0.7;
  }
  .resize-se {
    bottom: -12px;
    right: -12px;
  }
}
</style>
