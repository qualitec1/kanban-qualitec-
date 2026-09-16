# Protecao dos endpoints de email

- `/api/emails/send-reminder` foi desativado (410). Nenhuma chamada foi encontrada no aplicativo; os lembretes agendados usam a Edge Function `send-task-reminders`.
- `/api/emails/task-assigned` exige Authorization Bearer com sessao valida, identificadores UUID, acesso de edicao ao quadro e destinatario vinculado a tarefa. O aplicativo envia a sessao automaticamente.
- `/api/email/test` e `/api/email/send-test` exigem usuario master. O teste de envio usa apenas o email verificado do proprio administrador; campos enviados pelo cliente nao definem destino ou conteudo. O diagnostico nao retorna configuracao SMTP.
- A validacao do certificado TLS do SMTP esta habilitada.

## Antes de publicar

1. Trocar a senha SMTP que estava escrita no codigo da Edge Function. Remover o texto do arquivo nao revoga a senha nem elimina copias no historico Git.
2. Configurar a nova senha em EMAIL_PASS nos secrets da Edge Function e atualizar NUXT_EMAIL_PASS no servidor se usar a mesma conta. Nao colocar valores no repositorio.
3. O agendador deve chamar a Edge Function por POST com Authorization Bearer usando a SUPABASE_SERVICE_ROLE_KEY do projeto, guardada em segredo no agendador. Chamadas anonimas ou com a chave publica sao rejeitadas. Nunca colocar a chave de servico no navegador.
4. Publicar o aplicativo e a Edge Function atualizados. Estas alteracoes locais nao modificam a instalacao em producao.
5. Validar o envio com uma conta master e uma tarefa de teste. Os testes automatizados usam mocks e nao enviam emails reais.
