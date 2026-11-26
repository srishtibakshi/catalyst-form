import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  fellowshipAlert,
  intakeAlert,
  sendAlert,
  notifyTeam,
  applicantConfirmation,
  sendApplicantEmail,
  confirmApplicant,
  linkedinProfile,
} from '@/lib/notify'
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

describe('LinkedIn in the Fellowship alert', () => {
  it('pulls a clean profile link out of a messy link field', () => {
    const link = 'lhttps://www.linkedin.com/in/nandini-mane-7983b02b3/     Behance- https://www.behance.net/x'
    expect(linkedinProfile(link)).toBe('https://www.linkedin.com/in/nandini-mane-7983b02b3')
    expect(linkedinProfile('www.linkedin.com/in/vishruti-bhandari-26042a294')).toBe(
      'https://www.linkedin.com/in/vishruti-bhandari-26042a294',
    )
  })

  it('shows the profile in the alert', () => {
    const alert = fellowshipAlert(validApplication({ link: 'linkedin.com/in/amina-yusuf' }), meta)
    expect(alert.body).toContain('LinkedIn: https://www.linkedin.com/in/amina-yusuf')
  })

  it('offers a name search when no profile was given', () => {
    const alert = fellowshipAlert(validApplication({ name: 'Amina Yusuf', link: 'https://drive.google.com/x' }), meta)
    expect(alert.body).toContain(
      'LinkedIn: not provided. Search: https://www.linkedin.com/search/results/people/?keywords=Amina%20Yusuf',
    )
  })
})

describe('intakeAlert', () => {
  const answers = {
    q1_intro: 'I run a small foundation.',
    q6_confidence: 3,
    q7_energy: ['Meetings', 'Email'],
    q12_wildcard: '  ',
  }

  it('names the respondent and their cohort', () => {
    const alert = intakeAlert({ id: 'abc', name: 'Sam Lee', email: 'sam@example.org', cohort: 'Explorer', answers })
    expect(alert.subject).toBe('New Catalyst intake: Sam Lee')
    expect(alert.body).toContain('sam@example.org')
    expect(alert.body).toContain('Explorer')
    expect(alert.body).toContain('abc')
  })

  it('lists every question with the answer given, in form order', () => {
    const alert = intakeAlert({ id: 'abc', name: 'Sam Lee', email: 'sam@example.org', cohort: null, answers })
    expect(alert.body).toContain('1. What do you do?\nI run a small foundation.')
    expect(alert.body).toContain('(1 to 5)\n3')
    expect(alert.body).toContain('Where does most of your energy go each week?\nMeetings, Email')
    expect(alert.body).toContain("probably won't capture?\n(no answer)")
    expect(alert.body.indexOf('1. What do you do?')).toBeLessThan(alert.body.indexOf('12. '))
  })

  it('does not ask for the Fellowship review sheet link', () => {
    const alert = intakeAlert({ id: 'abc', name: 'Sam', email: 's@example.org', cohort: null, answers })
    expect(alert.reviewSheet).toBeFalsy()
    expect(fellowshipAlert(validApplication(), meta).reviewSheet).toBe(true)
  })
})

describe('sendAlert', () => {
  it('posts the alert with the secret and the notify action', async () => {
    const fetchFn = mockFetch(Response.json({ ok: true }))
    await sendAlert(config, { subject: 'S', body: 'B' })
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body)
    expect(sent).toEqual({ secret: 's3cret', action: 'notify', subject: 'S', body: 'B' })
  })

  it('asks the script for the review sheet link only when the alert wants it', async () => {
    const fetchFn = mockFetch(Response.json({ ok: true }))
    await sendAlert(config, { subject: 'S', body: 'B', reviewSheet: true })
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).reviewSheet).toBe('yes')
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

describe('applicantConfirmation', () => {
  it('greets the applicant by first name and gives their reference', () => {
    const email = applicantConfirmation(validApplication({ name: 'Amina Yusuf', email: 'amina@example.org' }), meta)
    expect(email.to).toBe('amina@example.org')
    expect(email.subject).toBe("We've received your Philanthropel Fellowship application")
    expect(email.body.startsWith('Hi Amina,')).toBe(true)
    expect(email.body).toContain('ref-123')
  })

  it('keeps a hostile name to one line', () => {
    const email = applicantConfirmation(validApplication({ name: 'Eve\r\nBcc: x@evil.example' }), meta)
    expect(email.body.split('\n')[0]).toBe('Hi Eve,')
  })
})

describe('sendApplicantEmail', () => {
  it('posts the confirm action with the recipient', async () => {
    const fetchFn = mockFetch(Response.json({ ok: true }))
    await sendApplicantEmail(config, { to: 'a@example.org', subject: 'S', body: 'B' })
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body)
    expect(sent).toEqual({ secret: 's3cret', action: 'confirm', to: 'a@example.org', subject: 'S', body: 'B' })
  })
})

describe('confirmApplicant', () => {
  it('never throws, and logs, when sending fails', async () => {
    vi.stubEnv('FELLOWSHIP_SHEET_WEBHOOK_URL', config.webhookUrl)
    vi.stubEnv('FELLOWSHIP_SHEET_SECRET', config.secret)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(confirmApplicant({ to: 'a@example.org', subject: 'S', body: 'B' })).resolves.toBeUndefined()
    expect(log).toHaveBeenCalled()
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
