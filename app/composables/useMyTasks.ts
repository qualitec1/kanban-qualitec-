import { ref } from '#imports'
import type { Tables } from '#shared/types/database'

type Task = Tables<'tasks'>
type TaskPriority = Tables<'task_priorities'>
type TaskStatus = Tables<'task_statuses'>
type Board = Tables<'boards'>

export interface MyTask extends Task {
  board?: Board
  priority?: TaskPriority
  status?: TaskStatus
  assignees?: any[]
}

export function useMyTasks() {
  const supabase = useNuxtApp().$supabase as any
  const { user } = useAuth()

  const tasks = ref<MyTask[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Busca tarefas onde o usuário é:
   * 1. Criador (created_by)
   * 2. Responsável (task_assignees)
   * 
   * Ordenadas por:
   * 1. Prioridade (Crítica > Alta > Média > Baixa > Sem prioridade)
   * 2. Data de vencimento (mais próximas primeiro)
   */
  async function fetchMyTasks() {
    if (!user.value) {
      error.value = 'Usuário não autenticado'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Buscar tarefas criadas pelo usuário
      const { data: createdTasks, error: createdError } = await supabase
        .from('tasks')
        .select(`
          *,
          board:boards!inner(id, name),
          priority:task_priorities(id, name, color, sort_order),
          status:task_statuses(id, name, color, is_done),
          task_assignees(
            user_id,
            profiles:user_id(id, full_name, email, avatar_url)
          )
        `)
        .eq('created_by', user.value.id)
        .is('archived_at', null)

      if (createdError) throw createdError

      // Buscar tarefas onde o usuário é responsável
      const { data: assignedTasks, error: assignedError } = await supabase
        .from('tasks')
        .select(`
          *,
          board:boards!inner(id, name),
          priority:task_priorities(id, name, color, sort_order),
          status:task_statuses(id, name, color, is_done),
          task_assignees!inner(
            user_id,
            profiles:user_id(id, full_name, email, avatar_url)
          )
        `)
        .eq('task_assignees.user_id', user.value.id)
        .is('archived_at', null)

      if (assignedError) throw assignedError

      // Combinar e remover duplicatas
      const allTasks = [...(createdTasks || []), ...(assignedTasks || [])]
      const uniqueTasks = Array.from(
        new Map(allTasks.map(task => [task.id, task])).values()
      )

      // Processar tarefas para incluir assignees
      const processedTasks = uniqueTasks.map((task: any) => ({
        ...task,
        board: task.board,
        priority: task.priority,
        status: task.status,
        assignees: (task.task_assignees || [])
          .map((ta: any) => ta.profiles)
          .filter(Boolean)
      }))

      // Ordenar: tarefas concluídas sempre no final, depois por prioridade e data
      tasks.value = processedTasks.sort((a, b) => {
        const aDone = a.status?.is_done === true
        const bDone = b.status?.is_done === true

        // Concluídas sempre vão pro final
        if (aDone !== bDone) return aDone ? 1 : -1

        // 1. Ordenar por prioridade (sort_order MAIOR = maior prioridade)
        const aPriority = a.priority?.sort_order ?? -1
        const bPriority = b.priority?.sort_order ?? -1
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }

        // 2. Mesma prioridade: ordenar por data de vencimento
        if (a.due_date && b.due_date) {
          const [yearA, monthA, dayA] = a.due_date.split('-').map(Number)
          const dateA = new Date(yearA, monthA - 1, dayA)
          
          const [yearB, monthB, dayB] = b.due_date.split('-').map(Number)
          const dateB = new Date(yearB, monthB - 1, dayB)
          
          return dateA.getTime() - dateB.getTime()
        }
        if (a.due_date) return -1
        if (b.due_date) return 1

        return 0
      })

      console.log('[useMyTasks] Loaded', tasks.value.length, 'tasks')
    } catch (e: any) {
      error.value = e.message
      console.error('[useMyTasks] Error loading tasks:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Atualiza uma tarefa
   */
  async function updateTask(taskId: string, updates: Partial<Task>) {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (updateError) throw updateError

      // Atualizar localmente
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = { ...tasks.value[index], ...updates }
      }

      return true
    } catch (e: any) {
      console.error('[useMyTasks] Error updating task:', e)
      return false
    }
  }

  return {
    tasks,
    loading,
    error,
    fetchMyTasks,
    updateTask
  }
}
