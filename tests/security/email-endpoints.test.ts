import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getClient: vi.fn(), sendEmail: vi.fn(), verify: vi.fn() }))
vi.mock('../../server/utils/supabase', () => ({ getSupabaseUser: mocks.getUser, getSupabaseClient: mocks.getClient }))
vi.mock('../../server/utils/email', () => ({ sendEmail: mocks.sendEmail, verifyEmailConfig: mocks.verify }))
import { requireEmailAdmin, requireTaskEmailPermission } from '../../server/utils/emailAuthorization'

const user = { id: 'caller', email: 'admin@example.com', email_confirmed_at: '2026-01-01' }
const event = {} as any
const taskId = '00000000-0000-4000-8000-000000000001'
const assigneeId = '00000000-0000-4000-8000-000000000002'
let sendTest: any, checkConfig: any, relay: any, assignment: any

function database(rows: Record<string, any>) {
  const from = vi.fn((table: string) => {
    const query: any = {
      select: vi.fn(() => query), eq: vi.fn(() => query),
      single: vi.fn(async () => rows[table] || { data: null, error: null }),
    }
    return query
  })
  mocks.getClient.mockReturnValue({ from })
  return from
}

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('createError', createError)
  sendTest = (await import('../../server/api/email/send-test.post')).default
  checkConfig = (await import('../../server/api/email/test.get')).default
  relay = (await import('../../server/api/emails/send-reminder.post')).default
  assignment = (await import('../../server/api/emails/task-assigned.post')).default
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue(user)
  mocks.sendEmail.mockResolvedValue(true)
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ taskId, assigneeId }))
  database({
    profiles: { data: { role_global: 'collaborator' } },
    tasks: { data: { board_id: 'board' } },
    boards: { data: { created_by: 'someone-else' } },
    board_members: { data: { access_role: 'editor' } },
    task_assignees: { data: { user_id: assigneeId } },
  })
})

describe('Email endpoint protection', () => {
  it.each(['sendTest', 'checkConfig', 'assignment'])('rejects unauthenticated calls to %s before doing any work', async (name) => {
    mocks.getUser.mockResolvedValue(null)
    const handler = { sendTest, checkConfig, assignment }[name]!
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getClient).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.verify).not.toHaveBeenCalled()
  })
  it('permanently rejects the arbitrary email relay', async () => {
    expect(() => relay(event)).toThrow(expect.objectContaining({ statusCode: 410 }))
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
  it('rejects diagnostic access for a non-admin', async () => {
    await expect(requireEmailAdmin(event)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('fails closed when the admin lookup fails', async () => {
    database({ profiles: { data: { role_global: 'master' }, error: new Error('database unavailable') } })
    await expect(checkConfig(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.verify).not.toHaveBeenCalled()
  })
  it('sends admin tests only to the authenticated verified address, ignoring arbitrary input', async () => {
    database({ profiles: { data: { role_global: 'master' } } })
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ to: 'outsider@example.com', html: 'untrusted' }))
    await expect(sendTest(event)).resolves.toEqual({ success: true })
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: user.email }))
    expect(mocks.sendEmail.mock.calls[0][0].html).not.toContain('untrusted')
  })
  it('rejects unverified admin addresses', async () => {
    database({ profiles: { data: { role_global: 'master' } } })
    mocks.getUser.mockResolvedValue({ ...user, email_confirmed_at: null })
    await expect(sendTest(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
  it('does not expose SMTP configuration on a successful diagnostic', async () => {
    database({ profiles: { data: { role_global: 'master' } } })
    mocks.verify.mockResolvedValue(true)
    await expect(checkConfig(event)).resolves.toEqual({ success: true })
  })
  it('does not expose provider details on diagnostic failure', async () => {
    database({ profiles: { data: { role_global: 'master' } } })
    mocks.verify.mockRejectedValue(new Error('sensitive provider information'))
    await expect(checkConfig(event)).rejects.toMatchObject({ statusCode: 500, message: 'Email configuration verification failed' })
  })
  it('rejects invalid identifiers before permission or privileged queries', async () => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ taskId: 'invalid', assigneeId }))
    await expect(assignment(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.getClient).not.toHaveBeenCalled()
  })
  it('rejects extra fields instead of accepting arbitrary recipients/content', async () => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ taskId, assigneeId, to: 'outsider@example.com' }))
    await expect(assignment(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('Task email permissions', () => {
  it('allows an editor to notify an existing task assignee', async () => {
    await expect(requireTaskEmailPermission(event, user.id, taskId, assigneeId)).resolves.toBeUndefined()
  })
  it.each(['viewer', 'guest'])('denies %s permission', async (role) => {
    database({ tasks: { data: { board_id: 'board' } }, profiles: { data: { role_global: 'collaborator' } }, boards: { data: { created_by: 'other' } }, board_members: { data: { access_role: role } } })
    await expect(assignment(event)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('denies inaccessible tasks', async () => {
    database({})
    await expect(assignment(event)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('denies unrelated recipients even for an admin', async () => {
    database({ tasks: { data: { board_id: 'board' } }, profiles: { data: { role_global: 'master' } } })
    await expect(requireTaskEmailPermission(event, user.id, taskId, assigneeId)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('allows the board creator with a linked recipient', async () => {
    database({ tasks: { data: { board_id: 'board' } }, profiles: { data: { role_global: 'collaborator' } }, boards: { data: { created_by: user.id } }, task_assignees: { data: { user_id: assigneeId } } })
    await expect(requireTaskEmailPermission(event, user.id, taskId, assigneeId)).resolves.toBeUndefined()
  })
})
