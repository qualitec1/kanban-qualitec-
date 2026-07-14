<template>
  <div class="relative min-w-[90px] w-full h-full min-h-[44px] flex items-center">
    <!-- Editing -->
    <div v-if="editing" class="flex items-center gap-1 w-full" @click.stop>
      <input
        ref="inputRef"
        v-model="draft"
        :type="type || 'text'"
        :placeholder="placeholder"
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
      :title="value || placeholder"
    >
      <span v-if="value" class="text-xs text-neutral-700 truncate w-full">{{ value }}</span>
      <span v-else class="text-xs text-neutral-300 italic group-hover/btn:text-neutral-400 transition-colors">—</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = defineProps<{
  taskId: string
  columnKey: string
  value: string | null
  placeholder?: string
  type?: 'text' | 'email' | 'tel'
}>()

const emit = defineEmits<{
  (e: 'update', value: string | null): void
}>()

const supabase = useNuxtApp().$supabase as any
const editing = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function startEdit() {
  draft.value = props.value || ''
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

async function save() {
  if (!editing.value) return
  editing.value = false
  const newValue = draft.value.trim() === '' ? null : draft.value.trim()
  if (newValue === props.value) return
  
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ [props.columnKey]: newValue })
      .eq('id', props.taskId)
    
    if (error) throw error
    emit('update', newValue)
  } catch (err) {
    console.error(`[GenericTextCell] Error saving ${props.columnKey}:`, err)
  }
}

function cancel() {
  editing.value = false
}
</script>
