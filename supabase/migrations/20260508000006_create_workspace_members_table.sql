-- Criar tabela de membros de workspace para controle de acesso privado
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Masters e criadores podem gerenciar membros
CREATE POLICY "workspace_members: master manage"
  ON workspace_members FOR ALL
  USING (
    my_role() = 'master'
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.created_by = auth.uid()
    )
  );

-- Membros podem ver a própria linha
CREATE POLICY "workspace_members: self read"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Atualizar função has_workspace_access para usar a nova tabela
CREATE OR REPLACE FUNCTION has_workspace_access(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Adicionar à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
