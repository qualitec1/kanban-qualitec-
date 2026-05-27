-- =============================================================================
-- SCHEMA CONSOLIDADO — estado real do banco em 27/05/2026
-- Gerado a partir de inspeção direta via MCP Supabase
-- =============================================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE public.board_access_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.board_type        AS ENUM ('kanban', 'scrum', 'list', 'timeline');
CREATE TYPE public.column_type       AS ENUM ('text', 'number', 'date', 'select', 'multi_select', 'person', 'status', 'priority', 'checkbox', 'url', 'email', 'phone', 'currency', 'rating', 'progress', 'timeline', 'location', 'attachment', 'formula', 'lookup', 'auto_number', 'created_at', 'updated_at', 'created_by', 'last_updated_by');
CREATE TYPE public.user_role         AS ENUM ('admin', 'manager', 'collaborator');
CREATE TYPE public.user_status       AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.view_type         AS ENUM ('kanban', 'list', 'table', 'timeline', 'calendar', 'gantt');
CREATE TYPE public.visibility_type   AS ENUM ('public', 'org', 'private');

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────

CREATE TABLE public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  logo_url   TEXT,
  cnpj       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PROFILES ────────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name       TEXT,
  email           TEXT NOT NULL,
  avatar_url      TEXT,
  role_global     public.user_role   NOT NULL DEFAULT 'collaborator',
  status          public.user_status NOT NULL DEFAULT 'active',
  job_title       TEXT,
  phone           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── USER_MANAGED_USERS ──────────────────────────────────────────────────────

CREATE TABLE public.user_managed_users (
  master_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  managed_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (master_user_id, managed_user_id)
);

-- ─── WORKSPACES ──────────────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  visibility      public.visibility_type NOT NULL DEFAULT 'org',
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ─── BOARDS ──────────────────────────────────────────────────────────────────

CREATE TABLE public.boards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  board_type   public.board_type     NOT NULL DEFAULT 'kanban',
  visibility   public.visibility_type NOT NULL DEFAULT 'org',
  cover_color  TEXT,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.board_columns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id      UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  type          public.column_type NOT NULL,
  label         TEXT NOT NULL,
  settings_json JSONB DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.board_members (
  board_id    UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_role public.board_access_role NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (board_id, user_id)
);

CREATE TABLE public.board_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id      UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  view_type     public.view_type NOT NULL DEFAULT 'kanban',
  name          TEXT NOT NULL,
  settings_json JSONB DEFAULT '{}',
  is_default    BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.board_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  board_type      public.board_type NOT NULL DEFAULT 'kanban',
  cover_color     TEXT,
  structure_json  JSONB NOT NULL DEFAULT '{}',
  is_public       BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.board_collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.board_collection_items (
  collection_id UUID NOT NULL REFERENCES public.board_collections(id) ON DELETE CASCADE,
  board_id      UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, board_id)
);

-- ─── TASK STATUSES & PRIORITIES ──────────────────────────────────────────────

CREATE TABLE public.task_statuses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_done    BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.task_priorities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ─── TASK GROUPS ─────────────────────────────────────────────────────────────

CREATE TABLE public.task_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN NOT NULL DEFAULT false
);

-- ─── TASKS ───────────────────────────────────────────────────────────────────

CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES public.task_groups(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  status_id   UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
  priority_id UUID REFERENCES public.task_priorities(id) ON DELETE SET NULL,
  due_date    DATE,
  start_date  DATE,
  budget      NUMERIC,
  notes       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_assignees (
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE public.task_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  category    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_labels (
  task_id  UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE public.task_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  board_id      UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  inviter_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  token         TEXT NOT NULL,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_reminders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id              UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled              BOOLEAN NOT NULL DEFAULT true,
  reminder_time        TIME NOT NULL DEFAULT '09:00:00',
  days_before          INTEGER NOT NULL DEFAULT 1,
  notify_all_assignees BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- ─── TASK UPDATES (comentários/atualizações) ─────────────────────────────────

CREATE TABLE public.task_updates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  parent_id  UUID REFERENCES public.task_updates(id) ON DELETE CASCADE,
  edited_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_update_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id       UUID NOT NULL REFERENCES public.task_updates(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  attachment_type TEXT NOT NULL,
  file_data       BYTEA NOT NULL,
  uploaded_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_update_likes (
  update_id  UUID NOT NULL REFERENCES public.task_updates(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (update_id, user_id)
);

CREATE TABLE public.task_update_mentions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id         UUID NOT NULL REFERENCES public.task_updates(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_update_reads (
  update_id UUID NOT NULL REFERENCES public.task_updates(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (update_id, user_id)
);

-- ─── SUBTASKS ────────────────────────────────────────────────────────────────

CREATE TABLE public.subtasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  is_done     BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status_id   UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
  priority_id UUID REFERENCES public.task_priorities(id) ON DELETE SET NULL,
  due_date    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.subtask_assignees (
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subtask_id, user_id)
);

CREATE TABLE public.subtask_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id  UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  category    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── LABELS ──────────────────────────────────────────────────────────────────

CREATE TABLE public.labels (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  color    TEXT NOT NULL
);

-- ─── SAVED FILTERS ───────────────────────────────────────────────────────────

CREATE TABLE public.saved_filters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  board_id    UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  filter_json JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AUTOMATIONS ─────────────────────────────────────────────────────────────

CREATE TABLE public.automations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  action_type  TEXT NOT NULL,
  config_json  JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT true
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── ACTIVITY LOGS ───────────────────────────────────────────────────────────

CREATE TABLE public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  meta_json   JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── EMAIL ───────────────────────────────────────────────────────────────────

CREATE TABLE public.email_preferences (
  user_id                  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_assigned_enabled    BOOLEAN NOT NULL DEFAULT true,
  task_updated_enabled     BOOLEAN NOT NULL DEFAULT true,
  task_due_soon_enabled    BOOLEAN NOT NULL DEFAULT true,
  task_completed_enabled   BOOLEAN NOT NULL DEFAULT false,
  digest_enabled           BOOLEAN NOT NULL DEFAULT false,
  digest_frequency         TEXT NOT NULL DEFAULT 'daily',
  digest_time              TIME NOT NULL DEFAULT '09:00:00',
  digest_day_of_week       INTEGER,
  max_emails_per_day       INTEGER NOT NULL DEFAULT 50,
  max_emails_per_hour      INTEGER NOT NULL DEFAULT 10,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_sent_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  task_id    UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── USER FAVORITES & RECENTS ────────────────────────────────────────────────

CREATE TABLE public.user_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, board_id)
);

CREATE TABLE public.user_recent_boards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  board_id         UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, board_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_managed_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_views            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_priorities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_invitations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_update_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_update_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_update_mentions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_update_reads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtask_assignees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtask_attachments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sent_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recent_boards     ENABLE ROW LEVEL SECURITY;

-- ─── GRANTS ──────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles               TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_managed_users     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces             TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards                 TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_columns          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_views            TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_templates        TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_collections      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_collection_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_statuses          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_priorities        TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_groups            TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks                  TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignees         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_labels            TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_invitations       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_reminders         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_updates           TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_update_attachments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_update_likes      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_update_mentions   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_update_reads      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks               TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtask_assignees      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtask_attachments    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labels                 TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_filters          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations            TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_preferences      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sent_log         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_recent_boards     TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ─── TRIGGER: updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_tasks_updated_at        BEFORE UPDATE ON public.tasks        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_subtasks_updated_at     BEFORE UPDATE ON public.subtasks     FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_task_updates_updated_at BEFORE UPDATE ON public.task_updates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_task_reminders_updated_at BEFORE UPDATE ON public.task_reminders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── TRIGGER: novo usuário → profile ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── RPC: upsert_reminders_for_assignees ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_reminders_for_assignees(
  p_task_id       UUID,
  p_days_before   INTEGER,
  p_reminder_time TIME,
  p_notify_all    BOOLEAN
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_user_id   UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM task_assignees WHERE task_id = p_task_id AND user_id = v_caller_id
  ) THEN
    INSERT INTO task_reminders (task_id, user_id, enabled, days_before, reminder_time, notify_all_assignees)
    VALUES (p_task_id, v_caller_id, true, p_days_before, p_reminder_time, p_notify_all)
    ON CONFLICT (task_id, user_id) DO UPDATE SET
      enabled = true, days_before = EXCLUDED.days_before,
      reminder_time = EXCLUDED.reminder_time, notify_all_assignees = EXCLUDED.notify_all_assignees,
      updated_at = now();
    RETURN;
  END IF;

  IF p_notify_all THEN
    FOR v_user_id IN SELECT user_id FROM task_assignees WHERE task_id = p_task_id LOOP
      INSERT INTO task_reminders (task_id, user_id, enabled, days_before, reminder_time, notify_all_assignees)
      VALUES (p_task_id, v_user_id, true, p_days_before, p_reminder_time, p_notify_all)
      ON CONFLICT (task_id, user_id) DO UPDATE SET
        enabled = true, days_before = EXCLUDED.days_before,
        reminder_time = EXCLUDED.reminder_time, notify_all_assignees = EXCLUDED.notify_all_assignees,
        updated_at = now();
    END LOOP;
  ELSE
    INSERT INTO task_reminders (task_id, user_id, enabled, days_before, reminder_time, notify_all_assignees)
    VALUES (p_task_id, v_caller_id, true, p_days_before, p_reminder_time, p_notify_all)
    ON CONFLICT (task_id, user_id) DO UPDATE SET
      enabled = true, days_before = EXCLUDED.days_before,
      reminder_time = EXCLUDED.reminder_time, notify_all_assignees = EXCLUDED.notify_all_assignees,
      updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_reminders_for_assignees FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_reminders_for_assignees TO authenticated;
