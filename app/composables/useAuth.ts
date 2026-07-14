import { useState, useNuxtApp, useRuntimeConfig, navigateTo, computed, readonly } from '#imports'
import { createClient } from '@supabase/supabase-js'
import type { AuthUser } from '#shared/types/auth'
import type { Database } from '#shared/types/database'

type SupabaseClient = ReturnType<typeof createClient<Database>>

// Fixed: Using native Supabase Auth methods instead of edge functions

export function useAuth() {
  const user      = useState<AuthUser | null>('auth:user',    () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem('auth:profile')
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return null
  })
  const isLoading = useState<boolean>('auth:loading', () => false)

  const isAuthenticated = computed(() => user.value !== null)
  const isMaster        = computed(() => user.value?.role === 'master')
  const isCollaborator  = computed(() => user.value?.role === 'collaborator')

  function getClient(): SupabaseClient {
    if (import.meta.server) {
      throw new Error('[useAuth] Supabase client não disponível no SSR')
    }
    return useNuxtApp().$supabase as SupabaseClient
  }

  async function loadProfile(userId: string): Promise<void> {
    const sb = getClient()
    const { data, error } = await sb
      .from('profiles')
      .select('id, email, role_global, organization_id, full_name, avatar_url')
      .eq('id', userId)
      .single()

    if (error || !data) {
      user.value = null
      if (import.meta.client) {
        localStorage.removeItem('auth:profile')
      }
      return
    }

    const profileData = {
      id:             data.id,
      email:          data.email,
      role:           data.role_global,
      organizationId: data.organization_id,
      fullName:       data.full_name ?? undefined,
      avatarUrl:      data.avatar_url ?? undefined,
    }

    user.value = profileData
    if (import.meta.client) {
      try {
        localStorage.setItem('auth:profile', JSON.stringify(profileData))
      } catch (e) {}
    }
  }

  async function initSession(): Promise<void> {
    if (import.meta.server) return
    const sb = getClient()
    const { data: { session } } = await sb.auth.getSession()
    if (session?.user) {
      await loadProfile(session.user.id)
    } else {
      user.value = null
      localStorage.removeItem('auth:profile')
    }
  }

  async function register(email: string, password: string, fullName: string): Promise<void> {
    isLoading.value = true
    try {
      const sb = getClient()
      
      // Sign up with Supabase Auth - email confirmation disabled
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined, // Disable email confirmation
        }
      })

      if (error) throw new Error(error.message)
      if (!data.user) throw new Error('Erro ao criar conta')

      // Load profile after successful signup
      await loadProfile(data.user.id)
    } finally {
      isLoading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    try {
      const sb = getClient()
      
      // Sign in with Supabase Auth
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Mensagem mais clara para email não confirmado
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Email não confirmado. Verifique sua caixa de entrada.')
        }
        throw new Error(error.message)
      }
      if (!data.user) throw new Error('Credenciais inválidas')

      // Load profile after successful login
      await loadProfile(data.user.id)
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    try {
      const sb = getClient()
      await sb.auth.signOut()
      user.value = null
      await navigateTo('/login')
    } finally {
      isLoading.value = false
    }
  }

  async function sendPasswordReset(email: string): Promise<void> {
    const sb = getClient()
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // Always resolves — never throws (silent lockout on server side)
  }

  async function updatePassword(newPassword: string): Promise<void> {
    const sb = getClient()
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return {
    user:            readonly(user),
    isAuthenticated,
    isLoading:       readonly(isLoading),
    isMaster,
    isCollaborator,
    initSession,
    register,
    login,
    logout,
    sendPasswordReset,
    updatePassword,
  }
}
