<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Gerenciar quadros do painel"
    size="md"
  >
    <div class="space-y-4">
      <p class="text-sm text-neutral-500">
        Selecione quais quadros deseja consolidar nas métricas e relatórios deste painel.
      </p>

      <!-- Busca de quadros -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar quadro..."
          class="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
        />
      </div>

      <!-- Ações rápidas -->
      <div class="flex items-center justify-between text-xs">
        <div class="flex gap-2">
          <button
            type="button"
            @click="selectAll"
            class="text-primary-600 hover:text-primary-700 font-medium"
          >
            Selecionar todos
          </button>
          <span class="text-neutral-300">|</span>
          <button
            type="button"
            @click="selectNone"
            class="text-neutral-500 hover:text-neutral-600 font-medium"
          >
            Limpar seleção
          </button>
        </div>
        <span class="text-neutral-400">
          {{ selectedIds.length }} de {{ boards.length }} selecionados
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-8">
        <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mb-2" />
        <span class="text-xs text-neutral-400">Carregando seus quadros...</span>
      </div>

      <!-- Listagem de quadros -->
      <div v-else class="max-h-[300px] overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-white">
        <div
          v-for="board in filteredBoards"
          :key="board.id"
          @click="toggleBoard(board.id)"
          class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            :checked="selectedIds.includes(board.id)"
            @click.stop="toggleBoard(board.id)"
            class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-neutral-800 truncate">{{ board.name }}</p>
            <p v-if="board.description" class="text-xs text-neutral-400 truncate">{{ board.description }}</p>
          </div>
        </div>
        
        <div v-if="filteredBoards.length === 0" class="text-center py-8 text-sm text-neutral-400">
          Nenhum quadro encontrado
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        @click="$emit('update:modelValue', false)"
        class="px-4 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        Cancelar
      </button>
      <button
        type="button"
        @click="handleSave"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Salvar alterações
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBoards } from '~/composables/useBoards'
import BaseModal from '~/components/BaseModal.vue'

const props = defineProps<{
  modelValue: boolean
  initialConnectedIds: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'save': [selectedIds: string[]]
}>()

const { boards, fetchBoards, loading } = useBoards()
const searchQuery = ref('')
const selectedIds = ref<string[]>([...props.initialConnectedIds])

const filteredBoards = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return boards.value
  return boards.value.filter(b => 
    b.name?.toLowerCase().includes(query) || 
    b.description?.toLowerCase().includes(query)
  )
})

function toggleBoard(id: string) {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function selectAll() {
  selectedIds.value = boards.value.map(b => b.id)
}

function selectNone() {
  selectedIds.value = []
}

function handleSave() {
  emit('save', selectedIds.value)
  emit('update:modelValue', false)
}

onMounted(async () => {
  await fetchBoards()
})
</script>
