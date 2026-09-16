import { sendEmail } from '../../utils/email'
import { requireEmailAdmin } from '../../utils/emailAuthorization.ts'

export default defineEventHandler(async (event) => {
  const user = await requireEmailAdmin(event)
  if (!user.email || !user.email_confirmed_at) {
    throw createError({ statusCode: 403, message: 'A verified email address is required' })
  }
  // Destination and content are server-controlled, never taken from the body.
  const success = await sendEmail({
    to: user.email,
    subject: 'Teste de e-mail - Qualitec',
    html: '<p>O envio de e-mails do Qualitec esta funcionando.</p>',
  })
  if (!success) throw createError({ statusCode: 500, message: 'Failed to send test email' })
  return { success: true }
})
