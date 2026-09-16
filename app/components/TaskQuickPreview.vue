<template>
  <BaseDrawer :model-value="modelValue && !editingTask && !editingSubtask" title="Pré-visualização" size="lg" @update:model-value="$emit('update:modelValue', $event)">
    <div class="task-preview">
      <p v-if="loading" class="preview-loading" role="status">Atualizando informações…</p>
      <div v-if="error" class="preview-error" role="alert">{{ error }}<button type="button" @click="reload">Tentar novamente</button></div>
      <template v-if="item">
        <button v-if="activeSubtaskId" type="button" class="preview-back" @click="activeSubtaskId = null">← Voltar à tarefa principal</button>
        <div class="preview-heading">
          <span class="preview-eyebrow">{{ activeSubtaskId ? 'Subtarefa' : 'Tarefa' }}</span>
          <h3>{{ item.title }}</h3>
          <p v-if="activeSubtaskId" class="preview-parent">Em {{ task.title }}</p>
          <div class="preview-badges">
            <span class="preview-badge" :style="{ '--badge-color': status?.color || '#64748b' }">{{ status?.name || (activeSubtaskId && item.is_done ? 'Concluída' : 'Sem status') }}</span>
            <span class="preview-badge" :style="{ '--badge-color': priority?.color || '#64748b' }">{{ priority?.name || 'Sem prioridade' }}</span>
            <span v-if="isOverdue" class="preview-overdue">Prazo vencido</span>
            <span v-if="activeSubtaskId && item.is_done" class="preview-complete">✓ Concluída</span>
          </div>
        </div>
        <dl class="preview-facts">
          <div><dt>Início</dt><dd>{{ date(item.start_date) }}</dd></div>
          <div><dt>Prazo</dt><dd :class="{ overdue: isOverdue }">{{ date(item.due_date) }}</dd></div>
          <div v-if="item.budget != null"><dt>Orçamento</dt><dd>{{ money(item.budget) }}</dd></div>
          <div v-if="!activeSubtaskId && item.attachment_count != null"><dt>Arquivos</dt><dd>{{ item.attachment_count }} anexos</dd></div>
        </dl>
        <section class="preview-section">
          <h4>Responsáveis <span>{{ item.assignees?.length || 0 }}</span></h4>
          <div v-if="item.assignees?.length" class="preview-people">
            <div v-for="person in item.assignees" :key="person.id" class="preview-person">
              <img v-if="person.avatar_url" :src="person.avatar_url" alt="" />
              <span v-else class="preview-initial">{{ (person.full_name || person.email || '?').slice(0, 1).toUpperCase() }}</span>
              <span>{{ person.full_name || person.email || 'Sem nome' }}</span>
            </div>
          </div>
          <p v-else class="preview-empty">Nenhum responsável definido.</p>
        </section>
        <section class="preview-section"><h4>Descrição</h4><p class="preview-copy" :class="{ 'preview-empty': !item.description }">{{ item.description || 'Nenhuma descrição adicionada.' }}</p></section>
        <section v-if="item.notes" class="preview-section"><h4>Notas</h4><p class="preview-note preview-copy">{{ item.notes }}</p></section>
        <section v-if="!activeSubtaskId" class="preview-section">
          <h4>Subtarefas <span>{{ completed }}/{{ children.length }}</span></h4>
          <template v-if="children.length">
            <div class="preview-progress" role="progressbar" aria-label="Conclusão das subtarefas" :aria-valuenow="completed" :aria-valuemax="children.length" :aria-valuemin="0"><i :style="{ width: progress + '%' }" /></div>
            <p class="preview-progress-label">{{ progress }}% concluído</p>
            <button v-for="child in children" :key="child.id" type="button" class="preview-child" @click="activeSubtaskId = child.id">
              <span class="preview-check" :class="{ done: child.is_done }">{{ child.is_done ? '✓' : '○' }}</span>
              <span class="preview-child-content"><strong>{{ child.title }}</strong><small>{{ child.is_done ? 'Concluída' : 'Pendente' }} · {{ date(child.due_date) }}</small><small v-if="child.assignees?.length">{{ child.assignees.map(a => a.full_name || a.email).join(', ') }}</small></span>
              <span aria-hidden="true">›</span>
            </button>
          </template>
          <p v-else class="preview-empty">Esta tarefa ainda não tem subtarefas.</p>
        </section>
        <details v-if="extraFields.length" class="preview-extra"><summary>Informações adicionais <span>{{ extraFields.length }}</span></summary><dl><div v-for="field in extraFields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl></details>
      </template>
      <p v-else-if="!loading && !error" class="preview-empty">Esta subtarefa não está mais disponível.</p>
    </div>
    <template #footer>
      <button type="button" class="preview-close" @click="$emit('update:modelValue', false)">Fechar</button>
      <button v-if="item && canEdit && !loading && !error" type="button" class="preview-edit" @click="openEditor">Editar {{ activeSubtaskId ? 'subtarefa' : 'tarefa' }}</button>
    </template>
  </BaseDrawer>
  <TaskModal v-if="editingTask" :model-value="true" :task-id="taskId" :board-id="boardId" :initial-task="task" @update:model-value="closeEditor" @updated="changed = true" @deleted="taskDeleted" />
  <SubtaskModal v-if="editingSubtask && item" :model-value="true" :subtask-id="activeSubtaskId!" :task-id="taskId" :board-id="boardId" :initial-subtask="item" @update:model-value="closeEditor" @updated="changed = true" @deleted="subtaskDeleted" />
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useTaskPreview } from '~/composables/useTaskPreview'
const props = defineProps<{ modelValue: boolean; taskId: string; boardId: string; initialTask?: any; initialSubtaskId?: string | null; canEdit?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; updated: []; deleted: [id: string] }>()
const { task, statuses, priorities, loading, error, load } = useTaskPreview()
const activeSubtaskId = ref<string | null>(props.initialSubtaskId || null)
const editingTask = ref(false)
const editingSubtask = ref(false)
const changed = ref(false)
const children = computed<any[]>(() => task.value?.subtasks || [])
const item = computed(() => activeSubtaskId.value ? children.value.find(s => s.id === activeSubtaskId.value) : task.value)
const status = computed(() => statuses.value.find(s => s.id === item.value?.status_id))
const priority = computed(() => priorities.value.find(p => p.id === item.value?.priority_id))
const completed = computed(() => children.value.filter(s => s.is_done).length)
const progress = computed(() => children.value.length ? Math.round(completed.value / children.value.length * 100) : 0)
const isOverdue = computed(() => {
  if (!item.value?.due_date || item.value.is_done || status.value?.is_done) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(item.value.due_date.slice(0, 10) + 'T00:00:00') < today
})
const extraFields = computed(() => {
  if (!item.value) return []
  const keys = [['email', 'E-mail'], ['phone', 'Telefone'], ['account', 'Conta'], ['deal', 'Negociação'], ['deal_value', 'Valor da negociação'], ['task_type', 'Tipo'], ['job_title', 'Cargo'], ['comments', 'Comentários']]
  return keys.filter(([key]) => item.value[key] != null && item.value[key] !== '').map(([key, label]) => ({ label, value: key === 'deal_value' ? money(item.value[key]) : item.value[key] }))
})
function date(value?: string | null) {
  if (!value) return 'Não definido'
  const result = new Date(value.slice(0, 10) + 'T00:00:00')
  return Number.isNaN(result.getTime()) ? 'Não definido' : result.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function money(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }
function reload() { return load(props.taskId, props.boardId, task.value || props.initialTask) }
function openEditor() { if (!props.canEdit) return; if (activeSubtaskId.value) editingSubtask.value = true; else editingTask.value = true }
async function closeEditor() {
  editingTask.value = false; editingSubtask.value = false
  if (changed.value) { changed.value = false; emit('updated'); await reload() }
}
function taskDeleted() { emit('deleted', props.taskId); emit('update:modelValue', false) }
function subtaskDeleted() { activeSubtaskId.value = null; changed.value = true; closeEditor() }
watch(() => [props.modelValue, props.taskId, props.initialSubtaskId] as const, ([open]) => {
  if (open) { activeSubtaskId.value = props.initialSubtaskId || null; load(props.taskId, props.boardId, props.initialTask) }
}, { immediate: true })
watch(activeSubtaskId, async () => { await nextTick(); document.querySelector('.task-preview')?.parentElement?.scrollTo?.({ top: 0 }) })
</script>

<style scoped>
.task-preview { color:#334155; font-size:14px; }
.preview-heading { padding-bottom:22px; }
.preview-eyebrow { color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
.preview-heading h3 { font-size:24px; line-height:1.35; font-weight:650; color:#0f172a; margin:8px 0 14px; overflow-wrap:anywhere; }
.preview-parent { color:#64748b; font-size:12px; margin-bottom:12px; overflow-wrap:anywhere; }
.preview-badges { display:flex; flex-wrap:wrap; gap:8px; }
.preview-badge { padding:5px 9px; font-size:12px; font-weight:600; border-radius:7px; background:color-mix(in srgb,var(--badge-color) 12%,white); color:color-mix(in srgb,var(--badge-color) 65%,#0f172a); }
.preview-overdue, .preview-complete { padding:5px 9px; border-radius:7px; font-size:12px; background:#fff1f2; color:#be123c; }
.preview-complete { background:#ecfdf5; color:#047857; }
.preview-facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; padding:20px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; }
dt { font-size:11px; color:#64748b; margin-bottom:5px; }
dd { font-weight:550; overflow-wrap:anywhere; }
.overdue { color:#be123c; }
.preview-section { margin-top:26px; }
.preview-section h4 { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:650; color:#0f172a; margin-bottom:12px; }
.preview-section h4 span, summary span { font-size:11px; padding:2px 7px; border-radius:6px; color:#64748b; background:#f1f5f9; }
.preview-copy { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.7; font-size:13px; }
.preview-empty { color:#64748b; font-size:13px; }
.preview-note { background:#fffbeb; border:1px solid #fef3c7; border-radius:10px; padding:14px; }
.preview-people { display:flex; flex-wrap:wrap; gap:8px; }
.preview-person { display:flex; align-items:center; gap:8px; border:1px solid #e2e8f0; border-radius:24px; padding:4px 10px 4px 4px; max-width:100%; font-size:12px; }
.preview-person > span:last-child { overflow-wrap:anywhere; min-width:0; }
.preview-person img, .preview-initial { width:28px; height:28px; flex:0 0 28px; border-radius:50%; object-fit:cover; background:#e2e8f0; display:flex; align-items:center; justify-content:center; }
.preview-progress { height:6px; border-radius:8px; background:#e2e8f0; overflow:hidden; }
.preview-progress i { display:block; height:100%; background:#10b981; border-radius:8px; }
.preview-progress-label { font-size:11px; color:#64748b; margin:7px 0 12px; }
.preview-child { width:100%; display:flex; text-align:left; align-items:center; gap:12px; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-top:8px; }
.preview-child:hover { background:#f8fafc; border-color:#94a3b8; }
.preview-check { width:24px; height:24px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#f1f5f9; color:#64748b; }
.preview-check.done { background:#ecfdf5; color:#047857; }
.preview-child-content { flex:1; min-width:0; }
.preview-child strong { display:block; font-size:13px; font-weight:550; overflow-wrap:anywhere; }
.preview-child small { display:block; font-size:11px; color:#64748b; margin-top:4px; overflow-wrap:anywhere; }
.preview-extra { margin-top:26px; border-top:1px solid #e2e8f0; padding-top:16px; }
.preview-extra summary { cursor:pointer; font-size:13px; font-weight:600; }
.preview-extra dl { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-top:16px; font-size:13px; }
.preview-close, .preview-edit { border-radius:9px; font-size:13px; padding:10px 16px; }
.preview-close { border:1px solid #e2e8f0; color:#475569; }
.preview-edit { background:#1e355d; color:white; }
.preview-back { font-size:12px; color:#475569; margin-bottom:20px; }
.preview-loading { color:#64748b; font-size:12px; margin-bottom:16px; }
.preview-error { background:#fff1f2; color:#9f1239; border-radius:10px; padding:14px; margin-bottom:20px; font-size:13px; }
.preview-error button { display:block; text-decoration:underline; margin-top:8px; }
button:focus-visible, summary:focus-visible { outline:2px solid #2563eb; outline-offset:3px; }
</style>
