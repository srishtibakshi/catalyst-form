import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/submit/route'

const single = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ insert: () => ({ select: () => ({ single }) }) }) }),
}))

const notifyTeam = vi.fn()
vi.mock('@/lib/notify', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/notify')>()),
  notifyTeam: (...args: unknown[]) => notifyTeam(...args),
}))

function post(body: unknown) {
  return POST(new NextRequest('http://localhost/api/submit', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.example')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
  single.mockResolvedValue({ data: { id: 'row-1', cohort_tag: 'Explorer' }, error: null })
  notifyTeam.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('POST /api/submit', () => {
  it('emails the team about a saved intake response', async () => {
    const res = await post({ respondent_name: ' Sam Lee ', respondent_email: 'Sam@Example.org' })
    expect(res.status).toBe(200)
    expect(notifyTeam).toHaveBeenCalledOnce()
    const alert = notifyTeam.mock.calls[0][0]
    expect(alert.subject).toBe('New Catalyst intake: Sam Lee')
    expect(alert.body).toContain('sam@example.org')
    expect(alert.body).toContain('row-1')
  })

  it('sends no alert when the response could not be saved', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'db down' } })
    const res = await post({ respondent_name: 'Sam', respondent_email: 'sam@example.org' })
    expect(res.status).toBe(500)
    expect(notifyTeam).not.toHaveBeenCalled()
  })

  it('sends no alert for a response missing name or email', async () => {
    const res = await post({ respondent_name: '', respondent_email: '' })
    expect(res.status).toBe(400)
    expect(notifyTeam).not.toHaveBeenCalled()
  })
})
