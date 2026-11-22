import { describe, it, expect, vi, afterEach } from 'vitest'
import { fellowshipAlert, intakeAlert, sendAlert, notifyTeam } from '@/lib/notify'
import { validApplication } from './fixtures'

const config = { webhookUrl: 'https://script.example/exec', secret: 's3cret' }
const meta = { id: 'ref-123', submittedAt: '2026-11-21T10:00:00.000Z' }

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('fellowshipAlert', () => {
  it('names the applicant in the subject and carries the reference in the body', () => {
    const alert = fellowshipAlert(validApplication({ name: 'Amina Yusuf' }), meta)
    expect(alert.subject).toBe('New Fellowship application: Amina Yusuf')
    expect(alert.body).toContain('ref-123')
    expect(alert.body).toContain('Donor engagement, Grantmaking')
  })

  it('keeps applicant text from adding lines to the subject', () => {
    const alert = fellowshipAlert(validApplication({ name: 'Eve\r\nBcc: x@evil.example' }), meta)
    expect(alert.subject).not.toMatch(/[\r\n]/)
  })

  it('caps a very long name in the subject', () => {
    const alert = fellowshipAlert(validApplication({ name: 'A'.repeat(500) }), meta)
    expect(alert.subject.length).toBeLessThanOrEqual(150)
  })
})

describe('intakeAlert', () => {
  it('names the respondent and their cohort', () => {
    const alert = intakeAlert({ id: 'abc', name: 'Sam Lee', email: 'sam@example.org', cohort: 'Explorer' })
    expect(alert.subject).toBe('New Catalyst intake: Sam Lee')
    expect(alert.body).toContain('sam@example.org')
    expect(alert.body).toContain('Explorer')
    expect(alert.body).toContain('abc')
  })
})

describe('sendAlert', () => {
  it('posts the alert with the secret and the notify action', async () => {
    const fetchFn = mockFetch(Response.json({ ok: true }))
    await sendAlert(config, { subject: 'S', body: 'B' })
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body)
    expect(sent).toEqual({ secret: 's3cret', action: 'notify', subject: 'S', body: 'B' })
  })

  it('throws when the script refuses', async () => {
    mockFetch(Response.json({ ok: false, error: 'unauthorised' }))
    await expect(sendAlert(config, { subject: 'S', body: 'B' })).rejects.toThrow(/unauthorised/)
  })

  it('throws when the script answers with HTML instead of JSON', async () => {
    mockFetch(new Response('<html>sign in</html>'))
    await expect(sendAlert(config, { subject: 'S', body: 'B' })).rejects.toThrow(/JSON/)
  })
})

describe('notifyTeam', () => {
  it('never throws, and logs, when sending fails', async () => {
    vi.stubEnv('FELLOWSHIP_SHEET_WEBHOOK_URL', config.webhookUrl)
    vi.stubEnv('FELLOWSHIP_SHEET_SECRET', config.secret)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(notifyTeam({ subject: 'S', body: 'B' })).resolves.toBeUndefined()
    expect(log).toHaveBeenCalled()
  })

  it('logs and skips when the webhook is not configured', async () => {
    vi.stubEnv('FELLOWSHIP_SHEET_WEBHOOK_URL', '')
    vi.stubEnv('FELLOWSHIP_SHEET_SECRET', '')
    const fetchFn = vi.fn()
    vi.stubGlobal('fetch', fetchFn)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await notifyTeam({ subject: 'S', body: 'B' })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalled()
  })
})
