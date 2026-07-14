import { ref } from '#imports'
import type { Tables } from '#shared/types/database'
import { useAuth } from '~/composables/useAuth'

export type TaskRow = Pick<
  Tables<'tasks'>,
  'id' | 'title' | 'group_id' | 'board_id' | 'status_id' | 'priority_id' |
  'due_date' | 'start_date' | 'description' | 'notes' | 'budget' | 'updated_at' | 'position'
> & {
  email?: string | null
  account?: string | null
  deal?: string | null
  phone?: string | null
  comments?: string | null
  deal_value?: number | null
  task_type?: string | null
  job_title?: string | null
  attachment_count?: number
  subtasks?: Array<{
    id: string
    title: string
    is_done: boolean
    sort_order: number
    status_id: string | null
    priority_id: string | null
    due_date: string | null
    assignees?: Array<{ id: string; full_name: string | null; email: string; avatar_url: string | null }>
  }>
}

export function useTasks() {
  const supabase = useNuxtApp().$supabase as any
  const { user } = useAuth()

  async function createTask(params: {
    boardId: string
    groupId: string
    title: string
  }): Promise<TaskRow | null> {
    // Get max position in group
    const { data: existing } = await supabase
      .from('tasks')
      .select('position')
      .eq('group_id', params.groupId)
      .order('position', { ascending: false })
      .limit(1)

    const position = existing?.[0]?.position != null ? existing[0].position + 1 : 0

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: params.title.trim(),
        board_id: params.boardId,
        group_id: params.groupId,
        position,
        created_by: user.value?.id, // Adicionar o criador da tarefa
      })
      .select('id, title, group_id, board_id, status_id, priority_id, due_date, start_date, description, budget, updated_at')
      .single()

    if (error) throw error
    return data as TaskRow
  }

  async function reorderTasks(params: {
    groupId: string
    taskIds: string[]
  }): Promise<boolean> {
    try {
      
      // Get Supabase client to access session
      const supabase = useNuxtApp().$supabase as any
      const { data: { session } } = await supabase.auth.getSession()
      
      
      if (!session?.access_token) {
        console.error('[useTasks] No access token found')
        alert('Erro: Sessão expirada. Faça login novamente.')
        return false
      }
      
      // Call server API to reorder tasks
      const response = await $fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          group_id: params.groupId,
          task_ids: params.taskIds
        }
      })
      
      return true
    } catch (error: any) {
      console.error('[useTasks] Error reordering tasks:', error)
      console.error('[useTasks] Error details:', {
        status: error?.statusCode,
        statusCode: error?.status,
        message: error?.message,
        data: error?.data,
        cause: error?.cause
      })
      
      // Show user-friendly error
      if (error?.statusCode === 401 || error?.status === 401) {
        alert('Erro: Sessão expirada. Faça login novamente.')
      } else if (error?.statusCode === 403 || error?.status === 403) {
        alert('Erro: Você não tem permissão para reordenar tarefas neste quadro.')
      } else {
        alert('Erro ao reordenar tarefas. Verifique o console para mais detalhes.')
      }
      
      return false
    }
  }

  async function moveTaskToGroup(params: {
    taskId: string
    sourceGroupId: string
    targetGroupId: string
  }): Promise<boolean> {
    try {
      
      // Get Supabase client to access session
      const supabase = useNuxtApp().$supabase as any
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No access token found')
        return false
      }
      
      await $fetch('/api/tasks/move-to-group', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          task_id: params.taskId,
          source_group_id: params.sourceGroupId,
          target_group_id: params.targetGroupId
        }
      })
      
      return true
    } catch (error: any) {
      console.error('Error moving task to group:', error)
      console.error('Error details:', {
        status: error?.statusCode,
        message: error?.message,
        data: error?.data
      })
      return false
    }
  }

  async function deleteTask(taskId: string): Promise<boolean> {
    try {
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('[useTasks] Error deleting task:', error)
        throw error
      }

      return true
    } catch (error: any) {
      console.error('[useTasks] Error deleting task:', error)
      return false
    }
  }

  return { createTask, reorderTasks, moveTaskToGroup, deleteTask }
}