const dotenv = require("dotenv")
const nodemailer = require("nodemailer")
const { createClient } = require("@supabase/supabase-js")

dotenv.config()

const EMAIL_HOST = process.env.SMTP_HOST || process.env.NUXT_EMAIL_SMTP
const EMAIL_PORT = parseInt(process.env.SMTP_PORT || process.env.NUXT_EMAIL_PORT || "465")
const EMAIL_USER = process.env.SMTP_USER || process.env.NUXT_EMAIL_USER
const EMAIL_PASS = process.env.SMTP_PASS || process.env.NUXT_EMAIL_PASS
const EMAIL_FROM = process.env.SMTP_FROM_NAME || "Kanban Industrial"

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function main() {
  const transporter = nodemailer.createTransport({ host: EMAIL_HOST, port: EMAIL_PORT, secure: EMAIL_PORT === 465, auth: { user: EMAIL_USER, pass: EMAIL_PASS } })
  try { await transporter.verify(); console.log("SMTP OK") } catch(e) { console.error("SMTP fail:", e.message); process.exit(1) }

  const { data: reminders, error } = await supabase.from("task_reminders").select("id, enabled, reminder_type, reminder_time, days_before, start_date, task_id, user_id, task:tasks(id, title, due_date, status:task_statuses(name, is_done)), user:profiles(email, full_name)")
  if (error) { console.error("DB error:", error.message); process.exit(1) }

  console.log("Total lembretes no banco:", reminders?.length || 0)
  const nowBrasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
  const todayStr = nowBrasilia.toISOString().split("T")[0]
  const cH = nowBrasilia.getHours(), cM = nowBrasilia.getMinutes()
  const currentTime = `${cH.toString().padStart(2,"0")}:${cM.toString().padStart(2,"0")}`
  console.log("Hora Brasilia:", currentTime, "| Data:", todayStr)

  for (const r of (reminders || [])) {
    console.log("\n--- Lembrete:", r.id, "---")
    console.log("  Tarefa:", r.task?.title, "| email:", r.user?.email)
    console.log("  enabled:", r.enabled, "| tipo:", r.reminder_type, "| horario:", r.reminder_time)
    console.log("  due_date:", r.task?.due_date, "| concluido:", r.task?.status?.is_done)
    if (!r.enabled) { console.log("  => DESATIVADO"); continue }
    if (r.task?.status?.is_done) { console.log("  => TAREFA CONCLUIDA"); continue }

    let shouldSend = false
    if (r.reminder_type === "daily_interval") {
      const sd = r.start_date?.split("T")[0]
      shouldSend = !!sd && todayStr >= sd
      console.log("  daily_interval start:", sd, "=> shouldSend:", shouldSend)
    } else {
      if (r.task?.due_date) {
        const [y,m,d] = r.task.due_date.split("T")[0].split("-").map(Number)
        const dueDate = new Date(y, m-1, d)
        const reminderDate = new Date(dueDate)
        reminderDate.setDate(reminderDate.getDate() - (r.days_before || 0))
        reminderDate.setHours(0,0,0,0)
        const today = new Date(nowBrasilia); today.setHours(0,0,0,0)
        shouldSend = reminderDate.getTime() === today.getTime()
        console.log("  days_before:", r.days_before, "| lembrete em:", reminderDate.toISOString().split("T")[0], "| shouldSend:", shouldSend)
      }
    }
    if (!shouldSend) { console.log("  => Nao e dia de enviar"); continue }

    const [rH, rM] = r.reminder_time.substring(0,5).split(":").map(Number)
    const diff = Math.abs((rH*60+rM)-(cH*60+cM))
    console.log("  Diferenca horario:", diff, "min (janela: 15 min)")
    if (diff > 15) { console.log("  => FORA DA JANELA (horario:", r.reminder_time, ")"); continue }

    if (!r.user?.email) { console.log("  => Sem email"); continue }
    console.log("  => ENVIANDO para", r.user.email)
    try {
      const res = await transporter.sendMail({ from: `"${EMAIL_FROM}" <${EMAIL_USER}>`, to: r.user.email, subject: `Lembrete: ${r.task?.title}`, html: `<p>Ola ${r.user.full_name || ""}! Lembrete da tarefa: <b>${r.task?.title}</b>. Prazo: ${r.task?.due_date || "N/A"}</p>` })
      console.log("  => EMAIL ENVIADO! msgId:", res.messageId)
    } catch(e) { console.error("  => ERRO ao enviar:", e.message) }
  }
  console.log("\nConcluido.")
}
main().catch(console.error)
