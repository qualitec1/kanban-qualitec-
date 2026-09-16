import { ref, onScopeDispose } from 'vue'
import { useNuxtApp } from '#app'

export function useTaskPreview() {
  const supabase = useNuxtApp().$supabase as any
  const task = ref<any>(null)
  const statuses = ref<any[]>([])
  const priorities = ref<any[]>([])
  const loading = ref(false)
  const error = ref('')
  let request = 0
  onScopeDispose(() => { request++ })
  async function load(taskId: string, boardId: string, initialTask?: any) {
    const current = ++request
    task.value = initialTask ? { ...initialTask } : null
    statuses.value = []; priorities.value = []
    loading.value = true; error.value = ''
    try {
      const results = await Promise.all([
        supabase.from('tasks').select(`*, task_assignees(profiles:user_id(id,full_name,email,avatar_url)), task_attachments(count), subtasks(*,subtask_assignees(profiles:user_id(id,full_name,email,avatar_url)))`).eq('id', taskId).eq('board_id', boardId).single(),
        supabase.from('task_statuses').select('*').eq('board_id', boardId),
        supabase.from('task_priorities').select('*').eq('board_id', boardId)
      ])
      if (current !== request) return
      if (results[0].error || !results[0].data) throw new Error('task unavailable')
      const data = results[0].data
      task.value = {
        ...data,
        assignees: (data.task_assignees || []).map((a: any) => a.profiles).filter(Boolean),
        attachment_count: data.task_attachments?.[0]?.count || 0,
        subtasks: [...(data.subtasks || [])].sort((a: any, b: any) => a.sort_order - b.sort_order).map((s: any) => ({ ...s, assignees: (s.subtask_assignees || []).map((a: any) => a.profiles).filter(Boolean) }))
      }
      statuses.value = results[1].data || []
      priorities.value = results[2].data || []
      if (results[1].error || results[2].error) error.value = 'Não foi possível carregar os nomes de status e prioridades. Tente novamente.'
    } catch {
      if (current !== request) return
      task.value = null
      error.value = 'Não foi possível carregar esta tarefa. Ela pode ter sido removida ou seu acesso pode ter mudado.'
    } finally { if (current === request) loading.value = false }
  }
  return { task, statuses, priorities, loading, error, load }
}
