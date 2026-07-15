import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const EMAIL_USER = Deno.env.get('EMAIL_USER') || 'catalogo@qualitec.ind.br'
const EMAIL_PASS = Deno.env.get('EMAIL_PASS') || 'Instrumentos@2026'
const EMAIL_SMTP = Deno.env.get('EMAIL_SMTP') || 'smtp.skymail.net.br'
const EMAIL_PORT = parseInt(Deno.env.get('EMAIL_PORT') || '465')
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'Sistema Kanban Qualitec'
const APP_URL = Deno.env.get('APP_URL') || 'https://backlog.qualitec.ind.br'

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: reminders, error } = await supabase
      .from('task_reminders')
      .select(`
        *,
        task:tasks (
          id, title, description, notes, due_date, start_date, budget,
          board:boards ( id, name ),
          status:task_statuses ( id, name, color, is_done ),
          priority:task_priorities ( id, name, color ),
          assignees:task_assignees (
            user:profiles ( id, full_name, email )
          ),
          subtasks (
            id, title, is_done
          ),
          attachments:task_attachments (
            id, file_name, size_bytes, category, description
          )
        ),
        user:profiles ( id, email, full_name )
      `)
      .eq('enabled', true)

    if (error) throw error
    if (!reminders?.length) {
      return json({ success: true, message: 'No active reminders', sent: 0 })
    }

    const nowBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const currentTime = `${nowBrasilia.getHours().toString().padStart(2, '0')}:${nowBrasilia.getMinutes().toString().padStart(2, '0')}`

    let emailsSent = 0
    const results = []

    for (const reminder of reminders) {
      try {
        if (!reminder.user?.email) continue

        // 1. Se a tarefa já estiver concluída, pula o envio automaticamente!
        if (reminder.task?.status?.is_done) {
          results.push({ reminder_id: reminder.id, task: reminder.task?.title, skipped: true, reason: 'Task is completed' })
          continue
        }

        const todayStr = nowBrasilia.toISOString().split('T')[0]
        let shouldSend = false
        let dueDate: Date

        if (reminder.reminder_type === 'daily_interval') {
          if (!reminder.start_date) continue
          const startDateStr = reminder.start_date.split('T')[0]
          
          // Envia diariamente a partir da data de início
          if (todayStr >= startDateStr) {
            shouldSend = true
          }

          if (reminder.task?.due_date) {
            const [y, m, d] = reminder.task.due_date.split('T')[0].split('-').map(Number)
            dueDate = new Date(y, m - 1, d)
          } else {
            dueDate = new Date()
          }
        } else {
          // Padrão antigo: days_before
          if (!reminder.task?.due_date) continue

          const [y, m, d] = reminder.task.due_date.split('T')[0].split('-').map(Number)
          dueDate = new Date(y, m - 1, d)
          
          const reminderDate = new Date(dueDate)
          reminderDate.setDate(reminderDate.getDate() - reminder.days_before)
          reminderDate.setHours(0, 0, 0, 0)

          const today = new Date(nowBrasilia)
          today.setHours(0, 0, 0, 0)

          if (reminderDate.getTime() === today.getTime()) {
            shouldSend = true
          }
        }

        if (!shouldSend) continue

        const [rH, rM] = reminder.reminder_time.substring(0, 5).split(':').map(Number)
        const [cH, cM] = currentTime.split(':').map(Number)
        if (Math.abs((rH * 60 + rM) - (cH * 60 + cM)) > 5) continue

        const emailHtml = buildEmailHtml(reminder, dueDate)

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
          subject: `Lembrete: ${reminder.task.title}`,
          html: emailHtml,
        })

        await client.close()
        emailsSent++
        results.push({ reminder_id: reminder.id, task: reminder.task.title, user: reminder.user.email, success: true })

      } catch (err) {
        results.push({ reminder_id: reminder.id, success: false, error: err.message })
      }
    }

    return json({ success: true, message: `Processed ${reminders.length} reminders, sent ${emailsSent} emails`, sent: emailsSent, results })

  } catch (error) {
    return json({ error: error.message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function buildEmailHtml(reminder: any, dueDate: Date): string {
  const task = reminder.task
  const hasDueDate = !!task.due_date
  const formattedDue = hasDueDate 
    ? dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) 
    : 'Sem prazo de entrega definido'
  
  let urgencyText = 'Lembrete Diário'
  let urgencyBg = '#e0f2fe'
  let urgencyColor = '#0369a1'

  if (hasDueDate) {
    const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    urgencyText = daysUntilDue <= 0 ? 'Vence hoje!' : daysUntilDue === 1 ? 'Vence amanhã!' : `Vence em ${daysUntilDue} dias`
    urgencyBg = daysUntilDue <= 0 ? '#fee2e2' : daysUntilDue === 1 ? '#fff3cd' : '#e8f5e9'
    urgencyColor = daysUntilDue <= 0 ? '#991b1b' : daysUntilDue === 1 ? '#856404' : '#166534'
  }

  // Responsáveis
  const assignees = (task.assignees || []).map((a: any) => a.user?.full_name || a.user?.email).filter(Boolean)

  // Subtarefas
  const subtasks = task.subtasks || []
  const subtasksDone = subtasks.filter((s: any) => s.is_done).length

  // Anexos
  const attachments = task.attachments || []

  // Início
  const startDateStr = task.start_date ? formatDate(task.start_date) : null

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Lembrete de Tarefa</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f2f5;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f0f2f5;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr>
    <td style="padding:28px 32px;background:linear-gradient(135deg,#1C325C 0%,#2a4a7f 100%);">
      <p style="margin:0 0 4px;color:rgba(255,255,255,.7);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Sistema Kanban Qualitec</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🔔 Lembrete de Tarefa</h1>
    </td>
  </tr>

  <!-- Saudação -->
  <tr>
    <td style="padding:24px 32px 0;">
      <p style="margin:0;color:#374151;font-size:15px;">Olá, <strong>${reminder.user.full_name || 'usuário'}</strong>!</p>
      <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Você tem uma tarefa com prazo se aproximando:</p>
    </td>
  </tr>

  <!-- Card da Tarefa -->
  <tr>
    <td style="padding:16px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

        <!-- Título + Urgência -->
        <tr>
          <td style="padding:20px 20px 12px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;">
                  <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">${task.title}</h2>
                  ${task.description ? `<p style="margin:0 0 12px;color:#64748b;font-size:14px;line-height:1.5;">${task.description}</p>` : ''}
                </td>
                <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:12px;">
                  <span style="display:inline-block;padding:6px 12px;background:${urgencyBg};color:${urgencyColor};border-radius:20px;font-size:13px;font-weight:600;">${urgencyText}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 20px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>

        <!-- Grid de informações -->
        <tr>
          <td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Coluna esquerda -->
                <td width="50%" style="vertical-align:top;padding-right:12px;">

                  <!-- Quadro -->
                  <div style="margin-bottom:14px;">
                    <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Quadro</p>
                    <p style="margin:0;color:#1e293b;font-size:14px;font-weight:500;">📋 ${task.board.name}</p>
                  </div>

                  <!-- Status -->
                  ${task.status ? `
                  <div style="margin-bottom:14px;">
                    <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Status</p>
                    <p style="margin:0;">
                      <span style="display:inline-block;padding:3px 10px;background:${task.status.color}22;color:${task.status.color};border-radius:12px;font-size:13px;font-weight:600;">${task.status.name}</span>
                    </p>
                  </div>` : ''}

                  <!-- Início -->
                  ${startDateStr ? `
                  <div style="margin-bottom:14px;">
                    <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Início</p>
                    <p style="margin:0;color:#1e293b;font-size:14px;">📅 ${startDateStr}</p>
                  </div>` : ''}

                  <!-- Orçamento -->
                  ${task.budget ? `
                  <div style="margin-bottom:14px;">
                    <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Orçamento</p>
                    <p style="margin:0;color:#059669;font-size:16px;font-weight:700;">${formatCurrency(task.budget)}</p>
                  </div>` : ''}

                </td>

                <!-- Coluna direita -->
                <td width="50%" style="vertical-align:top;padding-left:12px;">

                  <!-- Prazo -->
                  <div style="margin-bottom:14px;">
                    <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Prazo</p>
                    <p style="margin:0;color:#1e293b;font-size:14px;font-weight:500;">📅 ${formattedDue}</p>
                  </div>

                  <!-- Prioridade -->
                  ${task.priority ? `
                  <div style="margin-bottom:14px;">
                    <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Prioridade</p>
                    <p style="margin:0;">
                      <span style="display:inline-block;padding:3px 10px;background:${task.priority.color};color:#fff;border-radius:12px;font-size:13px;font-weight:600;">${task.priority.name}</span>
                    </p>
                  </div>` : ''}

                  <!-- Responsáveis -->
                  ${assignees.length > 0 ? `
                  <div style="margin-bottom:14px;">
                    <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Responsáveis</p>
                    <p style="margin:0;color:#1e293b;font-size:14px;">👤 ${assignees.join(', ')}</p>
                  </div>` : ''}

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Notas -->
        ${task.notes ? `
        <tr><td style="padding:0 20px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
        <tr>
          <td style="padding:14px 20px;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Nota</p>
            <p style="margin:0;color:#475569;font-size:13px;font-style:italic;">${task.notes}</p>
          </td>
        </tr>` : ''}

        <!-- Subtarefas -->
        ${subtasks.length > 0 ? `
        <tr><td style="padding:0 20px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
        <tr>
          <td style="padding:14px 20px;">
            <p style="margin:0 0 10px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Subtarefas (${subtasksDone}/${subtasks.length})</p>
            ${subtasks.map((s: any) => `
            <div style="display:flex;align-items:center;margin-bottom:6px;">
              <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${s.is_done ? '#10b981' : '#e2e8f0'};margin-right:8px;text-align:center;line-height:16px;font-size:10px;color:#fff;">${s.is_done ? '✓' : ''}</span>
              <span style="color:${s.is_done ? '#94a3b8' : '#374151'};font-size:13px;${s.is_done ? 'text-decoration:line-through;' : ''}">${s.title}</span>
            </div>`).join('')}
          </td>
        </tr>` : ''}

        <!-- Anexos -->
        ${attachments.length > 0 ? `
        <tr><td style="padding:0 20px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
        <tr>
          <td style="padding:14px 20px;">
            <p style="margin:0 0 10px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Anexos (${attachments.length})</p>
            ${attachments.map((a: any) => `
            <div style="margin-bottom:6px;padding:8px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
              <span style="color:#374151;font-size:13px;font-weight:500;">📎 ${a.file_name}</span>
              ${a.size_bytes ? `<span style="color:#94a3b8;font-size:12px;margin-left:8px;">${formatFileSize(a.size_bytes)}</span>` : ''}
              ${a.category ? `<span style="color:#6366f1;font-size:12px;margin-left:8px;">• ${a.category}</span>` : ''}
            </div>`).join('')}
          </td>
        </tr>` : ''}

      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:20px 32px 28px;text-align:center;">
      <a href="${APP_URL}/boards/${task.board.id}"
         style="display:inline-block;padding:14px 36px;background:#1C325C;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:.3px;">
        Ver Tarefa Completa →
      </a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
        Você configurou um lembrete para esta tarefa no Sistema Kanban Qualitec.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`
}
