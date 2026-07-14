<template>
  <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
      <div>
        <h2 class="text-title-lg font-bold text-neutral-900 mb-1">Progresso da Equipe</h2>
        <p class="text-body-md text-neutral-500">Selecione um membro delegado para analisar suas tarefas, prazos e métricas de desempenho.</p>
      </div>

      <!-- Member Selector Dropdown -->
      <div v-if="membersList.length > 0" class="relative shrink-0">
        <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Analisar Membro</label>
        <div class="relative min-w-[240px]">
          <select
            v-model="selectedUserId"
            class="w-full text-sm font-medium border border-neutral-200 rounded-xl pl-3 pr-10 py-2.5 bg-white hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500 transition-all cursor-pointer appearance-none min-h-[44px]"
            @change="handleMemberChange"
          >
            <optgroup v-if="delegatedMembers.length > 0" label="Meus Membros Delegados">
              <option 
                v-for="m in delegatedMembers" 
                :key="m.id" 
                :value="m.id"
              >
                {{ m.full_name || m.email }} ({{ m.job_title || 'Colaborador' }})
              </option>
            </optgroup>
            <optgroup label="Outros Membros da Organização">
              <option 
                v-for="m in otherMembers" 
                :key="m.id" 
                :value="m.id"
              >
                {{ m.full_name || m.email }}
              </option>
            </optgroup>
          </select>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State / No Members -->
    <div v-if="membersList.length === 0" class="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center max-w-lg mx-auto space-y-4">
      <div class="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-400 shadow-inner">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-neutral-800">Nenhum membro na organização</h3>
        <p class="text-sm text-neutral-500 mt-1">Vá para a página de gestão de membros para cadastrar colaboradores.</p>
      </div>
      <NuxtLink to="/members" class="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-white font-medium text-sm rounded-xl hover:bg-primary-600 transition-colors shadow-sm">
        Gerenciar Membros
      </NuxtLink>
    </div>

    <div v-else-if="selectedUser" class="space-y-6">
      
      <!-- Loading Member Data -->
      <LoadingState v-if="loadingData" message="Carregando métricas do membro..." />

      <div v-else class="space-y-6">
        
        <!-- Summary Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Card: Total Tasks -->
          <div class="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total de Tarefas</p>
              <h3 class="text-3xl font-extrabold text-neutral-800 leading-none">{{ totalTasks }}</h3>
              <p class="text-xs text-neutral-400">tarefas ativas atribuídas</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>

          <!-- Card: Completed Tasks -->
          <div class="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Concluídas</p>
              <h3 class="text-3xl font-extrabold text-emerald-600 leading-none">{{ completedTasks }}</h3>
              <p class="text-xs text-emerald-500 font-medium">taxa de {{ donePercent }}% concluído</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <!-- Card: Overdue Tasks -->
          <div class="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Atrasadas</p>
              <h3 class="text-3xl font-extrabold" :class="overdueTasks > 0 ? 'text-rose-600' : 'text-neutral-800'">{{ overdueTasks }}</h3>
              <p class="text-xs font-medium" :class="overdueTasks > 0 ? 'text-rose-500 animate-pulse' : 'text-neutral-400'">
                {{ overdueTasks > 0 ? 'requer atenção urgente' : 'tudo dentro do prazo' }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <!-- Card: General Performance -->
          <div class="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Pendentes</p>
              <h3 class="text-3xl font-extrabold text-neutral-800 leading-none">{{ activeTasks }}</h3>
              <p class="text-xs text-neutral-400">{{ noDeadlineTasks }} sem prazo definido</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

        </div>

        <!-- Dashboard Charts & Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Left Column: Battery progress and status breakdown -->
          <div class="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
            <div>
              <h3 class="text-body-md font-bold text-neutral-800">Visualização de Progresso</h3>
              <p class="text-xs text-neutral-400 mt-0.5">Bateria de status de conclusão de tarefas</p>
            </div>

            <!-- Battery Progress Indicator -->
            <div class="flex items-center w-full my-4">
              <div class="flex-1 flex h-10 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 p-0.5 relative shadow-sm">
                <template v-if="totalTasks > 0">
                  <div
                    v-for="(status, index) in statusesWithPercentages"
                    :key="status.statusId"
                    class="h-full transition-all duration-500 relative group border-r border-white/20 last:border-r-0"
                    :style="{
                      width: `${status.percent}%`,
                      backgroundColor: status.color || '#94a3b8'
                    }"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-900 text-white text-xs py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap z-20 transition-all">
                      <span class="font-semibold">{{ status.statusName }}</span>: {{ status.count }} ({{ status.percent }}%)
                      <div class="w-2 h-2 bg-neutral-900 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
                    </div>
                  </div>
                </template>
                <div v-else class="flex-1 flex items-center justify-center text-xs text-neutral-400 font-medium">
                  Nenhuma tarefa ativa
                </div>
              </div>
              <div class="w-1.5 h-6 bg-neutral-300 rounded-r-md shrink-0 border-y border-r border-neutral-200 -ml-px shadow-sm"></div>
            </div>

            <!-- Status Breakdown Legend -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Detalhamento de Status</h4>
              <div class="divide-y divide-neutral-50 max-h-[220px] overflow-y-auto pr-1">
                <div
                  v-for="status in statusesWithPercentages"
                  :key="status.statusId"
                  class="flex items-center justify-between text-xs py-2"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: status.color || '#cbd5e1' }" />
                    <span class="font-medium text-neutral-700 truncate">{{ status.statusName }}</span>
                  </div>
                  <div class="flex items-center gap-3 text-neutral-500 shrink-0">
                    <span>{{ status.count }} {{ status.count === 1 ? 'tarefa' : 'tarefas' }}</span>
                    <span class="w-10 text-right text-neutral-400">{{ status.percent }}%</span>
                  </div>
                </div>
                <div v-if="statusesWithPercentages.length === 0" class="text-center py-4 text-xs text-neutral-400 italic">
                  Sem dados de status.
                </div>
              </div>
            </div>

            <!-- Priority Breakdown -->
            <div class="space-y-2 pt-4 border-t border-neutral-100">
              <h4 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Distribuição por Prioridade</h4>
              <div class="grid grid-cols-3 gap-2">
                <div 
                  v-for="priority in priorityBreakdown" 
                  :key="priority.name"
                  class="bg-neutral-50 rounded-xl p-2.5 text-center border border-neutral-100 hover:shadow-sm transition-shadow"
                >
                  <div class="flex items-center justify-center gap-1.5 mb-1">
                    <div class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: priority.color }" />
                    <span class="text-[11px] font-medium text-neutral-500 truncate">{{ priority.name }}</span>
                  </div>
                  <span class="text-lg font-bold text-neutral-800">{{ priority.count }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Right Column (Span 2): Active tasks lists with tabs -->
          <div class="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 shadow-sm flex flex-col min-h-[480px]">
            
            <!-- Tabs and Header -->
            <div class="px-6 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
              <div>
                <h3 class="text-body-md font-bold text-neutral-800">Lista de Tarefas</h3>
                <p class="text-xs text-neutral-400 mt-0.5">Clique em qualquer tarefa para abrir os detalhes e editá-la.</p>
              </div>

              <!-- Tab selector -->
              <div class="flex bg-neutral-100 p-1 rounded-xl shrink-0">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  :class="activeTab === tab.id ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'"
                  @click="activeTab = tab.id"
                >
                  {{ tab.label }}
                  <span 
                    class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none"
                    :class="activeTab === tab.id ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-200 text-neutral-500'"
                  >
                    {{ tab.count }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Tasks list area -->
            <div class="flex-1 overflow-y-auto max-h-[500px]">
              <div v-if="filteredTasksList.length > 0" class="divide-y divide-neutral-100">
                <div
                  v-for="task in filteredTasksList"
                  :key="task.id"
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-neutral-50/50 transition-colors group cursor-pointer"
                  @click="openTaskModal(task.id, task.board_id)"
                >
                  <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-semibold text-neutral-400 bg-neutral-50 border border-neutral-100 px-2 py-0.5 rounded-lg">
                        {{ task.boards?.name || 'Quadro' }}
                      </span>
                      <!-- Overdue badge -->
                      <span 
                        v-if="isTaskOverdue(task)" 
                        class="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse"
                      >
                        Atrasada
                      </span>
                    </div>
                    <h4 class="text-sm font-medium text-neutral-800 group-hover:text-primary-600 transition-colors truncate">
                      {{ task.title }}
                    </h4>
                  </div>

                  <!-- Right side: Badges and Date -->
                  <div class="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                    <!-- Priority -->
                    <span 
                      v-if="task.task_priorities"
                      class="px-2 py-0.5 rounded-lg text-xs font-medium border"
                      :style="{
                        color: task.task_priorities.color,
                        borderColor: `${task.task_priorities.color}20`,
                        backgroundColor: `${task.task_priorities.color}08`
                      }"
                    >
                      {{ task.task_priorities.name }}
                    </span>

                    <!-- Status -->
                    <span 
                      v-if="task.task_statuses"
                      class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      :style="{
                        color: task.task_statuses.color,
                        backgroundColor: `${task.task_statuses.color}15`
                      }"
                    >
                      {{ task.task_statuses.name }}
                    </span>

                    <!-- Due date -->
                    <div class="flex items-center gap-1 text-xs text-neutral-400 font-medium">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span :class="{ 'text-rose-600 font-semibold': isTaskOverdue(task) }">
                        {{ task.due_date ? formatDate(task.due_date) : 'Sem prazo' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state for specific tab -->
              <div v-else class="h-full flex flex-col items-center justify-center p-12 text-center space-y-2">
                <div class="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-300">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 class="text-sm font-semibold text-neutral-700">Nenhuma tarefa nesta categoria</h4>
                <p class="text-xs text-neutral-400">O colaborador não possui tarefas que correspondam a este filtro.</p>
              </div>
            </div>

            <!-- Board Participation Breakdown footer -->
            <div class="px-6 py-3 bg-neutral-50/50 border-t border-neutral-100 rounded-b-2xl flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span>Distribuído em {{ boardBreakdown.length }} quadro(s)</span>
              <div class="flex gap-2">
                <span 
                  v-for="b in boardBreakdown.slice(0, 3)" 
                  :key="b.name"
                  class="bg-white border border-neutral-200 rounded px-1.5 py-0.5 shadow-sm truncate max-w-[120px]"
                >
                  {{ b.name }} ({{ b.count }})
                </span>
                <span v-if="boardBreakdown.length > 3" class="text-neutral-400">
                  +{{ boardBreakdown.length - 3 }} mais
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>

    <!-- Task Detail Modal Wrapper -->
    <TaskModal
      v-if="selectedTaskId"
      v-model="showTaskModal"
      :task-id="selectedTaskId"
      :board-id="selectedTaskBoardId"
      @updated="handleTaskUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import LoadingState from '~/components/LoadingState.vue'
import TaskModal from '~/components/TaskModal.vue'

definePageMeta({
  layout: 'default',
  middleware: ['master-only']
})

const { user: currentUser } = useAuth()
const supabase = useNuxtApp().$supabase as any

const membersList = ref<any[]>([])
const delegatedMembers = ref<any[]>([])
const otherMembers = ref<any[]>([])
const selectedUserId = ref<string>('')
const loadingData = ref(false)

// Task and Metrics State
const selectedUserTasks = ref<any[]>([])
const activeTab = ref<'active' | 'overdue' | 'completed'>('active')

// Modal State
const showTaskModal = ref(false)
const selectedTaskId = ref<string | null>(null)
const selectedTaskBoardId = ref<string>('')

// Load Members
onMounted(async () => {
  if (!currentUser.value) return
  await fetchMembersAndDelegates()
  
  // Se veio ID do membro na URL, selecionar ele
  const route = useRoute()
  if (route.query.userId && typeof route.query.userId === 'string') {
    selectedUserId.value = route.query.userId
  } else if (membersList.value.length > 0) {
    // Caso contrário, pegar o primeiro membro da lista de delegados (ou da organização)
    selectedUserId.value = delegatedMembers.value[0]?.id || membersList.value[0]?.id || ''
  }

  if (selectedUserId.value) {
    await fetchMemberData()
  }
})

// Fetch all members & delegation relationships
async function fetchMembersAndDelegates() {
  try {
    // 1. Carregar todos os perfis da organização
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role_global, status, job_title')
      .order('full_name')

    if (profilesError) throw profilesError

    // 2. Carregar relações de delegação para o usuário atual
    const { data: relations, error: relationsError } = await supabase
      .from('user_managed_users')
      .select('managed_user_id')
      .eq('master_user_id', currentUser.value?.id)

    if (relationsError) throw relationsError

    const delegatedIds = new Set((relations || []).map((r: any) => r.managed_user_id))

    // Separar delegados e outros membros
    delegatedMembers.value = (allProfiles || []).filter((p: any) => delegatedIds.has(p.id))
    otherMembers.value = (allProfiles || []).filter((p: any) => !delegatedIds.has(p.id) && p.id !== currentUser.value?.id)
    membersList.value = (allProfiles || []).filter((p: any) => p.id !== currentUser.value?.id)
  } catch (err) {
    console.error('[dashboards/members] Error listing members:', err)
  }
}

// Fetch selected member's tasks
async function fetchMemberData() {
  if (!selectedUserId.value) return
  loadingData.value = true
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        start_date,
        budget,
        notes,
        status_id,
        priority_id,
        board_id,
        boards (id, name),
        task_statuses (id, name, color, is_done),
        task_priorities (id, name, color),
        task_assignees!inner (user_id)
      `)
      .eq('task_assignees.user_id', selectedUserId.value)
      .is('archived_at', null)

    if (error) throw error
    selectedUserTasks.value = data || []
  } catch (err) {
    console.error('[dashboards/members] Error loading member tasks:', err)
  } finally {
    loadingData.value = false
  }
}

function handleMemberChange() {
  fetchMemberData()
}

// Computeds for metrics
const selectedUser = computed(() => 
  membersList.value.find(m => m.id === selectedUserId.value) || null
)

const totalTasks = computed(() => selectedUserTasks.value.length)

const completedTasks = computed(() => 
  selectedUserTasks.value.filter(t => t.task_statuses?.is_done).length
)

const activeTasks = computed(() => 
  selectedUserTasks.value.filter(t => !t.task_statuses?.is_done).length
)

const overdueTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return selectedUserTasks.value.filter(t => 
    !t.task_statuses?.is_done && 
    t.due_date && 
    t.due_date < today
  ).length
})

const noDeadlineTasks = computed(() => 
  selectedUserTasks.value.filter(t => !t.task_statuses?.is_done && !t.due_date).length
)

const donePercent = computed(() => 
  totalTasks.value > 0 ? Math.round((completedTasks.value / totalTasks.value) * 100) : 0
)

const isTaskOverdue = (task: any) => {
  if (task.task_statuses?.is_done || !task.due_date) return false
  const today = new Date().toISOString().split('T')[0]
  return task.due_date < today
}

// Status Breakdown
const statusesWithPercentages = computed(() => {
  if (totalTasks.value === 0) return []
  
  // Contar por status
  const counts: Record<string, { name: string; color: string; is_done: boolean; count: number }> = {}
  
  selectedUserTasks.value.forEach(t => {
    const s = t.task_statuses
    if (!s) return
    if (!counts[s.id]) {
      counts[s.id] = { name: s.name, color: s.color, is_done: s.is_done, count: 0 }
    }
    counts[s.id].count++
  })

  return Object.entries(counts).map(([id, s]) => ({
    statusId: id,
    statusName: s.name,
    color: s.color,
    isDone: s.is_done,
    count: s.count,
    percent: Math.round((s.count / totalTasks.value) * 100)
  })).sort((a, b) => b.count - a.count)
})

// Priority breakdown
const priorityBreakdown = computed(() => {
  const priorities = [
    { name: 'Alta', color: '#f43f5e', count: 0 },
    { name: 'Média', color: '#f59e0b', count: 0 },
    { name: 'Baixa', color: '#10b981', count: 0 },
    { name: 'Sem prioridade', color: '#94a3b8', count: 0 }
  ]

  selectedUserTasks.value.forEach(t => {
    const p = t.task_priorities?.name?.toLowerCase()
    if (p === 'alta' || p === 'high') priorities[0].count++
    else if (p === 'média' || p === 'media' || p === 'medium') priorities[1].count++
    else if (p === 'baixa' || p === 'low') priorities[2].count++
    else priorities[3].count++
  })

  return priorities
})

// Board participation breakdown
const boardBreakdown = computed(() => {
  const boardCounts: Record<string, number> = {}
  selectedUserTasks.value.forEach(t => {
    const bName = t.boards?.name
    if (!bName) return
    boardCounts[bName] = (boardCounts[bName] || 0) + 1
  })

  return Object.entries(boardCounts).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count)
})

// Tab counters
const tabs = computed(() => [
  { id: 'active', label: 'Ativas', count: activeTasks.value },
  { id: 'overdue', label: 'Atrasadas', count: overdueTasks.value },
  { id: 'completed', label: 'Concluídas', count: completedTasks.value }
])

// Filtered tasks for list
const filteredTasksList = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  if (activeTab.value === 'completed') {
    return selectedUserTasks.value.filter(t => t.task_statuses?.is_done)
  }
  if (activeTab.value === 'overdue') {
    return selectedUserTasks.value.filter(t => !t.task_statuses?.is_done && t.due_date && t.due_date < today)
  }
  // 'active' (includes overdue tasks too, but shows active pending)
  return selectedUserTasks.value.filter(t => !t.task_statuses?.is_done)
})

// Task modal helper
function openTaskModal(taskId: string, boardId: string) {
  selectedTaskId.value = taskId
  selectedTaskBoardId.value = boardId
  showTaskModal.value = true
}

function handleTaskUpdated() {
  fetchMemberData()
}

// Helpers
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year.slice(2)}`
}
</script>
