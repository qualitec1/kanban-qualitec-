<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-heading-lg font-semibold text-neutral-900 mb-2">Áreas de trabalho</h1>
        <p class="text-body text-muted">Organize seus quadros por contexto, time ou projeto</p>
      </div>
      <ClientOnly>
        <BaseButton v-if="isMaster" variant="primary" @click="handleOpenModal">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova área
        </BaseButton>
      </ClientOnly>
    </div>

    <LoadingState v-if="loading" message="Carregando áreas de trabalho..." />
    <ErrorState v-else-if="error" :message="error" @retry="fetchWorkspaces" />
    <EmptyState v-else-if="workspaces.length === 0" title="Nenhuma área de trabalho" description="Crie sua primeira área para começar a organizar seus quadros.">
      <ClientOnly>
        <BaseButton v-if="isMaster" variant="primary" @click="showCreateModal = true">Criar primeira área</BaseButton>
      </ClientOnly>
    </EmptyState>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <WorkspaceCard
        v-for="workspace in workspaces"
        :key="workspace.id"
        :workspace="workspace"
        @click="handleNavigateToWorkspace(workspace)"
        @edit="handleEdit(workspace)"
        @delete="handleDeleteConfirm(workspace)"
      />
    </div>

    <!-- Edit Modal -->
    <BaseModal v-model="showEditModal" title="Editar área de trabalho">
      <form @submit.prevent="handleUpdate" class="space-y-4">
        <BaseInput v-model="editWorkspace.name" label="Nome" placeholder="Ex: Marketing, Desenvolvimento, Vendas" required />
        <BaseInput v-model="editWorkspace.slug" label="Identificador (slug)" placeholder="Ex: marketing, dev, vendas" required :helper-text="'URL: /workspaces/' + (editWorkspace.slug || 'slug')" />
        <BaseSelect v-model="editWorkspace.visibility" label="Visibilidade" :options="visibilityOptions" />

        <!-- Seletor de usuários (apenas para privado) -->
        <div v-if="editWorkspace.visibility === 'private'" class="space-y-2">
          <label class="block text-sm font-medium text-neutral-700">
            Usuários com acesso
            <span class="text-neutral-400 font-normal ml-1">({{ editWorkspace.memberIds.length }} selecionado{{ editWorkspace.memberIds.length !== 1 ? 's' : '' }})</span>
          </label>
          <div v-if="loadingUsers" class="flex items-center gap-2 py-3 text-sm text-neutral-500">
            <div class="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
            Carregando usuários...
          </div>
          <div v-else class="border border-neutral-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            <label
              v-for="user in orgUsers"
              :key="user.id"
              class="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors"
              :class="{ 'bg-primary-50': editWorkspace.memberIds.includes(user.id) }"
            >
              <input
                type="checkbox"
                :value="user.id"
                v-model="editWorkspace.memberIds"
                class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <img v-if="user.avatar_url" :src="user.avatar_url" class="w-7 h-7 rounded-full object-cover" />
                <span v-else class="text-xs font-semibold text-primary-700">
                  {{ (user.full_name || user.email).charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ user.full_name || user.email }}</p>
                <p v-if="user.full_name" class="text-xs text-neutral-500 truncate">{{ user.email }}</p>
              </div>
              <span v-if="editWorkspace.memberIds.includes(user.id)" class="text-primary-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            </label>
            <div v-if="orgUsers.length === 0" class="px-3 py-4 text-sm text-neutral-500 text-center">
              Nenhum usuário encontrado
            </div>
          </div>
          <p class="text-xs text-neutral-500">Masters sempre têm acesso. Selecione quem mais poderá ver esta área.</p>
        </div>

        <div class="flex gap-3 justify-end pt-4">
          <BaseButton type="button" variant="ghost" @click="showEditModal = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :disabled="!editWorkspace.name || !editWorkspace.slug">Salvar alterações</BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Delete Modal -->
    <BaseModal v-model="showDeleteModal" title="Excluir área de trabalho" size="sm">
      <div class="space-y-4">
        <p class="text-body text-neutral-700">Tem certeza que deseja excluir a área <strong>{{ workspaceToDelete?.name }}</strong>?</p>
        <p class="text-label-sm text-danger-600">Esta ação não pode ser desfeita. Todos os quadros desta área também serão removidos.</p>
        <div class="flex gap-3 justify-end pt-4">
          <BaseButton type="button" variant="ghost" @click="showDeleteModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" @click="handleDelete">Excluir área</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Create Modal -->
    <BaseModal v-model="showCreateModal" title="Nova área de trabalho">
      <form @submit.prevent="handleCreate" class="space-y-4">
        <BaseInput v-model="newWorkspace.name" label="Nome" placeholder="Ex: Marketing, Desenvolvimento, Vendas" required />
        <BaseInput v-model="newWorkspace.slug" label="Identificador (slug)" placeholder="Ex: marketing, dev, vendas" required :helper-text="'URL: /workspaces/' + (newWorkspace.slug || 'slug')" />
        <BaseSelect v-model="newWorkspace.visibility" label="Visibilidade" :options="visibilityOptions" />

        <!-- Seletor de usuários (apenas para privado) -->
        <div v-if="newWorkspace.visibility === 'private'" class="space-y-2">
          <label class="block text-sm font-medium text-neutral-700">
            Usuários com acesso
            <span class="text-neutral-400 font-normal ml-1">({{ newWorkspace.memberIds.length }} selecionado{{ newWorkspace.memberIds.length !== 1 ? 's' : '' }})</span>
          </label>
          <div v-if="loadingUsers" class="flex items-center gap-2 py-3 text-sm text-neutral-500">
            <div class="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
            Carregando usuários...
          </div>
          <div v-else class="border border-neutral-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            <label
              v-for="user in orgUsers"
              :key="user.id"
              class="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors"
              :class="{ 'bg-primary-50': newWorkspace.memberIds.includes(user.id) }"
            >
              <input
                type="checkbox"
                :value="user.id"
                v-model="newWorkspace.memberIds"
                class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <img v-if="user.avatar_url" :src="user.avatar_url" class="w-7 h-7 rounded-full object-cover" />
                <span v-else class="text-xs font-semibold text-primary-700">
                  {{ (user.full_name || user.email).charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ user.full_name || user.email }}</p>
                <p v-if="user.full_name" class="text-xs text-neutral-500 truncate">{{ user.email }}</p>
              </div>
              <span v-if="newWorkspace.memberIds.includes(user.id)" class="text-primary-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            </label>
            <div v-if="orgUsers.length === 0" class="px-3 py-4 text-sm text-neutral-500 text-center">
              Nenhum usuário encontrado
            </div>
          </div>
          <p class="text-xs text-neutral-500">Masters sempre têm acesso. Selecione quem mais poderá ver esta área.</p>
        </div>

        <div class="flex gap-3 justify-end pt-4">
          <BaseButton type="button" variant="ghost" @click="showCreateModal = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :disabled="!newWorkspace.name || !newWorkspace.slug">Criar área</BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaces } from '~/composables/useWorkspaces'
import { useAuth } from '~/composables/useAuth'
import type { Database, Tables } from '#shared/types/database'

const router = useRouter()
const { workspaces, loading, error, fetchWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, fetchWorkspaceMembers, syncWorkspaceMembers, fetchOrgUsers } = useWorkspaces()
const { isMaster } = useAuth()

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const loadingUsers = ref(false)
const orgUsers = ref<any[]>([])

const newWorkspace = ref({
  name: '',
  slug: '',
  visibility: 'org' as Database['public']['Enums']['visibility_type'],
  memberIds: [] as string[]
})

const editWorkspace = ref({
  id: '',
  name: '',
  slug: '',
  visibility: 'org' as Database['public']['Enums']['visibility_type'],
  memberIds: [] as string[]
})

const workspaceToDelete = ref<Tables<'workspaces'> | null>(null)

const visibilityOptions = [
  { value: 'org', label: 'Organização (todos podem ver)' },
  { value: 'private', label: 'Privado (apenas membros convidados)' }
]

// Carregar usuários quando visibilidade mudar para privado
watch(() => newWorkspace.value.visibility, (val) => {
  if (val === 'private') loadUsers()
})
watch(() => editWorkspace.value.visibility, (val) => {
  if (val === 'private') loadUsers()
})

async function loadUsers() {
  if (orgUsers.value.length > 0) return
  loadingUsers.value = true
  orgUsers.value = await fetchOrgUsers()
  loadingUsers.value = false
}

function handleNavigateToWorkspace(workspace: Tables<'workspaces'>) {
  router.push(`/workspaces/${workspace.slug}`)
}

function handleOpenModal() {
  showCreateModal.value = true
}

async function handleCreate() {
  const result = await createWorkspace(
    newWorkspace.value.name,
    newWorkspace.value.slug,
    newWorkspace.value.visibility
  )

  if (result) {
    // Salvar membros se privado
    if (newWorkspace.value.visibility === 'private' && newWorkspace.value.memberIds.length > 0) {
      await syncWorkspaceMembers(result.id, newWorkspace.value.memberIds)
    }
    showCreateModal.value = false
    newWorkspace.value = { name: '', slug: '', visibility: 'org', memberIds: [] }
  }
}

async function handleEdit(workspace: Tables<'workspaces'>) {
  editWorkspace.value = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    visibility: workspace.visibility,
    memberIds: []
  }

  // Carregar membros existentes se privado
  if (workspace.visibility === 'private') {
    await loadUsers()
    const members = await fetchWorkspaceMembers(workspace.id)
    editWorkspace.value.memberIds = members.map(m => m.user_id)
  }

  showEditModal.value = true
}

async function handleUpdate() {
  const result = await updateWorkspace(editWorkspace.value.id, {
    name: editWorkspace.value.name,
    slug: editWorkspace.value.slug,
    visibility: editWorkspace.value.visibility
  })

  if (result) {
    // Sincronizar membros se privado
    if (editWorkspace.value.visibility === 'private') {
      await syncWorkspaceMembers(editWorkspace.value.id, editWorkspace.value.memberIds)
    } else {
      // Se mudou para não-privado, remover todos os membros
      await syncWorkspaceMembers(editWorkspace.value.id, [])
    }
    showEditModal.value = false
  }
}

function handleDeleteConfirm(workspace: Tables<'workspaces'>) {
  workspaceToDelete.value = workspace
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!workspaceToDelete.value) return
  const result = await deleteWorkspace(workspaceToDelete.value.id)
  if (result) {
    showDeleteModal.value = false
    workspaceToDelete.value = null
  }
}

onMounted(() => {
  fetchWorkspaces()
})
</script>
