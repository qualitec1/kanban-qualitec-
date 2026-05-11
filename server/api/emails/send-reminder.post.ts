import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { to, subject, html } = body

  if (!to || !subject || !html) {
    throw createError({ statusCode: 400, message: 'to, subject and html are required' })
  }

  const emailSmtp  = process.env.NUXT_EMAIL_SMTP  || process.env.EMAIL_SMTP  || ''
  const emailPort  = process.env.NUXT_EMAIL_PORT  || process.env.EMAIL_PORT  || '465'
  const emailUser  = process.env.NUXT_EMAIL_USER  || process.env.EMAIL_USER  || ''
  const emailPass  = process.env.NUXT_EMAIL_PASS  || process.env.EMAIL_PASS  || ''
  const emailFrom  = process.env.NUXT_EMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Sistema Kanban Qualitec'

  if (!emailSmtp || !emailUser || !emailPass) {
    throw createError({ statusCode: 500, message: 'Email environment variables not configured' })
  }

  try {
    const port = parseInt(emailPort)
    const transporter = nodemailer.createTransport({
      host: emailSmtp,
      port,
      secure: port === 465,
      auth: { user: emailUser, pass: emailPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      socketTimeout: 15000,
    })

    await transporter.sendMail({
      from: `"${emailFrom}" <${emailUser}>`,
      to,
      subject,
      html,
    })

    return { success: true }
  } catch (err: any) {
    console.error('[send-reminder] SMTP error:', err.message)
    throw createError({ statusCode: 500, message: `SMTP error: ${err.message}` })
  }
})
