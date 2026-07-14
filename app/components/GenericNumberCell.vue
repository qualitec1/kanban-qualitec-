<template>
  <div class="relative min-w-[90px] w-full h-full min-h-[44px] flex items-center">
    <!-- Editing -->
    <div v-if="editing" class="flex items-center gap-1 w-full" @click.stop>
      <span class="text-xs text-neutral-400 shrink-0">R$</span>
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        inputmode="decimal"
        placeholder="0,00"
        class="w-full text-xs text-neutral-700 bg-white border border-primary-400 rounded px-1.5 py-1 outline-none min-h-[32px]"
        @keydown.enter.prevent="save"
        @keydown.esc="cancel"
        @blur="save"
      />
    </div>

    <!-- Display -->
    <button
      v-else
      type="button"
      class="w-full text-left min-h-[44px] flex items-center px-1 hover:bg-neutral-100/50 rounded transition-colors group/btn"
      @click="startEdit"
      :title="value != null ? formatted : placeholder"
    >
      <span v-if="value != null" class="text-xs font-medium text-neutral-600 truncate w-full">{{ formatted }}</span>
      <span v-else class="text-xs text-neutral-300 italic group-hover/btn:text-neutral-400 transition-colors">—</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

const props = defineProps<{
  taskId: string
  columnKey: string
  value: number | null
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update', value: number | null): void
}>()

const supabase = useNuxtApp().$supabase as any
const editing = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const formatted = computed(() => {
  if (props.value == null) return ''
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(props.value)
})

function startEdit() {
  draft.value = props.value != null ? String(props.value).replace('.', ',') : ''
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

async function save() {
  if (!editing.value) return
  editing.value = false
  const raw = draft.value.trim().replace(',', '.')
  const valueNum = raw === '' ? null : parseFloat(raw)
  if (valueNum === props.value) return
  if (valueNum !== null && isNaN(valueNum)) return

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ [props.columnKey]: valueNum })
      .eq('id', props.taskId)
    
    if (error) throw error
    emit('update', valueNum)
  } catch (err) {
    console.error(`[GenericNumberCell] Error saving ${props.columnKey}:`, err)
  }
}

function cancel() {
  editing.value = false
}
</script>
