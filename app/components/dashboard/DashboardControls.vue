<template>
  <BaseModal :model-value="panel !== null" :title="title" size="lg" @update:model-value="emit('close')">
    <div v-if="panel === 'people'" class="space-y-4">
      <p class="text-sm text-neutral-500">Mostre tarefas de qualquer uma das pessoas selecionadas. A seleção vale para todos os indicadores.</p>
      <label class="block text-sm font-medium">Buscar pessoa
        <input v-model="peopleSearch" type="search" class="control mt-1" placeholder="Nome do responsável" />
      </label>
      <button type="button" class="text-sm text-primary-600" @click="draftFilters.people = []">Limpar seleção de pessoas</button>
      <div class="max-h-64 overflow-y-auto space-y-1">
        <label v-for="person in visiblePeople" :key="person.userId" class="flex items-center gap-3 rounded-lg p-3 hover:bg-neutral-50 cursor-pointer">
          <input v-model="draftFilters.people" type="checkbox" :value="person.userId" class="h-4 w-4" />
          <span class="flex-1">{{ person.userName }}</span>
          <span class="text-xs text-neutral-500">{{ person.taskCount }} tarefa(s)</span>
        </label>
        <p v-if="!visiblePeople.length" class="py-6 text-center text-sm text-neutral-500">Nenhum responsável encontrado nos quadros conectados.</p>
      </div>
      <p class="text-xs text-neutral-500">{{ draftFilters.people.length }} selecionado(s). Sem seleção, todas as pessoas são incluídas.</p>
    </div>

    <div v-else-if="panel === 'filters'" class="space-y-5">
      <p class="text-sm text-neutral-500">Combine os filtros abaixo. Eles também respeitam a busca e a seleção de pessoas.</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-sm font-medium">Conclusão
          <select v-model="draftFilters.completion" class="control mt-1"><option value="all">Todas as tarefas</option><option value="open">Não concluídas</option><option value="done">Concluídas</option></select>
        </label>
        <label class="text-sm font-medium">Prazo
          <select v-model="draftFilters.due" class="control mt-1" @change="clearDatesForNoDate"><option value="all">Qualquer prazo</option><option value="overdue">Atrasadas e não concluídas</option><option value="today">Vencem hoje</option><option value="next7">Hoje e próximos 7 dias</option><option value="no_date">Sem prazo</option></select>
        </label>
        <label class="text-sm font-medium">Vencimento a partir de
          <input v-model="draftFilters.from" type="date" :disabled="draftFilters.due === 'no_date'" class="control mt-1" />
        </label>
        <label class="text-sm font-medium">Vencimento até
          <input v-model="draftFilters.to" type="date" :disabled="draftFilters.due === 'no_date'" class="control mt-1" />
        </label>
      </div>
      <p v-if="invalidDates" role="alert" class="text-sm text-red-600">A data final deve ser igual ou posterior à data inicial.</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <fieldset><legend class="text-sm font-medium mb-2">Status</legend>
          <div class="max-h-40 overflow-auto space-y-2">
            <label v-for="item in statuses" :key="item.id" class="flex items-center gap-2 text-sm"><input v-model="draftFilters.statuses" type="checkbox" :value="item.id" />{{ item.name }}</label>
            <p v-if="!statuses.length" class="text-sm text-neutral-500">Nenhum status disponível.</p>
          </div>
        </fieldset>
        <fieldset><legend class="text-sm font-medium mb-2">Prioridade</legend>
          <div class="max-h-40 overflow-auto space-y-2">
            <label v-for="item in priorities" :key="item.id" class="flex items-center gap-2 text-sm"><input v-model="draftFilters.priorities" type="checkbox" :value="item.id" />{{ item.name }}</label>
            <p v-if="!priorities.length" class="text-sm text-neutral-500">Nenhuma prioridade disponível.</p>
          </div>
        </fieldset>
      </div>
      <button type="button" class="text-sm text-primary-600" @click="clearAdvanced">Limpar filtros avançados</button>
    </div>

    <div v-else-if="panel === 'settings'" class="space-y-5">
      <p class="text-sm text-neutral-500">Suas preferências são salvas neste navegador para a sua conta.</p>
      <label class="block text-sm font-medium">Período de próximos vencimentos
        <select v-model.number="draftSettings.upcomingDays" class="control mt-1"><option v-for="days in [7, 14, 30, 60, 90]" :key="days" :value="days">Próximos {{ days }} dias</option></select>
      </label>
      <label class="block text-sm font-medium">Atualização dos dados
        <select v-model.number="draftSettings.refreshSeconds" class="control mt-1"><option :value="0">Manual</option><option :value="60">A cada minuto</option><option :value="300">A cada 5 minutos</option></select>
      </label>
      <label class="flex items-start gap-3 text-sm"><input v-model="draftSettings.lockLayout" type="checkbox" class="mt-1" /><span><strong>Bloquear posição e tamanho dos widgets</strong><br /><span class="text-neutral-500">Evita mudanças acidentais ao consultar o painel.</span></span></label>
      <label class="flex items-start gap-3 text-sm"><input v-model="reorganize" type="checkbox" class="mt-1" /><span><strong>Reorganizar widgets ao salvar</strong><br /><span class="text-neutral-500">Distribui os widgets em colunas, preservando os títulos e o conteúdo.</span></span></label>
    </div>
    <template #footer>
      <button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="emit('close')">Cancelar</button>
      <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50" :disabled="panel === 'filters' && invalidDates" @click="apply">{{ panel === 'settings' ? 'Salvar configurações' : 'Aplicar filtros' }}</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '../BaseModal.vue'
import { defaultDashboardFilters, defaultDashboardSettings } from '../../utils/dashboard'
import type { AssigneeData, DashboardFilters, DashboardSettings } from '../../utils/dashboard'
const props = defineProps<{
  panel: 'people' | 'filters' | 'settings' | null
  filters: DashboardFilters
  settings: DashboardSettings
  people: AssigneeData[]
  statuses: { id: string; name: string }[]
  priorities: { id: string; name: string }[]
}>()
const emit = defineEmits<{
  close: []
  'apply-filters': [filters: DashboardFilters]
  'apply-settings': [settings: DashboardSettings]
  reorganize: []
}>()
const draftFilters = ref(defaultDashboardFilters())
const draftSettings = ref(defaultDashboardSettings())
const peopleSearch = ref('')
const reorganize = ref(false)
const title = computed(() => props.panel === 'people' ? 'Filtrar por pessoas' : props.panel === 'filters' ? 'Filtros avançados' : 'Configurações do dashboard')
const visiblePeople = computed(() => props.people.filter(p => p.userName.toLocaleLowerCase().includes(peopleSearch.value.trim().toLocaleLowerCase())))
const invalidDates = computed(() => !!(draftFilters.value.from && draftFilters.value.to && draftFilters.value.from > draftFilters.value.to))
watch(() => props.panel, () => {
  draftFilters.value = { ...props.filters, people: [...props.filters.people], statuses: [...props.filters.statuses], priorities: [...props.filters.priorities] }
  draftSettings.value = { ...props.settings }
  peopleSearch.value = ''
  reorganize.value = false
}, { immediate: true })
function clearDatesForNoDate() {
  if (draftFilters.value.due === 'no_date') { draftFilters.value.from = ''; draftFilters.value.to = '' }
}
function clearAdvanced() {
  draftFilters.value = { ...defaultDashboardFilters(), people: draftFilters.value.people, search: draftFilters.value.search }
}
function apply() {
  if (props.panel === 'settings') {
    emit('apply-settings', { ...draftSettings.value })
    if (reorganize.value) emit('reorganize')
  } else {
    if (props.panel === 'filters' && invalidDates.value) return
    emit('apply-filters', { ...draftFilters.value })
  }
  emit('close')
}
</script>
<style scoped>
.control { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.625rem; background: white; font-weight: 400; }
.control:focus { outline: 2px solid #6366f1; outline-offset: 2px; }
.control:disabled { background: #f3f4f6; }
</style>
