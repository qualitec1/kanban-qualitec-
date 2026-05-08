# Filtros Persistentes - LocalStorage

## Data: 08/05/2026

## Funcionalidade Implementada

Os filtros de tarefas agora são **salvos automaticamente no localStorage** e persistem mesmo após:
- ✅ Dar F5 (refresh da página)
- ✅ Fechar e abrir o navegador
- ✅ Fazer logout e login novamente
- ✅ Navegar entre diferentes boards

## Como Funciona

### 1. Salvamento Automático

Quando você aplica um filtro, ele é **automaticamente salvo** no localStorage:

```typescript
// Exemplo de filtro salvo
localStorage.setItem('board-filters-<board-id>', JSON.stringify({
  status: ['status-id-1', 'status-id-2'],
  priority: ['priority-id-1'],
  assignee: ['user-id-1'],
  timeline: ['overdue', 'today']
}))
```

### 2. Carregamento Automático

Quando você abre um board, os filtros são **automaticamente carregados**:

```typescript
// Ao abrir o board
const filters = loadFiltersFromStorage(boardId)
// Filtros são aplicados automaticamente
```

### 3. Filtros por Board

Cada board tem seus **próprios filtros independentes**:

- Board A: Filtros salvos em `board-filters-<board-a-id>`
- Board B: Filtros salvos em `board-filters-<board-b-id>`
- Board C: Filtros salvos em `board-filters-<board-c-id>`

Isso significa que você pode ter filtros diferentes em cada board!

## Arquivos Modificados

### 1. `app/composables/useTaskFilters.ts`

**Antes**: Filtros eram globais e não persistiam

**Depois**: Filtros são salvos por board no localStorage

```typescript
// Carregar filtros do localStorage
function loadFiltersFromStorage(boardId: string): TaskFilters {
  const stored = localStorage.getItem(`board-filters-${boardId}`)
  if (stored) {
    return JSON.parse(stored)
  }
  return { status: [], priority: [], assignee: [], timeline: [] }
}

// Salvar filtros no localStorage
function saveFiltersToStorage(boardId: string, filters: TaskFilters) {
  localStorage.setItem(`board-filters-${boardId}`, JSON.stringify(filters))
}

// Watch para salvar automaticamente quando mudar
watch(filters, (newFilters) => {
  saveFiltersToStorage(boardId, newFilters)
}, { deep: true })
```

### 2. `app/composables/useBoardPage.ts`

**Mudança**: Passa `boardId` para `useTaskFilters`

```typescript
// ANTES
const { filterTasks, hasActiveFilters, clearFilters } = useTaskFilters()

// DEPOIS
const { filterTasks, hasActiveFilters, clearFilters } = useTaskFilters(boardId)
```

### 3. `app/components/ColumnFilter.vue`

**Mudança**: Recebe `boardId` como prop

```typescript
// ANTES
const props = defineProps<{
  columnKey: keyof TaskFilters
  columnLabel: string
  options: Array<{ value: string; label: string }>
}>()

// DEPOIS
const props = defineProps<{
  boardId: string  // ✅ Novo
  columnKey: keyof TaskFilters
  columnLabel: string
  options: Array<{ value: string; label: string }>
}>()
```

### 4. `app/components/TaskGroupHeader.vue`

**Mudança**: Passa `boardId` para `ColumnFilter`

```vue
<!-- ANTES -->
<ColumnFilter
  :column-key="col.key as any"
  :column-label="col.label"
  :options="getFilterOptions(col.key)"
/>

<!-- DEPOIS -->
<ColumnFilter
  :board-id="boardId"  <!-- ✅ Novo -->
  :column-key="col.key as any"
  :column-label="col.label"
  :options="getFilterOptions(col.key)"
/>
```

## Estrutura do LocalStorage

### Chave
```
board-filters-<board-id>
```

### Valor (JSON)
```json
{
  "status": ["status-id-1", "status-id-2", "no-status"],
  "priority": ["priority-id-1", "no-priority"],
  "assignee": ["user-id-1", "user-id-2", "no-assignee"],
  "timeline": ["overdue", "today", "next-7-days"]
}
```

### Exemplo Real
```
Chave: board-filters-2428b9e8-9a9e-4e83-8c83-eceb68d1d663
Valor: {"status":["abc123"],"priority":[],"assignee":[],"timeline":["overdue"]}
```

## Cache de Filtros

Para melhorar a performance, os filtros são **cacheados em memória**:

```typescript
// Cache global por board
const filtersCache = new Map<string, typeof activeFilters>()

// Ao usar useTaskFilters(boardId)
if (!filtersCache.has(boardId)) {
  // Carregar do localStorage apenas uma vez
  const filters = ref(loadFiltersFromStorage(boardId))
  filtersCache.set(boardId, filters)
}
```

Isso evita múltiplas leituras do localStorage.

## Comportamento

### Cenário 1: Aplicar Filtro
1. Usuário clica em um filtro (ex: Status = "Em Progresso")
2. Filtro é aplicado instantaneamente na UI
3. Filtro é salvo automaticamente no localStorage
4. Tarefas são filtradas

### Cenário 2: Dar F5
1. Página recarrega
2. Board é carregado
3. Filtros são carregados do localStorage
4. Filtros são aplicados automaticamente
5. Tarefas aparecem já filtradas

### Cenário 3: Trocar de Board
1. Usuário navega para Board A
2. Filtros do Board A são carregados
3. Usuário navega para Board B
4. Filtros do Board B são carregados (diferentes do Board A)
5. Cada board mantém seus próprios filtros

### Cenário 4: Limpar Filtros
1. Usuário clica em "Limpar filtros"
2. Filtros são removidos da UI
3. LocalStorage é atualizado com filtros vazios
4. Todas as tarefas aparecem

### Cenário 5: Logout e Login
1. Usuário faz logout
2. Filtros permanecem no localStorage (não são apagados)
3. Usuário faz login novamente
4. Filtros são carregados automaticamente

## Vantagens

✅ **Persistência**: Filtros não são perdidos ao recarregar
✅ **Por Board**: Cada board tem seus próprios filtros
✅ **Automático**: Salvamento e carregamento automáticos
✅ **Performance**: Cache em memória evita leituras repetidas
✅ **Sincronização**: Watch reativo mantém localStorage atualizado

## Limitações

⚠️ **LocalStorage**: Limitado a ~5-10MB por domínio
⚠️ **Por Navegador**: Filtros não sincronizam entre dispositivos
⚠️ **Limpeza**: Limpar dados do navegador remove os filtros

## Testes

### Teste 1: Aplicar e Recarregar
1. Abra um board
2. Aplique um filtro (ex: Status = "Em Progresso")
3. Dê F5
4. ✅ Filtro deve estar aplicado

### Teste 2: Múltiplos Filtros
1. Aplique filtro de Status
2. Aplique filtro de Prioridade
3. Aplique filtro de Cronograma
4. Dê F5
5. ✅ Todos os filtros devem estar aplicados

### Teste 3: Trocar de Board
1. Board A: Aplique filtro de Status
2. Navegue para Board B
3. Board B: Aplique filtro de Prioridade
4. Volte para Board A
5. ✅ Board A deve ter filtro de Status
6. ✅ Board B deve ter filtro de Prioridade

### Teste 4: Limpar Filtros
1. Aplique vários filtros
2. Clique em "Limpar filtros"
3. Dê F5
4. ✅ Nenhum filtro deve estar aplicado

### Teste 5: Logout e Login
1. Aplique filtros
2. Faça logout
3. Faça login novamente
4. Abra o mesmo board
5. ✅ Filtros devem estar aplicados

## Verificação no Console

Para verificar os filtros salvos, abra o console do navegador:

```javascript
// Ver todos os filtros salvos
Object.keys(localStorage)
  .filter(key => key.startsWith('board-filters-'))
  .forEach(key => {
    console.log(key, JSON.parse(localStorage.getItem(key)))
  })

// Ver filtros de um board específico
const boardId = '2428b9e8-9a9e-4e83-8c83-eceb68d1d663'
console.log(JSON.parse(localStorage.getItem(`board-filters-${boardId}`)))

// Limpar filtros de um board
localStorage.removeItem(`board-filters-${boardId}`)

// Limpar todos os filtros
Object.keys(localStorage)
  .filter(key => key.startsWith('board-filters-'))
  .forEach(key => localStorage.removeItem(key))
```

## Build Status

✅ Build concluído com sucesso
✅ Sem erros de compilação
✅ Filtros persistentes implementados

## Próximos Passos

1. ✅ Testar filtros em diferentes boards
2. ✅ Testar F5 e reload
3. ✅ Testar logout e login
4. ⏳ Considerar sincronização entre dispositivos (futuro)
5. ⏳ Fazer commit quando tudo estiver funcionando
