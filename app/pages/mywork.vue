<template>
  <div class="min-h-screen bg-neutral-50 p-6">
    <div class="max-w-7xl mx-auto">

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">Meu Trabalho</h1>
        <p class="text-neutral-600">Tarefas que você concluiu</p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
          <p class="text-sm text-neutral-500 mb-1">Total concluídas</p>
          <p class="text-3xl font-bold text-green-600">{{ tasks.length }}</p>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
          <p class="text-sm text-neutral-500 mb-1">Orçamento total</p>
          <p class="text-2xl font-bold text-green-600">{{ formatCurrency(totalBudget) }}</p>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
          <p class="text-sm text-neutral-500 mb-1">Boards diferentes</p>
          <p class="text-3xl font-bold text-[#1C325C]">{{ uniqueBoards }}</p>
        </div>
      </div>

      <!-- Tabela -->
      <div class="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-neutral-900">Tarefas Concluídas</h2>
          <span class="text-sm text-neutral-500">{{ tasks.length }} tarefa{{ tasks.length !== 1 ? 's' : '' }}</span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
          <div class="w-8 h-8 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
        </div>

        <!-- Empty -->
        <div v-else-if="tasks.length === 0" class="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-neutral-500 text-lg mb-1">Nenhuma tarefa concluída ainda</p>
          <p class="text-neutral-400 text-sm">Quando você concluir tarefas, elas aparecerão aqui</p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tarefa</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Board</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Prioridade</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Prazo</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Orçamento</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-neutral-100">
              <tr v-for="task in tasks" :key="task.id" class="hover:bg-neutral-50 transition-colors">
                <!-- Tarefa -->
                <td class="px-6 py-4">
                  <p class="text-sm font-medium text-neutral-900">{{ task.title }}</p>
                  <p v-if="task.description" class="text-xs text-neutral-400 mt-0.5 line-clamp-1">{{ task.description }}</p>
                </td>

                <!-- Board -->
                <td class="px-6 py-4">
                  <NuxtLink :to="`/boards/${task.board_id}`" class="text-sm text-primary-600 hover:underline">
                    {{ task.board?.name || '—' }}
                  </NuxtLink>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white"
                    :style="{ backgroundColor: task.status?.color || '#22c55e' }"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    {{ task.status?.name || 'Concluído' }}
                  </span>
                </td>

                <!-- Prioridade -->
                <td class="px-6 py-4">
                  <span
                    v-if="task.priority"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                    :style="{ backgroundColor: task.priority.color }"
                  >
                    {{ task.priority.name }}
                  </span>
                  <span v-else class="text-xs text-neutral-400 italic">—</span>
                </td>

                <!-- Prazo -->
                <td class="px-6 py-4">
                  <span v-if="task.due_date" class="text-sm text-neutral-600">{{ formatDate(task.due_date) }}</span>
                  <span v-else class="text-xs text-neutral-400 italic">Sem prazo</span>
                </td>

                <!-- Orçamento -->
                <td class="px-6 py-4">
                  <span v-if="task.budget" class="text-sm font-medium text-green-600">{{ formatCurrency(task.budget) }}</span>
                  <span v-else class="text-xs text-neutral-400 italic">—</span>
                </td>

                <!-- Ações -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center px-3 py-1.5 border border-[#1C325C] rounded-lg text-xs font-medium text-[#1C325C] bg-white hover:bg-[#1C325C] hover:text-white transition-colors"
                      @click="openModal(task)"
                    >
                      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Ver
                    </button>
                    <NuxtLink
                      :to="`/boards/${task.board_id}`"
                      class="inline-flex items-center px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-600 bg-white hover:bg-neutral-50 transition-colors"
                    >
                      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Board
                    </NuxtLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- TaskModal -->
  <TaskModal
    v-if="selectedTask"
    v-model="showModal"
    :task-id="selectedTask.id"
    :board-id="selectedTask.board_id"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const supabase = useNuxtApp().$supabase as any
const { user } = useAuth()

const tasks = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const selectedTask = ref<{ id: string; board_id: string } | null>(null)

const totalBudget = computed(() => tasks.value.reduce((s, t) => s + (t.budget || 0), 0))
const uniqueBoards = computed(() => new Set(tasks.value.map(t => t.board_id)).size)

async function fetchCompletedTasks() {
  if (!user.value) return
  loading.value = true

  try {
    // Buscar tarefas criadas pelo usuário com status is_done = true
    const { data: created } = await supabase
      .from('tasks')
      .select(`
        *,
        board:boards!inner(id, name),
        priority:task_priorities(id, name, color),
        status:task_statuses!inner(id, name, color, is_done),
        task_assignees(user_id)
      `)
      .eq('created_by', user.value.id)
      .eq('status.is_done', true)
      .is('archived_at', null)

    // Buscar tarefas onde é responsável com status is_done = true
    const { data: assigned } = await supabase
      .from('tasks')
      .select(`
        *,
        board:boards!inner(id, name),
        priority:task_priorities(id, name, color),
        status:task_statuses!inner(id, name, color, is_done),
        task_assignees!inner(user_id)
      `)
      .eq('task_assignees.user_id', user.value.id)
      .eq('status.is_done', true)
      .is('archived_at', null)

    // Combinar e deduplicar
    const all = [...(created || []), ...(assigned || [])]
    const unique = Array.from(new Map(all.map(t => [t.id, t])).values())

    // Filtrar apenas as que realmente têm is_done = true (o filtro do Supabase pode não funcionar em joins)
    tasks.value = unique
      .filter(t => t.status?.is_done === true)
      .sort((a, b) => {
        // Ordenar por data de atualização (mais recentes primeiro)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
  } catch (e) {
    console.error('[mywork] Erro ao carregar tarefas:', e)
  } finally {
    loading.value = false
  }
}

function openModal(task: any) {
  selectedTask.value = { id: task.id, board_id: task.board_id }
  showModal.value = true
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

onMounted(fetchCompletedTasks)
</script>
