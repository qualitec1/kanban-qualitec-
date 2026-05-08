import { ref, useState } from '#imports'
import type { Database, Tables } from '#shared/types/database'
import { createClient } from '@supabase/supabase-js'
import type { AuthUser } from '#shared/types/auth'

type SupabaseClient = ReturnType<typeof createClient<Database>>
type Workspace = Tables<'workspaces'>

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  added_at: string
  profile?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }
}

export function useWorkspaces() {
  function getClient(): SupabaseClient {
    if (import.meta.server) {
      throw new Error('[useWorkspaces] Supabase client não disponível no SSR')
    }
    return useNuxtApp().$supabase as SupabaseClient
  }

  const authUser = useState<AuthUser | null>('auth:user', () => null)
  
  const workspaces = ref<Workspace[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWorkspaces() {
    if (!authUser.value?.organizationId) return

    loading.value = true
    error.value = null

    try {
      const supabase = getClient()
      const { data, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('organization_id', authUser.value.organizationId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      workspaces.value = data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching workspaces:', e)
    } finally {
      loading.value = false
    }
  }

  async function createWorkspace(name: string, slug: string, visibility: Database['public']['Enums']['visibility_type'] = 'org') {
    if (!authUser.value?.organizationId) return null

    try {
      const supabase = getClient()
      const { data, error: insertError } = await supabase
        .from('workspaces')
        .insert({
          name,
          slug,
          visibility,
          organization_id: authUser.value.organizationId,
          created_by: authUser.value.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      await fetchWorkspaces()
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Error creating workspace:', e)
      return null
    }
  }

  async function updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'name' | 'slug' | 'visibility'>>) {
    try {
      const supabase = getClient()
      const { error: updateError } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

      await fetchWorkspaces()
      return true
    } catch (e: any) {
      error.value = e.message
      console.error('Error updating workspace:', e)
      return false
    }
  }

  async function deleteWorkspace(id: string) {
    try {
      const supabase = getClient()
      const { error: deleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      workspaces.value = workspaces.value.filter(w => w.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message
      console.error('Error deleting workspace:', e)
      return false
    }
  }

  // ── Membros de workspace ──────────────────────────────────────────────────

  async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      const supabase = getClient()
      const { data, error: fetchError } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          user_id,
          added_at,
          profile:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)

      if (fetchError) throw fetchError
      return (data || []) as WorkspaceMember[]
    } catch (e: any) {
      console.error('Error fetching workspace members:', e)
      return []
    }
  }

  async function addWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const supabase = getClient()
      const { error: insertError } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: userId })

      if (insertError) throw insertError
      return true
    } catch (e: any) {
      console.error('Error adding workspace member:', e)
      return false
    }
  }

  async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const supabase = getClient()
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError
      return true
    } catch (e: any) {
      console.error('Error removing workspace member:', e)
      return false
    }
  }

  async function syncWorkspaceMembers(workspaceId: string, userIds: string[]): Promise<boolean> {
    try {
      const supabase = getClient()
      // Remover todos e reinserir
      await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId)
      if (userIds.length > 0) {
        const { error: insertError } = await supabase
          .from('workspace_members')
          .insert(userIds.map(uid => ({ workspace_id: workspaceId, user_id: uid })))
        if (insertError) throw insertError
      }
      return true
    } catch (e: any) {
      console.error('Error syncing workspace members:', e)
      return false
    }
  }

  // ── Buscar todos os usuários da organização ───────────────────────────────

  async function fetchOrgUsers() {
    try {
      const supabase = getClient()
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role_global')
        .order('full_name')

      if (fetchError) throw fetchError
      return data || []
    } catch (e: any) {
      console.error('Error fetching org users:', e)
      return []
    }
  }

  return {
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchWorkspaceMembers,
    addWorkspaceMember,
    removeWorkspaceMember,
    syncWorkspaceMembers,
    fetchOrgUsers
  }
}
