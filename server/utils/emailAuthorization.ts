import { createError } from 'h3'
import type { H3Event } from 'h3'
import { getSupabaseClient, getSupabaseUser } from './supabase'

export async function requireEmailUser(event: H3Event) {
  const user = await getSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
  return user
}

export async function requireEmailAdmin(event: H3Event) {
  const user = await requireEmailUser(event)
  const { data, error } = await getSupabaseClient(event).from('profiles')
    .select('role_global').eq('id', user.id).single()
  if (error || data?.role_global !== 'master') {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }
  return user
}

// Check using the caller's RLS-scoped client before any service-role access.
export async function requireTaskEmailPermission(event: H3Event, userId: string, taskId: string, assigneeId: string) {
  const client = getSupabaseClient(event)
  const { data: task, error: taskError } = await client.from('tasks')
    .select('board_id').eq('id', taskId).single()
  if (taskError || !task) throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('role_global').eq('id', userId).single()
  if (profileError) throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  if (profile?.role_global !== 'master') {
    const { data: board, error: boardError } = await client.from('boards')
      .select('created_by').eq('id', task.board_id).single()
    if (boardError || !board) throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    if (board.created_by !== userId) {
      const { data: member, error: memberError } = await client.from('board_members')
        .select('access_role').eq('board_id', task.board_id).eq('user_id', userId).single()
      if (memberError || !member || !['owner', 'editor'].includes(member.access_role)) {
        throw createError({ statusCode: 403, message: 'Insufficient permissions' })
      }
    }
  }
  const { data: assignment, error: assignmentError } = await client.from('task_assignees')
    .select('user_id').eq('task_id', taskId).eq('user_id', assigneeId).single()
  if (assignmentError || !assignment) {
    throw createError({ statusCode: 403, message: 'Recipient must be assigned to the task' })
  }
}
