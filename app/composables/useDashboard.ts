import { ref } from '#imports'

// ===== TIPOS =====
export interface Widget {
  id: string
  type: 'status' | 'assignee' | 'overdue' | 'deadline' | 'priority'
  title: string
  position: { x: number; y: number; w: number; h: number }
}

export interface DashboardState {
  connectedBoards: string[]
  widgets: Widget[]
  filterByPeople: string[]
  isLoading: boolean
}

export interface StatusData {
  statusName: string
  count: number
  color: string
  isDone: boolean
}

export interface AssigneeData {
  userId: string
  userName: string
  userAvatar: string | null
  taskCount: number
}

export interface OverdueTask {
  id: string
  title: string
  dueDate: string
  boardName: string
  assignees: string[]
}

export interface DeadlineTask {
  id: string
  title: string
  dueDate: string
  boardName: string
  assignees: string[]
  daysUntilDue: number
}

export interface DeadlineData {
  date: string
  count: number
}

// ===== COMPOSABLE =====
export function useDashboard() {
  const connectedBoards = ref<string[]>([])
  const widgets = ref<Widget[]>([])
  const filterByPeople = ref<string[]>([])
  const isLoading = ref(false)

  const statusData = ref<StatusData[]>([])
  const assigneeData = ref<AssigneeData[]>([])
  const overdueData = ref<OverdueTask[]>([])
  const deadlineData = ref<DeadlineData[]>([])
  // Tarefas individuais com vencimento próximo (próximos 30 dias)
  const upcomingTasks = ref<DeadlineTask[]>([])
  const fileCount = ref(0)

  /**
   * Busca tarefas agrupadas por status (apenas status com tarefas)
   */
  async function fetchTasksByStatus(boardIds: string[]) {
    if (import.meta.server) return

    try {
      const { useNuxtApp } = await import('#app')
      const supabase = useNuxtApp().$supabase as any

      if (!boardIds.length) { statusData.value = []; return }

      const { data: statuses, error: statusError } = await supabase
        .from('task_statuses')
        .select('id, name, color, is_done, board_id')
        .in('board_id', boardIds)

      if (statusError) throw statusError

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status_id, board_id')
        .in('board_id', boardIds)
        .is('archived_at', null)

      if (tasksError) throw tasksError

      const statusCounts = new Map<string, number>()
      tasks?.forEach((task: any) => {
        if (task.status_id) {
          statusCounts.set(task.status_id, (statusCounts.get(task.status_id) || 0) + 1)
        }
      })

      // Apenas status que têm pelo menos 1 tarefa
      statusData.value = (statuses || [])
        .filter((s: any) => (statusCounts.get(s.id) || 0) > 0)
        .map((status: any) => ({
          statusName: status.name,
          count: statusCounts.get(status.id) || 0,
          color: status.color,
          isDone: status.is_done
        }))
        .sort((a: StatusData, b: StatusData) => b.count - a.count)

    } catch (error) {
      console.error('[useDashboard] Error fetching tasks by status:', error)
      statusData.value = []
    }
  }

  /**
   * Busca tarefas agrupadas por responsável
   */
  async function fetchTasksByAssignee(boardIds: string[]) {
    if (import.meta.server) return

    try {
      const { useNuxtApp } = await import('#app')
      const supabase = useNuxtApp().$supabase as any

      if (!boardIds.length) { assigneeData.value = []; return }

      const { data: taskAssignees, error: taskError } = await supabase
        .from('task_assignees')
        .select(`
          user_id,
          profiles(id, full_name, avatar_url),
          tasks(board_id, archived_at)
        `)

      if (taskError) throw taskError

      const filteredAssignees = taskAssignees?.filter((item: any) => {
        const boardId = item.tasks?.board_id
        const isArchived = item.tasks?.archived_at
        return boardId && boardIds.includes(boardId) && !isArchived
      })

      const userCounts = new Map<string, { name: string; avatar: string | null; count: number }>()

      filteredAssignees?.forEach((item: any) => {
        const userId = item.user_id
        const userName = item.profiles?.full_name || 'Sem nome'
        const userAvatar = item.profiles?.avatar_url || null

        if (userCounts.has(userId)) {
          userCounts.get(userId)!.count++
        } else {
          userCounts.set(userId, { name: userName, avatar: userAvatar, count: 1 })
        }
      })

      assigneeData.value = Array.from(userCounts.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.name,
          userAvatar: data.avatar,
          taskCount: data.count
        }))
        .sort((a, b) => b.taskCount - a.taskCount)

    } catch (error) {
      console.error('[useDashboard] Error fetching tasks by assignee:', error)
      assigneeData.value = []
    }
  }

  /**
   * Busca tarefas atrasadas — exclui tarefas com status is_done = true
   */
  async function fetchOverdueTasks(boardIds: string[]) {
    if (import.meta.server) return

    try {
      const { useNuxtApp } = await import('#app')
      const supabase = useNuxtApp().$supabase as any

      if (!boardIds.length) { overdueData.value = []; return }

      const today = new Date().toISOString().split('T')[0]

      // Buscar IDs dos status "concluído" para excluir
      const { data: doneStatuses } = await supabase
        .from('task_statuses')
        .select('id')
        .in('board_id', boardIds)
        .eq('is_done', true)

      const doneStatusIds: string[] = (doneStatuses || []).map((s: any) => s.id)

      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          due_date,
          board_id,
          status_id,
          boards!inner(name),
          task_assignees(profiles(full_name))
        `)
        .in('board_id', boardIds)
        .lt('due_date', today)
        .is('archived_at', null)
        .order('due_date', { ascending: true })

      // Excluir tarefas já concluídas
      if (doneStatusIds.length > 0) {
        query = query.not('status_id', 'in', `(${doneStatusIds.join(',')})`)
      }

      const { data: tasks, error } = await query
      if (error) throw error

      overdueData.value = (tasks || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        dueDate: task.due_date,
        boardName: task.boards?.name || 'Board',
        assignees: task.task_assignees?.map((a: any) => a.profiles?.full_name).filter(Boolean) || []
      }))

    } catch (error) {
      console.error('[useDashboard] Error fetching overdue tasks:', error)
      overdueData.value = []
    }
  }

  /**
   * Busca tarefas com vencimento nos próximos 30 dias (não concluídas)
   */
  async function fetchUpcomingTasks(boardIds: string[]) {
    if (import.meta.server) return

    try {
      const { useNuxtApp } = await import('#app')
      const supabase = useNuxtApp().$supabase as any

      if (!boardIds.length) { upcomingTasks.value = []; deadlineData.value = []; return }

      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const in30Days = new Date(today)
      in30Days.setDate(today.getDate() + 30)
      const in30DaysStr = in30Days.toISOString().split('T')[0]

      // Buscar IDs dos status "concluído" para excluir
      const { data: doneStatuses } = await supabase
        .from('task_statuses')
        .select('id')
        .in('board_id', boardIds)
        .eq('is_done', true)

      const doneStatusIds: string[] = (doneStatuses || []).map((s: any) => s.id)

      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          due_date,
          board_id,
          status_id,
          boards!inner(name),
          task_assignees(profiles(full_name))
        `)
        .in('board_id', boardIds)
        .gte('due_date', todayStr)
        .lte('due_date', in30DaysStr)
        .is('archived_at', null)
        .order('due_date', { ascending: true })

      if (doneStatusIds.length > 0) {
        query = query.not('status_id', 'in', `(${doneStatusIds.join(',')})`)
      }

      const { data: tasks, error } = await query
      if (error) throw error

      const todayTime = today.getTime()

      upcomingTasks.value = (tasks || []).map((task: any) => {
        const dueDate = new Date(task.due_date + 'T00:00:00')
        const daysUntilDue = Math.ceil((dueDate.getTime() - todayTime) / (1000 * 60 * 60 * 24))
        return {
          id: task.id,
          title: task.title,
          dueDate: task.due_date,
          boardName: task.boards?.name || 'Board',
          assignees: task.task_assignees?.map((a: any) => a.profiles?.full_name).filter(Boolean) || [],
          daysUntilDue
        }
      })

      // Manter deadlineData para compatibilidade (agrupado por data)
      const dateCounts = new Map<string, number>()
      tasks?.forEach((task: any) => {
        if (task.due_date) {
          dateCounts.set(task.due_date, (dateCounts.get(task.due_date) || 0) + 1)
        }
      })
      deadlineData.value = Array.from(dateCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

    } catch (error) {
      console.error('[useDashboard] Error fetching upcoming tasks:', error)
      upcomingTasks.value = []
      deadlineData.value = []
    }
  }

  // Mantido para compatibilidade
  async function fetchTasksByDueDate(boardIds: string[]) {
    return fetchUpcomingTasks(boardIds)
  }

  /**
   * Busca todos os dados do dashboard em paralelo
   */
  async function fetchAllDashboardData() {
    if (import.meta.server) return

    isLoading.value = true

    try {
      const { useNuxtApp } = await import('#app')
      const supabase = useNuxtApp().$supabase as any

      if (!connectedBoards.value.length) {
        const { data: userBoards } = await supabase
          .from('boards')
          .select('id')
          .limit(10)

        if (userBoards) {
          connectedBoards.value = userBoards.map((b: any) => b.id)
        }
      }

      const [_, attachmentsResult] = await Promise.all([
        Promise.all([
          fetchTasksByStatus(connectedBoards.value),
          fetchTasksByAssignee(connectedBoards.value),
          fetchOverdueTasks(connectedBoards.value),
          fetchUpcomingTasks(connectedBoards.value)
        ]),
        supabase
          .from('tasks')
          .select('id, task_attachments(id)')
          .in('board_id', connectedBoards.value)
          .is('archived_at', null)
      ])

      if (attachmentsResult?.data) {
        let count = 0
        attachmentsResult.data.forEach((t: any) => {
          count += t.task_attachments?.length || 0
        })
        fileCount.value = count
      }

    } catch (error) {
      console.error('[useDashboard] Error fetching dashboard data:', error)
    } finally {
      isLoading.value = false
    }
  }

  return {
    connectedBoards,
    widgets,
    filterByPeople,
    isLoading,
    statusData,
    assigneeData,
    overdueData,
    deadlineData,
    upcomingTasks,
    fileCount,
    fetchTasksByStatus,
    fetchTasksByAssignee,
    fetchOverdueTasks,
    fetchTasksByDueDate,
    fetchUpcomingTasks,
    fetchAllDashboardData
  }
}
