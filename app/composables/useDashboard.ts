import { computed, onUnmounted, ref } from 'vue'
import { useNuxtApp } from '#app'
import { defaultDashboardFilters, defaultDashboardSettings, filterDashboardTasks, localDateKey, summarizeDashboard } from '../utils/dashboard'
import type { DashboardTask } from '../utils/dashboard'

export function useDashboard() {
  const supabase = useNuxtApp().$supabase as any
  const connectedBoards = ref<string[]>([])
  const filters = ref(defaultDashboardFilters())
  const settings = ref(defaultDashboardSettings())
  const tasks = ref<DashboardTask[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const today = ref(localDateKey())
  let requestVersion = 0
  onUnmounted(() => { requestVersion++ })

  const filterByPeople = computed({ get: () => filters.value.people, set: (value: string[]) => { filters.value.people = value } })
  const filteredTasks = computed(() => filterDashboardTasks(tasks.value, filters.value, today.value))
  const summary = computed(() => summarizeDashboard(filteredTasks.value, settings.value.upcomingDays, today.value))
  const availablePeople = computed(() => summarizeDashboard(tasks.value).assigneeData.sort((a, b) => a.userName.localeCompare(b.userName)))
  function options(kind: 'status' | 'priority') {
    const values = new Map<string, { id: string; name: string }>()
    for (const task of tasks.value) {
      const id = kind === 'status' ? task.status_id : task.priority_id
      values.set(id || 'none', { id: id || 'none', name: task[kind] ? `${task[kind]!.name} · ${task.boards?.name || 'Quadro'}` : kind === 'status' ? 'Sem status' : 'Sem prioridade' })
    }
    return [...values.values()].sort((a, b) => a.name.localeCompare(b.name))
  }
  const availableStatuses = computed(() => options('status'))
  const availablePriorities = computed(() => options('priority'))

  async function fetchAllDashboardData(initializeBoards = false) {
    const version = ++requestVersion
    isLoading.value = true
    error.value = ''
    try {
      if (initializeBoards) {
        const result = await supabase.from('boards').select('id').order('id').limit(10)
        if (result.error) throw result.error
        if (version !== requestVersion) return
        connectedBoards.value = (result.data || []).map((b: { id: string }) => b.id)
      }
      const boardIds = [...connectedBoards.value]
      const loaded: DashboardTask[] = []
      if (boardIds.length) {
        // Fetch every page, so counts and filters do not stop at the API row limit.
        for (let offset = 0; ; offset += 250) {
          const result = await supabase.from('tasks').select(`
            id, title, board_id, due_date, status_id, priority_id,
            boards(name), status:task_statuses(name, color, is_done), priority:task_priorities(name),
            task_assignees(user_id, profiles(full_name, avatar_url)),
            task_attachments(id, file_name, size_bytes, mime_type, created_at)
          `).in('board_id', boardIds).is('archived_at', null).order('id').range(offset, offset + 249)
          if (version !== requestVersion) return
          if (result.error) throw result.error
          const page = result.data || []
          loaded.push(...page.map((task: DashboardTask) => ({ ...task, task_assignees: task.task_assignees || [], task_attachments: task.task_attachments || [] })))
          if (page.length < 250) break
        }
      }
      if (version !== requestVersion) return
      tasks.value = loaded
      today.value = localDateKey()
    } catch {
      if (version !== requestVersion) return
      tasks.value = []
      error.value = 'Não foi possível carregar o painel. Tente novamente.'
    } finally {
      if (version === requestVersion) isLoading.value = false
    }
  }

  // Also used by the upcoming-tasks section of My Work.
  async function fetchUpcomingTasks(boardIds: string[]) {
    connectedBoards.value = [...boardIds]
    await fetchAllDashboardData()
  }

  return {
    connectedBoards, filters, settings, filterByPeople, isLoading, error,
    availablePeople, availableStatuses, availablePriorities,
    filteredTaskCount: computed(() => filteredTasks.value.length),
    statusData: computed(() => summary.value.statusData),
    assigneeData: computed(() => summary.value.assigneeData),
    overdueData: computed(() => summary.value.overdueData),
    deadlineData: computed(() => summary.value.deadlineData),
    upcomingTasks: computed(() => summary.value.upcomingTasks),
    fileCount: computed(() => summary.value.fileCount),
    recentFiles: computed(() => summary.value.recentFiles),
    fetchUpcomingTasks, fetchAllDashboardData,
  }
}
