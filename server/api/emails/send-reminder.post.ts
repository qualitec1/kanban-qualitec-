// Scheduled reminders are sent by supabase/functions/send-task-reminders.
// Never accept arbitrary recipients or HTML through this legacy public relay.
export default defineEventHandler(() => {
  throw createError({ statusCode: 410, message: 'This email endpoint has been retired' })
})
