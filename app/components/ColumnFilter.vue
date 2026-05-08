<template>
  <div class="relative inline-block">
    <!-- Botão de filtro -->
    <button
      ref="buttonRef"
      type="button"
      class="p-1 rounded hover:bg-neutral-100 transition-colors relative"
      :class="{ 'text-[#1C325C] bg-blue-50': hasActiveFilters }"
      @click="isOpen = !isOpen"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <!-- Badge de contagem -->
      <span
        v-if="activeCount > 0"
        class="absolute -top-1 -right-1 w-4 h-4 bg-[#1C325C] text-white text-[10px] font-bold rounded-full flex items-center justify-center"
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
        class="fixed z-[101] bg-white rounded-lg shadow-xl border border-neutral-200 py-2 min-w-[200px]"
        :style="dropdownStyle"
      >
        <!-- Cabeçalho -->
        <div class="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
          <span class="text-sm font-semibold text-neutral-700">Filtrar por {{ columnLabel }}</span>
          <button
            v-if="activeCount > 0"
            type="button"
            class="text-xs text-[#1C325C] hover:text-[#152847] font-medium"
            @click="handleClearColumn"
          >
            Limpar
          </button>
        </div>

        <!-- Opções de filtro -->
        <div class="max-h-[300px] overflow-y-auto">
          <label
            v-for="option in options"
            :key="option.value"
            class="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="isFilterActive(columnKey, option.value)"
              class="w-4 h-4 rounded border-neutral-300 text-[#1C325C] focus:ring-[#1C325C]"
              @change="handleToggle(option.value)"
            />
            <span class="text-sm text-neutral-700">{{ option.label }}</span>
          </label>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useTaskFilters, type TaskFilters } from '~/composables/useTaskFilters'

const props = defineProps<{
  columnKey: keyof TaskFilters
  columnLabel: string
  options: Array<{ value: string; label: string }>
}>()

const { toggleFilter, isFilterActive, getActiveFiltersCount, clearColumnFilters } = useTaskFilters()

const isOpen = ref(false)
const buttonRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref({})

const activeCount = computed(() => getActiveFiltersCount(props.columnKey))
const hasActiveFilters = computed(() => activeCount.value > 0)

function handleToggle(value: string) {
  toggleFilter(props.columnKey, value)
}

function handleClearColumn() {
  clearColumnFilters(props.columnKey)
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
  }
})
</script>
