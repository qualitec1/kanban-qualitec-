import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const EMAIL_USER = Deno.env.get('EMAIL_USER') || 'catalogo@qualitec.ind.br'
const EMAIL_PASS = Deno.env.get('EMAIL_PASS') || 'Instrumentos@2026'
const EMAIL_SMTP = Deno.env.get('EMAIL_SMTP') || 'smtp.skymail.net.br'
const EMAIL_PORT = parseInt(Deno.env.get('EMAIL_PORT') || '465')
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'Sistema Kanban Qualitec'

serve(async (_req) => {
  try {
    if (!EMAIL_USER || !EMAIL_PASS) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: reminders, error: remindersError } = await supabase
      .from('task_reminders')
      .select(`
        *,
        task:tasks (
          id, title, description, due_date,
          board:boards ( id, name )
        ),
        user:profiles ( id, email, full_name )
      `)
      .eq('enabled', true)

    if (remindersError) throw remindersError

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active reminders', sent: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const nowBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const currentTime = `${nowBrasilia.getHours().toString().padStart(2, '0')}:${nowBrasilia.getMinutes().toString().padStart(2, '0')}`

    let emailsSent = 0
    const results = []

    for (const reminder of reminders) {
      try {
        if (!reminder.task?.due_date) continue

        const [year, month, day] = reminder.task.due_date.split('T')[0].split('-').map(Number)
        const dueDate = new Date(year, month - 1, day)

        const reminderDate = new Date(dueDate)
        reminderDate.setDate(reminderDate.getDate() - reminder.days_before)
        reminderDate.setHours(0, 0, 0, 0)

        const today = new Date(nowBrasilia)
        today.setHours(0, 0, 0, 0)

        if (reminderDate.getTime() !== today.getTime()) continue

        const [rH, rM] = reminder.reminder_time.substring(0, 5).split(':').map(Number)
        const [cH, cM] = currentTime.split(':').map(Number)
        if (Math.abs((rH * 60 + rM) - (cH * 60 + cM)) > 5) continue

        const emailHtml = generateEmailHtml(reminder)

        const client = new SMTPClient({
          connection: {
            hostname: EMAIL_SMTP,
            port: EMAIL_PORT,
            tls: true,
            auth: { username: EMAIL_USER, password: EMAIL_PASS },
          },
        })

        await client.send({
          from: `${EMAIL_FROM_NAME} <${EMAIL_USER}>`,
          to: reminder.user.email,
          subject: `🔔 Lembrete: ${reminder.task.title}`,
          html: emailHtml,
        })

        await client.close()
        emailsSent++
        results.push({ reminder_id: reminder.id, task: reminder.task.title, user: reminder.user.email, success: true })

      } catch (err) {
        results.push({ reminder_id: reminder.id, success: false, error: err.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${reminders.length} reminders, sent ${emailsSent} emails`,
      sent: emailsSent,
      results
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

function generateEmailHtml(reminder: any): string {
  const task = reminder.task
  const [y, m, d] = task.due_date.split('T')[0].split('-').map(Number)
  const dueDate = new Date(y, m - 1, d)
  const formattedDate = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const urgencyText = daysUntilDue <= 0 ? '⚠️ Vence hoje!' : daysUntilDue === 1 ? '⏰ Vence amanhã!' : `📅 Vence em ${daysUntilDue} dias`
  const appUrl = Deno.env.get('APP_URL') || 'https://backlog.qualitec.ind.br'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Tarefa</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:32px;background:linear-gradient(135deg,#1C325C 0%,#2a4a7f 100%);border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">🔔 Lembrete de Tarefa</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#666;font-size:14px;">Olá, <strong>${reminder.user.full_name || 'usuário'}</strong>!</p>
            <p style="margin:0 0 24px;color:#666;font-size:14px;">Este é um lembrete sobre a seguinte tarefa:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-left:4px solid #1C325C;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px;">
                <h2 style="margin:0 0 12px;color:#1C325C;font-size:20px;font-weight:600;">${task.title}</h2>
                ${task.description ? `<p style="margin:0 0 16px;color:#666;font-size:14px;line-height:1.5;">${task.description}</p>` : ''}
                <p style="margin:0 0 6px;color:#666;font-size:14px;">📋 Quadro: <strong style="color:#333;">${task.board.name}</strong></p>
                <p style="margin:0 0 16px;color:#666;font-size:14px;">📅 Prazo: <strong style="color:#333;">${formattedDate}</strong></p>
                <div style="padding:12px;background-color:#fff3cd;border-radius:6px;">
                  <span style="color:#856404;font-size:16px;font-weight:600;">${urgencyText}</span>
                </div>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0;">
                <a href="${appUrl}/boards/${task.board.id}"
                   style="display:inline-block;padding:14px 32px;background-color:#1C325C;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
                  Ver Tarefa
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;background-color:#f8f9fa;border-radius:0 0 12px 12px;border-top:1px solid #e9ecef;">
            <p style="margin:0;color:#999;font-size:12px;text-align:center;">Você está recebendo este email porque configurou um lembrete para esta tarefa.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
