# Estrutura do Banco de Dados - Kamban Qualitec

## 📋 Índice
1. [Organização e Usuários](#organização-e-usuários)
2. [Workspaces e Boards](#workspaces-e-boards)
3. [Tarefas e Subtarefas](#tarefas-e-subtarefas)
4. [Configurações e Preferências](#configurações-e-preferências)
5. [Comunicação e Notificações](#comunicação-e-notificações)
6. [Sistema de Logs](#sistema-de-logs)

---

## 🏢 Organização e Usuários

### `organizations`
**Propósito:** Armazena as organizações/empresas que usam o sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único da organização |
| `name` | text | Nome da organização |
| `slug` | text | URL amigável (único) |
| `logo_url` | text | URL do logotipo |
| `cnpj` | text | CNPJ da empresa (único) |
| `created_at` | timestamp | Data de criação |

**Linhas:** 1

---

### `profiles`
**Propósito:** Perfis dos usuários do sistema (estende auth.users do Supabase).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | ID do usuário (referência a auth.users) |
| `organization_id` | uuid | Organização do usuário |
| `full_name` | text | Nome completo |
| `email` | text | Email do usuário |
| `avatar_url` | text | URL da foto de perfil |
| `role_global` | enum | Papel global: master, collaborator, guest, observer |
| `status` | enum | Status: active, inactive, pending |
| `job_title` | text | Cargo/função |
| `phone` | text | Telefone |
| `created_at` | timestamp | Data de criação |

**Linhas:** 6

---

### `user_managed_users`
**Propósito:** Relacionamento entre usuários master e usuários gerenciados (hierarquia).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `master_user_id` | uuid | ID do usuário master |
| `managed_user_id` | uuid | ID do usuário gerenciado |
| `created_at` | timestamp | Data de criação |

**Linhas:** 5

---

## 🗂️ Workspaces e Boards

### `workspaces`
**Propósito:** Espaços de trabalho que agrupam boards dentro de uma organização.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `organization_id` | uuid | Organização dona |
| `name` | text | Nome do workspace |
| `slug` | text | URL amigável |
| `visibility` | enum | Visibilidade: public, private, org |
| `created_by` | uuid | Criador |
| `created_at` | timestamp | Data de criação |

**Linhas:** 2

---

### `boards`
**Propósito:** Quadros/boards de tarefas (Kanban, Scrum, Lista).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `workspace_id` | uuid | Workspace pai |
| `name` | text | Nome do board |
| `description` | text | Descrição |
| `board_type` | enum | Tipo: kanban, scrum, list |
| `visibility` | enum | Visibilidade: public, private, org |
| `cover_color` | text | Cor da capa |
| `created_by` | uuid | Criador |
| `created_at` | timestamp | Data de criação |

**Linhas:** 9

---

### `board_members`
**Propósito:** Membros de um board e suas permissões.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `board_id` | uuid | ID do board |
| `user_id` | uuid | ID do usuário |
| `access_role` | enum | Papel: owner, editor, viewer, guest, observer |

**Linhas:** 14

---

### `board_columns`
**Propósito:** Colunas customizadas dos boards (não usado atualmente).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `type` | enum | Tipo: status, priority, due_date, assignee, etc. |
| `label` | text | Rótulo da coluna |
| `settings_json` | jsonb | Configurações em JSON |
| `sort_order` | integer | Ordem de exibição |

**Linhas:** 0

---

### `board_views`
**Propósito:** Diferentes visualizações de um board (Kanban, Calendário, Timeline, etc).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `view_type` | enum | Tipo: board, kanban, calendar, timeline, gantt, cards, table |
| `name` | text | Nome da visualização |
| `settings_json` | jsonb | Configurações em JSON |
| `is_default` | boolean | Se é a visualização padrão |

**Linhas:** 0

---

### `board_collections`
**Propósito:** Coleções/pastas para agrupar boards.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `organization_id` | uuid | Organização dona |
| `name` | text | Nome da coleção |
| `description` | text | Descrição |
| `color` | text | Cor da coleção |
| `created_by` | uuid | Criador |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

**Linhas:** 2

---

### `board_collection_items`
**Propósito:** Relacionamento entre coleções e boards.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `collection_id` | uuid | ID da coleção |
| `board_id` | uuid | ID do board |
| `sort_order` | integer | Ordem dentro da coleção |
| `added_at` | timestamp | Data de adição |

**Linhas:** 2

---

### `board_templates`
**Propósito:** Templates de boards para criação rápida.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `organization_id` | uuid | Organização dona |
| `name` | text | Nome do template |
| `description` | text | Descrição |
| `board_type` | enum | Tipo: kanban, scrum, list |
| `cover_color` | text | Cor da capa |
| `structure_json` | jsonb | Estrutura do board em JSON |
| `is_public` | boolean | Se é público |
| `created_by` | uuid | Criador |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

**Linhas:** 0

---

## ✅ Tarefas e Subtarefas

### `task_groups`
**Propósito:** Grupos de tarefas dentro de um board (ex: "Sprint 1", "Backlog").

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `name` | text | Nome do grupo |
| `color` | text | Cor do grupo |
| `sort_order` | integer | Ordem de exibição |
| `is_collapsed` | boolean | Se está colapsado |

**Linhas:** 5

---

### `tasks`
**Propósito:** Tarefas principais do sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `group_id` | uuid | Grupo da tarefa |
| `title` | text | Título da tarefa |
| `description` | text | Descrição completa (exibida no modal) |
| `notes` | text | Nota resumida (máx 200 chars, exibida no board) |
| `status_id` | uuid | Status atual |
| `priority_id` | uuid | Prioridade |
| `due_date` | date | Data de vencimento |
| `start_date` | date | Data de início |
| `budget` | numeric | Orçamento |
| `position` | integer | Posição na lista |
| `created_by` | uuid | Criador |
| `archived_at` | timestamp | Data de arquivamento |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

**Linhas:** 31

---

### `task_statuses`
**Propósito:** Status customizados por board (ex: "A fazer", "Em andamento", "Concluído").

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `name` | text | Nome do status |
| `color` | text | Cor (hex) |
| `sort_order` | integer | Ordem de exibição |
| `is_done` | boolean | Se indica tarefa concluída |

**Linhas:** 36

---

### `task_priorities`
**Propósito:** Prioridades customizadas por board (ex: "Baixa", "Média", "Alta", "Urgente").

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `name` | text | Nome da prioridade |
| `color` | text | Cor (hex) |
| `sort_order` | integer | Ordem de exibição |

**Linhas:** 36

---

### `task_assignees`
**Propósito:** Responsáveis atribuídos a uma tarefa (muitos-para-muitos).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `task_id` | uuid | ID da tarefa |
| `user_id` | uuid | ID do usuário |
| `assigned_at` | timestamp | Data de atribuição |

**Linhas:** 36

---

### `subtasks`
**Propósito:** Subtarefas/checklist de uma tarefa principal.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `task_id` | uuid | Tarefa pai |
| `title` | text | Título da subtarefa |
| `is_done` | boolean | Se está concluída |
| `status_id` | uuid | Status (referência a task_statuses) |
| `priority_id` | uuid | Prioridade (referência a task_priorities) |
| `due_date` | date | Data de vencimento |
| `notes` | text | Notas/descrição |
| `sort_order` | integer | Ordem de exibição |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

**Linhas:** 9

---

### `subtask_assignees`
**Propósito:** Responsáveis de subtarefas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `subtask_id` | uuid | ID da subtarefa |
| `user_id` | uuid | ID do usuário |
| `created_at` | timestamp | Data de atribuição |

**Linhas:** 2

---

### `task_attachments`
**Propósito:** Anexos de tarefas (arquivos, imagens, documentos).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `task_id` | uuid | Tarefa pai |
| `file_name` | text | Nome do arquivo |
| `file_path` | text | Caminho no storage |
| `mime_type` | text | Tipo MIME |
| `size_bytes` | bigint | Tamanho em bytes |
| `category` | text | Categoria (Documentos, Imagens, etc) |
| `description` | text | Descrição do anexo |
| `sort_order` | integer | Ordem dentro da categoria |
| `uploaded_by` | uuid | Quem fez upload |
| `created_at` | timestamp | Data de upload |

**Linhas:** 7

---

### `subtask_attachments`
**Propósito:** Anexos de subtarefas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `subtask_id` | uuid | Subtarefa pai |
| `file_name` | text | Nome do arquivo |
| `file_path` | text | Caminho no storage |
| `mime_type` | text | Tipo MIME |
| `size_bytes` | bigint | Tamanho em bytes |
| `category` | text | Categoria |
| `description` | text | Descrição |
| `sort_order` | integer | Ordem |
| `uploaded_by` | uuid | Quem fez upload |
| `created_at` | timestamp | Data de upload |

**Linhas:** 0

---

### `labels`
**Propósito:** Etiquetas/tags para categorizar tarefas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `name` | text | Nome da etiqueta |
| `color` | text | Cor (hex) |

**Linhas:** 0

---

### `task_labels`
**Propósito:** Relacionamento entre tarefas e etiquetas (muitos-para-muitos).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `task_id` | uuid | ID da tarefa |
| `label_id` | uuid | ID da etiqueta |

**Linhas:** 0

---

## 💬 Comunicação e Notificações

### `task_updates`
**Propósito:** Atualizações/comentários em tarefas com suporte a threads (respostas).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `task_id` | uuid | Tarefa pai |
| `author_id` | uuid | Autor do comentário |
| `content` | text | Conteúdo do comentário |
| `parent_id` | uuid | ID da atualização pai (para threads) |
| `edited_at` | timestamp | Data da última edição |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

**Linhas:** 0

---

### `task_update_attachments`
**Propósito:** Anexos em comentários (arquivos, áudios, imagens).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `update_id` | uuid | Comentário pai |
| `file_name` | text | Nome do arquivo |
| `file_path` | text | Caminho (vazio se usar BLOB) |
| `file_data` | bytea | Dados binários (BLOB) |
| `mime_type` | text | Tipo MIME |
| `size_bytes` | bigint | Tamanho em bytes |
| `attachment_type` | enum | Tipo: file, audio, image |
| `uploaded_by` | uuid | Quem fez upload |
| `created_at` | timestamp | Data de upload |

**Linhas:** 0

---

### `task_update_mentions`
**Propósito:** Menções de usuários em comentários (@usuario).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `update_id` | uuid | Comentário pai |
| `mentioned_user_id` | uuid | Usuário mencionado |
| `created_at` | timestamp | Data da menção |

**Linhas:** 0

---

### `task_update_likes`
**Propósito:** Curtidas em comentários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `update_id` | uuid | Comentário |
| `user_id` | uuid | Usuário que curtiu |
| `created_at` | timestamp | Data da curtida |

**Linhas:** 0

---

### `task_update_reads`
**Propósito:** Controle de leitura de comentários (marcar como lido).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `update_id` | uuid | Comentário |
| `user_id` | uuid | Usuário que leu |
| `read_at` | timestamp | Data de leitura |

**Linhas:** 0

---

### `notifications`
**Propósito:** Notificações in-app para usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Destinatário |
| `type` | text | Tipo de notificação |
| `title` | text | Título |
| `body` | text | Corpo da mensagem |
| `link` | text | Link para ação |
| `read_at` | timestamp | Data de leitura |
| `created_at` | timestamp | Data de criação |

**Linhas:** 2

---

### `task_invitations`
**Propósito:** Convites para colaborar em tarefas específicas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `task_id` | uuid | Tarefa |
| `board_id` | uuid | Board |
| `inviter_id` | uuid | Quem convidou |
| `invitee_email` | text | Email do convidado |
| `invitee_id` | uuid | ID do convidado (se já for usuário) |
| `token` | text | Token único para aceitar via link |
| `message` | text | Mensagem do convite |
| `status` | enum | Status: pending, accepted, declined, expired |
| `expires_at` | timestamp | Data de expiração |
| `accepted_at` | timestamp | Data de aceitação |
| `created_at` | timestamp | Data de criação |

**Linhas:** 0

---

## ⚙️ Configurações e Preferências

### `email_preferences`
**Propósito:** Preferências de notificações por email de cada usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | uuid | Usuário |
| `task_assigned_enabled` | boolean | Notificar quando atribuído a tarefa |
| `task_updated_enabled` | boolean | Notificar quando tarefa atualizada |
| `task_due_soon_enabled` | boolean | Notificar quando tarefa próxima do vencimento |
| `task_completed_enabled` | boolean | Notificar quando tarefa concluída |
| `digest_enabled` | boolean | Habilitar resumo diário/semanal |
| `digest_frequency` | enum | Frequência: daily, weekly, never |
| `digest_time` | time | Horário do resumo |
| `digest_day_of_week` | integer | Dia da semana (0-6) para resumo semanal |
| `max_emails_per_day` | integer | Máximo de emails por dia |
| `max_emails_per_hour` | integer | Máximo de emails por hora |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

**Linhas:** 6

---

### `task_reminders`
**Propósito:** Lembretes individuais de tarefas por usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `task_id` | uuid | Tarefa |
| `user_id` | uuid | Usuário |
| `enabled` | boolean | Se o lembrete está ativo |
| `reminder_time` | time | Horário do lembrete |
| `days_before` | integer | Dias antes do vencimento (0-7) |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Última atualização |

**Linhas:** 1

---

### `saved_filters`
**Propósito:** Filtros salvos de tarefas por usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Usuário |
| `board_id` | uuid | Board (opcional, pode ser global) |
| `name` | text | Nome do filtro |
| `filter_json` | jsonb | Configuração do filtro em JSON |
| `created_at` | timestamp | Data de criação |

**Linhas:** 0

---

### `user_favorites`
**Propósito:** Boards favoritos de cada usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Usuário |
| `board_id` | uuid | Board favorito |
| `created_at` | timestamp | Data de adição |

**Linhas:** 0

---

### `user_recent_boards`
**Propósito:** Histórico de boards acessados recentemente.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Usuário |
| `board_id` | uuid | Board acessado |
| `last_accessed_at` | timestamp | Último acesso |

**Linhas:** 0

---

### `automations`
**Propósito:** Automações configuradas em boards (triggers e ações).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `board_id` | uuid | Board pai |
| `trigger_type` | text | Tipo de gatilho |
| `action_type` | text | Tipo de ação |
| `config_json` | jsonb | Configuração em JSON |
| `is_active` | boolean | Se está ativa |

**Linhas:** 0

---

## 📊 Sistema de Logs

### `activity_logs`
**Propósito:** Log de todas as atividades do sistema (auditoria).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `actor_id` | uuid | Quem executou a ação |
| `entity_type` | text | Tipo de entidade (task, board, etc) |
| `entity_id` | uuid | ID da entidade |
| `action` | text | Ação executada (created, updated, deleted) |
| `meta_json` | jsonb | Metadados em JSON |
| `created_at` | timestamp | Data da ação |

**Linhas:** 574

---

### `email_sent_log`
**Propósito:** Log de emails enviados (para controle de limites).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Destinatário |
| `email_type` | text | Tipo de email |
| `task_id` | uuid | Tarefa relacionada (opcional) |
| `sent_at` | timestamp | Data de envio |
| `created_at` | timestamp | Data de criação |

**Linhas:** 55

---

## 📈 Resumo Estatístico

**Total de tabelas:** 37

**Tabelas com mais dados:**
- `activity_logs`: 574 registros
- `email_sent_log`: 55 registros
- `task_assignees`: 36 registros
- `task_statuses`: 36 registros
- `task_priorities`: 36 registros
- `tasks`: 31 registros

**Tabelas vazias (não utilizadas ainda):**
- `board_columns`
- `board_views`
- `board_templates`
- `labels`
- `task_labels`
- `saved_filters`
- `automations`
- `task_updates` (comentários)
- `task_update_*` (funcionalidades de comentários)
- `subtask_attachments`
- `user_favorites`
- `user_recent_boards`
- `task_invitations`

---

## 🔑 Relacionamentos Principais

```
organizations
  └── workspaces
      └── boards
          ├── board_members (usuários com permissões)
          ├── task_groups
          │   └── tasks
          │       ├── task_assignees
          │       ├── task_attachments
          │       ├── subtasks
          │       │   ├── subtask_assignees
          │       │   └── subtask_attachments
          │       ├── task_updates (comentários)
          │       └── task_reminders
          ├── task_statuses (customizados por board)
          └── task_priorities (customizados por board)

profiles (usuários)
  ├── email_preferences
  ├── notifications
  ├── user_favorites
  └── user_recent_boards
```
