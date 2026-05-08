-- Corrigir acesso a áreas privadas:
-- Apenas criador + membros explícitos podem ver áreas privadas
-- Masters NÃO têm acesso automático a áreas privadas de outros

-- 1. Remover política antiga que dava acesso total a masters (incluindo privadas)
DROP POLICY IF EXISTS "workspaces: master full access" ON workspaces;

-- 2. Recriar política de acesso privado sem exceção para masters
DROP POLICY IF EXISTS "workspaces: private read if access" ON workspaces;

CREATE POLICY "workspaces: private read if access"
  ON workspaces
  FOR SELECT
  USING (
    visibility = 'private'
    AND organization_id = my_org()
    AND (
      created_by = auth.uid()
      OR has_workspace_access(id)
    )
  );

-- 3. Masters podem gerenciar (INSERT/UPDATE/DELETE) áreas da org
--    mas para leitura seguem as mesmas regras dos demais
CREATE POLICY "workspaces: master write"
  ON workspaces
  FOR ALL
  USING (
    organization_id = my_org()
    AND my_role() = 'master'
    AND (
      visibility <> 'private'
      OR created_by = auth.uid()
      OR has_workspace_access(id)
    )
  );
