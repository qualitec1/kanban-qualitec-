import { verifyEmailConfig } from '../../utils/email'
import { requireEmailAdmin } from '../../utils/emailAuthorization.ts'

export default defineEventHandler(async (event) => {
  await requireEmailAdmin(event)
  try {
    if (!await verifyEmailConfig()) throw new Error('Verification failed')
    return { success: true }
  } catch {
    throw createError({ statusCode: 500, message: 'Email configuration verification failed' })
  }
})
