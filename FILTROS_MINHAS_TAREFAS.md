# Filtros na Página "Minhas Tarefas"

## Data: 08/05/2026

## Funcionalidade Implementada

Adicionados **filtros persistentes** na página "Minhas Tarefas" com as seguintes características:

✅ **4 tipos de filtros**: Board, Status, Prioridade e Vencimento
✅ **Persistência**: Salvos no localStorage, permanecem após F5 e logout
✅ **Busca de boards**: Campo de busca para filtrar boards por nome
✅ **Estatísticas dinâmicas**: Cards de estatísticas atualizam conforme filtros
✅ **Estados vazios**: Mensagens diferentes para "sem tarefas" vs "sem resultados com filtros"

## Arquivos Criados

### 1. `app/composables/useMyTasksFilters.ts`

Composable para gerenciar filtros da página "Minhas Tarefas":

```typescript
export interface MyTasksFilters {
  board: string[]      // IDs dos boards
  status: string[]     // IDs dos status + 'no-status'
  priority: string[]   // IDs das prioridades + 'no-priority'
  timeline: string[]   // 'no-date', 'overdue', 'today', 'next-7-days', 'next-30-days'
}
```

**Funcionalidades**:
- `toggleFilter()` - Adiciona/remove filtro
- `isFilterActive()` - Verifica se filtro está ativo
- `getActiveFiltersCount()` - Conta filtros ativos por coluna
- `clearFilters()` - Limpa todos os filtros
- `clearColumnFilters()` - Limpa filtros de uma coluna
- `filterTasks()` - Aplica filtros nas tarefas

**Persistência**:
- Salva em `localStorage` com chave `my-tasks-filters`
- Watch automático salva mudanças instantaneamente

### 2. `app/components/MyTasksFilter.vue`

Componente de filtro dropdown com:

- **Botão com badge**: Mostra quantidade de filtros ativos
- **Dropdown com checkboxes**: Lista de opções para selecionar
- **Campo de busca**: Apenas para filtro de Board
- **Botão "Limpar"**: Remove filtros da coluna
- **Teleport to body**: Dropdown não é cortado por overflow

### 3. `app/pages/index.vue` (atualizado)

Página "Minhas Tarefas" com filtros integrados:

- **Seção de filtros**: 4 botões de filtro acima da tabela
- **Botão "Limpar todos"**: Remove todos os filtros de uma vez
- **Tarefas filtradas**: Tabela mostra apenas tarefas que passam pelos filtros
- **Estatísticas filtradas**: Cards atualizam baseado nas tarefas filtradas

## Tipos de Filtros

### 1. Filtro de Board
- Lista todos os boards que têm tarefas do usuário
- Campo de busca para encontrar boards rapidamente
- Ordenado alfabeticamente

**Exemplo**:
```
☐ Marco - Tarefas
☐ Clientes Potencial / Visitas
☐ RH
```

### 2. Filtro de Status
- Lista todos os status encontrados nas tarefas
- Opção "Sem status" para tarefas sem status
- Ordenado pela ordem dos status

**Exemplo**:
```
☐ Sem status
☐ Em andamento
☐ Concluído
☐ Atrasado
```

### 3. Filtro de Prioridade
- Lista todas as prioridades encontradas nas tarefas
- Opção "Sem prioridade" para tarefas sem prioridade
- Ordenado pela ordem das prioridades

**Exemplo**:
```
☐ Sem prioridade
☐ Crítica
☐ Alta
☐ Média
☐ Baixa
```

### 4. Filtro de Vencimento
- Opções fixas para filtrar por data de vencimento
- Não depende dos dados das tarefas

**Opções**:
```
☐ Sem prazo
☐ Atrasado
☐ Hoje
☐ Próximos 7 dias
☐ Próximos 30 dias
```

## Comportamento dos Filtros

### Lógica AND
Todos os filtros devem ser satisfeitos (lógica AND):

**Exemplo**:
- Filtro Board: "Marco - Tarefas"
- Filtro Status: "Em andamento"
- Filtro Prioridade: "Alta"

**Resultado**: Apenas tarefas que são do board "Marco - Tarefas" **E** têm status "Em andamento" **E** têm prioridade "Alta"

### Múltiplas Seleções na Mesma Coluna
Dentro da mesma coluna, funciona como OR:

**Exemplo**:
- Filtro Status: "Em andamento" + "Atrasado"

**Resultado**: Tarefas que têm status "Em andamento" **OU** "Atrasado"

## Persistência no LocalStorage

### Chave
```
my-tasks-filters
```

### Valor (JSON)
```json
{
  "board": ["board-id-1", "board-id-2"],
  "status": ["status-id-1", "no-status"],
  "priority": ["priority-id-1"],
  "timeline": ["overdue", "today"]
}
```

### Exemplo Real
```json
{
  "board": ["2428b9e8-9a9e-4e83-8c83-eceb68d1d663"],
  "status": [],
  "priority": ["abc123"],
  "timeline": ["overdue"]
}
```

## Estatísticas Dinâmicas

Os cards de estatísticas atualizam baseado nas **tarefas filtradas**:

### Sem Filtros
```
Total: 19
Críticas: 5
Vencendo Hoje: 0
Atrasadas: 1
```

### Com Filtros (ex: Board = "Marco - Tarefas")
```
Total: 8
Críticas: 2
Vencendo Hoje: 0
Atrasadas: 1
```

## Estados Vazios

### Sem Tarefas (sem filtros)
```
🗂️ Nenhuma tarefa encontrada
Você não tem tarefas criadas ou atribuídas
```

### Sem Resultados (com filtros)
```
🔍 Nenhuma tarefa encontrada com os filtros aplicados
[Botão: Limpar filtros]
```

## Interface Visual

### Botões de Filtro
- **Inativo**: Borda cinza, fundo branco
- **Ativo**: Borda azul (#1C325C), fundo azul claro, badge com contagem

### Dropdown
- **Cabeçalho**: Nome do filtro + botão "Limpar"
- **Campo de busca**: Apenas para Board
- **Checkboxes**: Lista de opções
- **Scroll**: Máximo 300px de altura

### Botão "Limpar todos os filtros"
- Aparece apenas quando há filtros ativos
- Fica no canto superior direito da seção de filtros

## Testes

### Teste 1: Aplicar Filtro de Board
1. Clique em "Filtrar por board"
2. Selecione um board
3. ✅ Tabela deve mostrar apenas tarefas daquele board
4. ✅ Estatísticas devem atualizar
5. ✅ Badge deve mostrar "1"

### Teste 2: Aplicar Múltiplos Filtros
1. Selecione um board
2. Selecione um status
3. Selecione uma prioridade
4. ✅ Tabela deve mostrar apenas tarefas que atendem TODOS os critérios
5. ✅ Badges devem mostrar contagens corretas

### Teste 3: Buscar Board
1. Clique em "Filtrar por board"
2. Digite parte do nome de um board
3. ✅ Lista deve filtrar mostrando apenas boards que contêm o texto

### Teste 4: Limpar Filtro de Coluna
1. Aplique filtros em várias colunas
2. Clique em "Limpar" em uma coluna específica
3. ✅ Apenas filtros daquela coluna devem ser removidos
4. ✅ Outros filtros devem permanecer

### Teste 5: Limpar Todos os Filtros
1. Aplique filtros em várias colunas
2. Clique em "Limpar todos os filtros"
3. ✅ Todos os filtros devem ser removidos
4. ✅ Todas as tarefas devem aparecer

### Teste 6: Persistência após F5
1. Aplique filtros
2. Dê F5
3. ✅ Filtros devem estar aplicados
4. ✅ Tarefas devem estar filtradas

### Teste 7: Persistência após Logout
1. Aplique filtros
2. Faça logout
3. Faça login novamente
4. Acesse "Minhas Tarefas"
5. ✅ Filtros devem estar aplicados

## Verificação no Console

Para verificar os filtros salvos:

```javascript
// Ver filtros salvos
console.log(JSON.parse(localStorage.getItem('my-tasks-filters')))

// Limpar filtros
localStorage.removeItem('my-tasks-filters')
```

## Diferenças vs Filtros de Board

| Característica | Filtros de Board | Filtros "Minhas Tarefas" |
|----------------|------------------|--------------------------|
| **Chave localStorage** | `board-filters-<board-id>` | `my-tasks-filters` |
| **Escopo** | Por board (independentes) | Global (uma única instância) |
| **Filtro de Board** | ❌ Não tem | ✅ Tem (com busca) |
| **Filtro de Responsável** | ✅ Tem | ❌ Não tem (todas são do usuário) |
| **Componente** | `ColumnFilter.vue` | `MyTasksFilter.vue` |
| **Composable** | `useTaskFilters(boardId)` | `useMyTasksFilters()` |

## Build Status

✅ Build concluído com sucesso
✅ Sem erros de compilação
✅ Filtros persistentes implementados
✅ Busca de boards funcionando
✅ Estatísticas dinâmicas funcionando

## Próximos Passos

1. ✅ Testar filtros na página "Minhas Tarefas"
2. ✅ Testar persistência após F5
3. ✅ Testar persistência após logout
4. ✅ Testar busca de boards
5. ⏳ Fazer commit quando tudo estiver funcionando
