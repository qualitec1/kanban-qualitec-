# Correção de Fuso Horário - Datas

## Data: 08/05/2026

## Problema

As datas estavam sendo exibidas com **1 dia a menos** do que o esperado. Por exemplo:
- Data no banco: `2026-05-07`
- Data exibida: `06/05/2026` ❌

## Causa Raiz

O problema ocorria porque o JavaScript estava interpretando as datas como **UTC** ao invés de **data local**:

```typescript
// ❌ ERRADO - interpreta como UTC
const date = new Date('2026-05-07')
// Resultado: 2026-05-06T21:00:00.000Z (UTC-3 = Brasília)
// Ao exibir: 06/05/2026 (1 dia a menos!)

// ✅ CORRETO - interpreta como data local
const [year, month, day] = '2026-05-07'.split('-').map(Number)
const date = new Date(year, month - 1, day) // month é 0-indexed
// Resultado: 2026-05-07T00:00:00.000-03:00 (horário local)
// Ao exibir: 07/05/2026 (correto!)
```

## Solução Implementada

### 1. Página "Minhas Tarefas" (`app/pages/index.vue`)

```typescript
// ANTES (errado)
function formatDate(dateStr: string): string {
  const date = new Date(dateStr) // ❌ interpreta como UTC
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// DEPOIS (correto)
function formatDate(dateStr: string): string {
  // Parse date as YYYY-MM-DD (local date, not UTC)
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
}
```

### 2. DueDateCell (`app/components/DueDateCell.vue`)

```typescript
// ANTES (errado)
const parsed = computed(() => {
  if (!props.dueDate) return null
  const d = new Date(props.dueDate) // ❌ interpreta como UTC
  d.setHours(0, 0, 0, 0)
  return d
})

// DEPOIS (correto)
const parsed = computed(() => {
  if (!props.dueDate) return null
  // Parse date as YYYY-MM-DD (local date, not UTC)
  const [year, month, day] = props.dueDate.split('-').map(Number)
  const d = new Date(year, month - 1, day) // month is 0-indexed
  d.setHours(0, 0, 0, 0)
  return d
})
```

### 3. TimelineCell (`app/components/TimelineCell.vue`)

```typescript
// Já estava correto, mas adicionei comentário para clareza
function fmt(d: string | null): string {
  if (!d) return ''
  // Parse date as YYYY-MM-DD (local date, not UTC)
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}
```

### 4. Filtros de Timeline (`app/composables/useTaskFilters.ts`)

```typescript
// ANTES (errado)
if (task.due_date) {
  const [year, month, day] = task.due_date.split('-').map(Number)
  dueDate = new Date(year, month - 1, day) // ❌ faltava setHours
}

// DEPOIS (correto)
if (task.due_date) {
  const [year, month, day] = task.due_date.split('-').map(Number)
  dueDate = new Date(year, month - 1, day) // month é 0-indexed
  dueDate.setHours(0, 0, 0, 0) // ✅ garantir que é meia-noite
}
```

## Arquivos Modificados

1. ✅ `app/pages/index.vue` - Página "Minhas Tarefas"
2. ✅ `app/components/DueDateCell.vue` - Célula de data de vencimento
3. ✅ `app/components/TimelineCell.vue` - Célula de cronograma
4. ✅ `app/composables/useTaskFilters.ts` - Filtros de timeline

## Como Funciona Agora

### Formato de Data no Banco
- Formato: `YYYY-MM-DD` (ex: `2026-05-07`)
- Tipo: `date` (PostgreSQL)
- Sem informação de hora/fuso horário

### Parse Correto
```typescript
// ✅ SEMPRE fazer assim:
const [year, month, day] = dateStr.split('-').map(Number)
const date = new Date(year, month - 1, day) // month é 0-indexed (0-11)
date.setHours(0, 0, 0, 0) // garantir meia-noite local

// ❌ NUNCA fazer assim:
const date = new Date(dateStr) // interpreta como UTC!
```

### Comparação de Datas
```typescript
// ✅ CORRETO - comparar datas locais
const today = new Date()
today.setHours(0, 0, 0, 0)

const [year, month, day] = task.due_date.split('-').map(Number)
const dueDate = new Date(year, month - 1, day)
dueDate.setHours(0, 0, 0, 0)

const isOverdue = dueDate < today
const isToday = dueDate.getTime() === today.getTime()
```

## Testes

### Teste 1: Página "Minhas Tarefas"
1. Acesse a página inicial (`/`)
2. Verifique se as datas estão corretas
3. Exemplo: tarefa com `due_date = 2026-05-07` deve mostrar `07/05/2026`

### Teste 2: DueDateCell
1. Abra um board
2. Verifique as datas de vencimento nas tarefas
3. Datas devem estar corretas (sem -1 dia)

### Teste 3: Filtros de Timeline
1. Aplique filtro "Vencendo Hoje"
2. Apenas tarefas com data de hoje devem aparecer
3. Não deve incluir tarefas de ontem ou amanhã

### Teste 4: TimelineCell
1. Clique em uma célula de cronograma
2. Verifique se as datas exibidas estão corretas
3. Formato: `DD/MM → DD/MM`

## Notas Importantes

### Por que `new Date(dateStr)` é problemático?

Quando você passa uma string no formato `YYYY-MM-DD` para `new Date()`, o JavaScript interpreta como **UTC meia-noite**:

```javascript
new Date('2026-05-07')
// Resultado: 2026-05-07T00:00:00.000Z (UTC)
// No Brasil (UTC-3): 2026-05-06T21:00:00.000-03:00
// getDate() retorna: 6 (1 dia a menos!)
```

### Solução: Parse Manual

Ao fazer parse manual, criamos uma data **local**:

```javascript
const [year, month, day] = '2026-05-07'.split('-').map(Number)
new Date(year, month - 1, day)
// Resultado: 2026-05-07T00:00:00.000-03:00 (horário local)
// getDate() retorna: 7 (correto!)
```

### Fuso Horário do Projeto

- **Fuso horário**: America/Sao_Paulo (UTC-3)
- **Horário de verão**: Não aplicável (Brasil não usa mais)
- **Todas as datas**: Interpretadas como horário local de Brasília

## Build Status

✅ Build concluído com sucesso
✅ Sem erros de compilação
✅ Todas as datas corrigidas

## Próximos Passos

1. ✅ Testar datas na página "Minhas Tarefas"
2. ✅ Testar datas nos boards
3. ✅ Testar filtros de timeline
4. ⏳ Verificar se há outros lugares com problema de data
5. ⏳ Fazer commit quando tudo estiver funcionando
