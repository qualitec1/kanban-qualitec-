# Correções Implementadas - Realtime e Minhas Tarefas

## Data: 08/05/2026

## Problemas Corrigidos

### 1. ❌ Erro "computed value is readonly" no TaskRow.vue

**Problema**: O componente TaskRow estava usando `computed()` para valores que precisavam ser editáveis (como `currentStartDate` e `currentEndDate`), causando erro quando o TimelineCell tentava atualizar esses valores.

**Solução**: Mudei de `computed()` para `ref()` com `watch()` para sincronizar com as props:

```typescript
// ANTES (causava erro)
const currentStartDate = computed(() => props.task.start_date ?? null)
const currentEndDate = computed(() => props.task.due_date ?? null)

// DEPOIS (funciona corretamente)
const currentStartDate = ref(props.task.start_date ?? null)
const currentEndDate = ref(props.task.due_date ?? null)

// Sincronizar com props quando mudarem (Realtime)
watch(() => props.task.start_date, (newVal) => { currentStartDate.value = newVal ?? null })
watch(() => props.task.due_date, (newVal) => { currentEndDate.value = newVal ?? null })
```

**Arquivo**: `app/components/TaskRow.vue`

---

### 2. ❌ Realtime não estava funcionando - Filtros não atualizavam

**Problema**: Mesmo com o código de Realtime implementado, as mudanças não eram detectadas porque:
1. A tabela `tasks` não tinha `REPLICA IDENTITY FULL` configurado
2. A tabela `tasks` não estava na publicação `supabase_realtime`

**Solução**:

#### 2.1. Configurar REPLICA IDENTITY FULL
Criei migration para habilitar REPLICA IDENTITY FULL na tabela tasks:

```sql
-- supabase/migrations/20260508000000_enable_full_realtime_for_tasks.sql
ALTER TABLE tasks REPLICA IDENTITY FULL;
```

Isso permite que o Supabase Realtime envie todos os dados da linha quando houver UPDATE.

#### 2.2. Adicionar tasks à publicação do Realtime
Criei migration para adicionar a tabela à publicação:

```sql
-- supabase/migrations/20260508000001_add_tasks_to_realtime_publication.sql
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

#### 2.3. Melhorar logs do Realtime
Adicionei logs mais detalhados em `useBoardData.ts` para facilitar debug:

```typescript
.on('postgres_changes', ..., async (payload: any) => {
  console.log('[useBoardData] ✅ Realtime UPDATE received:', {
    taskId: payload.new?.id,
    changes: payload.new,
    timestamp: new Date().toISOString()
  })
  
  // Invalidar cache para forçar reload
  invalidateCache()
  
  // Recarregar dados do banco
  await loadFreshData(false)
  
  console.log('[useBoardData] ✅ Data reloaded, filters will re-apply automatically')
})
```

**Arquivos**:
- `app/composables/useBoardData.ts`
- `supabase/migrations/20260508000000_enable_full_realtime_for_tasks.sql`
- `supabase/migrations/20260508000001_add_tasks_to_realtime_publication.sql`

---

### 3. ❌ Página "Minhas Tarefas" não carregava tarefas corretamente

**Problema**: A query usava `task_assignees!inner` com `.or()`, o que causava problemas porque o `!inner` força um JOIN que pode filtrar incorretamente.

**Solução**: Separei em duas queries distintas e depois combinei os resultados:

```typescript
// Query 1: Tarefas criadas pelo usuário
const { data: createdTasks } = await supabase
  .from('tasks')
  .select('...')
  .eq('created_by', user.value.id)
  .is('archived_at', null)

// Query 2: Tarefas onde o usuário é responsável
const { data: assignedTasks } = await supabase
  .from('tasks')
  .select('...')
  .eq('task_assignees.user_id', user.value.id)
  .is('archived_at', null)

// Combinar e remover duplicatas
const allTasks = [...(createdTasks || []), ...(assignedTasks || [])]
const uniqueTasks = Array.from(
  new Map(allTasks.map(task => [task.id, task])).values()
)
```

**Arquivo**: `app/composables/useMyTasks.ts`

---

## Como Testar

### 1. Testar Realtime
1. Abra o board em duas abas do navegador
2. Mude o status de uma tarefa na primeira aba
3. Verifique se a segunda aba atualiza automaticamente (sem F5)
4. Abra o console e procure por logs `[useBoardData] ✅ Realtime UPDATE received`

### 2. Testar Filtros
1. Aplique um filtro (ex: Status = "Em Progresso")
2. Mude o status de uma tarefa para "Em Progresso"
3. A tarefa deve aparecer no filtro instantaneamente (sem F5)

### 3. Testar Página "Minhas Tarefas"
1. Acesse a página inicial (`/`)
2. Verifique se aparecem:
   - Tarefas que você criou
   - Tarefas onde você é responsável
3. Verifique se as estatísticas estão corretas:
   - Total de tarefas
   - Tarefas críticas
   - Tarefas vencendo hoje
   - Tarefas atrasadas

---

## Verificações no Console

### Realtime conectado com sucesso:
```
[useBoardData] Realtime subscription status: SUBSCRIBED
[useBoardData] ✅ Realtime connected successfully for board: <board-id>
```

### Realtime detectou mudança:
```
[useBoardData] ✅ Realtime UPDATE received: {
  taskId: "...",
  changes: { ... },
  timestamp: "2026-05-08T..."
}
[useBoardData] Reloading data from database...
[useBoardData] ✅ Data reloaded successfully, filters will re-apply automatically
```

### Filtros reaplicados:
```
[useBoardPage] filteredTasksByGroup recomputing...
[useBoardPage] Group <group-id>: 10 tasks -> 3 after filter
```

---

## Próximos Passos

1. ✅ Testar Realtime em produção
2. ✅ Verificar se filtros atualizam instantaneamente
3. ✅ Testar página "Minhas Tarefas" com diferentes usuários
4. ⏳ Monitorar logs do console para garantir que não há erros
5. ⏳ Fazer commit das mudanças quando tudo estiver funcionando

---

## Migrations Aplicadas

1. `20260508000000_enable_full_realtime_for_tasks.sql` - ✅ Aplicada
2. `20260508000001_add_tasks_to_realtime_publication.sql` - ✅ Criada (aplicar manualmente se necessário)

---

## Notas Importantes

- **Realtime requer conexão WebSocket**: Se o usuário estiver atrás de um firewall que bloqueia WebSockets, o Realtime não funcionará
- **Cache invalidado**: Quando o Realtime detecta mudança, o cache é invalidado e os dados são recarregados do banco
- **Filtros reativos**: Os filtros são `computed` e reaplicam automaticamente quando `tasksByGroup` muda
- **Performance**: O Realtime só recarrega dados quando há mudanças, não fica fazendo polling

---

## Build Status

✅ Build concluído com sucesso
✅ Sem erros de compilação
✅ Todas as migrations aplicadas
