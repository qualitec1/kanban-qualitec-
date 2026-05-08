<template>
  <div class="relative inline-block">
    <!-- Botão de filtro -->
    <button
      ref="buttonRef"
      type="button"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors text-sm"
      :class="{ 'bg-blue-50 border-[#1C325C] text-[#1C325C]': hasActiveFilters }"
      @click="isOpen = !isOpen"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <span>{{ columnLabel }}</span>
      <!-- Badge de contagem -->
      <span
        v-if="activeCount > 0"
        class="px-1.5 py-0.5 bg-[#1C325C] text-white text-xs font-bold rounded-full"
      >
        {{ activeCount }}
      </span>
    </button>

    <!-- Overlay para fechar ao clicar fora -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100]"
        @click="isOpen = false"
      />
      
      <!-- Dropdown -->
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="fixed z-[101] bg-white rounded-lg shadow-xl border border-neutral-200 py-2 min-w-[220px]"
        :style="dropdownStyle"
      >
        <!-- Cabeçalho -->
        <div class="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
          <span class="text-sm font-semibold text-neutral-700">{{ columnLabel }}</span>
          <button
            v-if="activeCount > 0"
            type="button"
            class="text-xs text-[#1C325C] hover:text-[#152847] font-medium"
            @click="handleClearColumn"
          >
            Limpar
          </button>
        </div>

        <!-- Campo de busca (apenas para Board) -->
        <div v-if="columnKey === 'board'" class="px-3 py-2 border-b border-neutral-100">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar board..."
            class="w-full px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1C325C]"
          />
        </div>

        <!-- Opções de filtro -->
        <div class="max-h-[300px] overflow-y-auto">
          <label
            v-for="option in filteredOptions"
            :key="option.value"
            class="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="isFilterActive(columnKey, option.value)"
              class="w-4 h-4 rounded border-neutral-300 text-[#1C325C] focus:ring-[#1C325C]"
              @change="handleToggle(option.value)"
            />
            <span class="text-sm text-neutral-700 flex-1">{{ option.label }}</span>
          </label>
          
          <!-- Estado vazio -->
          <div v-if="filteredOptions.length === 0" class="px-3 py-4 text-center text-sm text-neutral-400">
            Nenhum resultado encontrado
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useMyTasksFilters, type MyTasksFilters } from '~/composables/useMyTasksFilters'

const props = defineProps<{
  columnKey: keyof MyTasksFilters
  columnLabel: string
  options: Array<{ value: string; label: string }>
}>()

const { toggleFilter, isFilterActive, getActiveFiltersCount, clearColumnFilters } = useMyTasksFilters()

const isOpen = ref(false)
const buttonRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref({})
const searchQuery = ref('')

const activeCount = computed(() => getActiveFiltersCount(props.columnKey))
const hasActiveFilters = computed(() => activeCount.value > 0)

// Filtrar opções baseado na busca (apenas para Board)
const filteredOptions = computed(() => {
  if (props.columnKey !== 'board' || !searchQuery.value) {
    return props.options
  }
  
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(opt => 
    opt.label.toLowerCase().includes(query)
  )
})

function handleToggle(value: string) {
  toggleFilter(props.columnKey, value)
}

function handleClearColumn() {
  clearColumnFilters(props.columnKey)
  searchQuery.value = ''
}

// Posicionar dropdown próximo ao botão
function updateDropdownPosition() {
  if (!isOpen.value || !buttonRef.value || !dropdownRef.value) return

  const buttonRect = buttonRef.value.getBoundingClientRect()
  const dropdownRect = dropdownRef.value.getBoundingClientRect()

  // Posição padrão: abaixo do botão, alinhado à esquerda
  let top = buttonRect.bottom + 4
  let left = buttonRect.left

  // Ajustar se sair da tela à direita
  if (left + dropdownRect.width > window.innerWidth) {
    left = buttonRect.right - dropdownRect.width
  }

  // Ajustar se sair da tela embaixo
  if (top + dropdownRect.height > window.innerHeight) {
    top = buttonRect.top - dropdownRect.height - 4
  }

  // Garantir que não saia da tela à esquerda
  if (left < 8) {
    left = 8
  }

  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

watch(isOpen, async (newValue) => {
  if (newValue) {
    await nextTick()
    updateDropdownPosition()
  } else {
    searchQuery.value = ''
  }
})
</script>
