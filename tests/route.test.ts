import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { validApplication } from './fixtures'
import { POST } from '@/app/api/fellowship/route'

const insert = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ insert }) }),
}))

const appendSheetRow = vi.fn()
vi.mock('@/lib/sheets', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/sheets')>()),
  appendSheetRow: (...args: unknown[]) => appendSheetRow(...args),
}))

const notifyTeam = vi.fn()
const confirmApplicant = vi.fn()
vi.mock('@/lib/notify', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/notify')>()),
  notifyTeam: (...args: unknown[]) => notifyTeam(...args),
  confirmApplicant: (...args: unknown[]) => confirmApplicant(...args),
}))

// vi.mock calls above are hoisted, so this import already sees the mocks.

function post(body: unknown) {
  return POST(new NextRequest('http://localhost/api/fellowship', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.example')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
  vi.stubEnv('FELLOWSHIP_SHEET_WEBHOOK_URL', 'https://script.example/exec')
  vi.stubEnv('FELLOWSHIP_SHEET_SECRET', 's3cret')
  insert.mockResolvedValue({ error: null })
  appendSheetRow.mockResolvedValue(undefined)
  notifyTeam.mockResolvedValue(undefined)
  confirmApplicant.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('POST /api/fellowship', () => {
  it('writes a valid application to both stores under one reference', async () => {
    const res = await post(validApplication())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(insert).toHaveBeenCalledOnce()
    expect(appendSheetRow).toHaveBeenCalledOnce()

    const row: string[] = appendSheetRow.mock.calls[0][2]
    expect(insert.mock.calls[0][0].id).toBe(body.id)
    expect(row).toContain(body.id)
    expect(insert.mock.calls[0][0].email).toBe('amina@example.org')
  })

  it('rejects unreadable JSON', async () => {
    const res = await post('{not json')
    expect(res.status).toBe(400)
  })

  it('returns the field errors for an incomplete application', async () => {
    const res = await post({ ...validApplication(), why_sector: '' })
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.fields).toHaveProperty('why_sector')
    expect(insert).not.toHaveBeenCalled()
    expect(appendSheetRow).not.toHaveBeenCalled()
  })

  it('keeps an application whose hidden field was autofilled, flagged for review', async () => {
    const res = await post({ ...validApplication(), company_website: 'https://my-company.example' })
    expect(res.status).toBe(200)
    expect(insert).toHaveBeenCalledOnce()
    expect(insert.mock.calls[0][0]).not.toHaveProperty('company_website')
    const row: string[] = appendSheetRow.mock.calls[0][2]
    expect(row[1]).toBe('Check: possible spam')
    expect(notifyTeam.mock.calls[0][0].subject).toBe('[Check: possible spam] New Fellowship application: Amina Yusuf')
    expect(confirmApplicant).toHaveBeenCalledOnce()
  })

  it('marks an ordinary application as New in the sheet', async () => {
    await post(validApplication())
    const row: string[] = appendSheetRow.mock.calls[0][2]
    expect(row[1]).toBe('New')
  })

  it('still accepts the application when only the sheet fails', async () => {
    appendSheetRow.mockRejectedValue(new Error('sheet down'))
    const res = await post(validApplication())
    expect(res.status).toBe(200)
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/Google Sheet write failed/), expect.anything())
  })

  it('still accepts the application when only Supabase fails', async () => {
    insert.mockResolvedValue({ error: { message: 'relation does not exist' } })
    const res = await post(validApplication())
    expect(res.status).toBe(200)
  })

  it('tells the applicant when nothing could be saved', async () => {
    appendSheetRow.mockRejectedValue(new Error('sheet down'))
    insert.mockResolvedValue({ error: { message: 'db down' } })
    const res = await post(validApplication())
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toMatch(/info@philanthropel.com/)
  })

  it('treats a missing sheet configuration as a sheet failure, not a crash', async () => {
    vi.stubEnv('FELLOWSHIP_SHEET_SECRET', '')
    const res = await post(validApplication())
    expect(res.status).toBe(200)
    expect(appendSheetRow).not.toHaveBeenCalled()
  })

  it('emails the team once the application is saved', async () => {
    await post(validApplication())
    expect(notifyTeam).toHaveBeenCalledOnce()
    expect(notifyTeam.mock.calls[0][0].subject).toBe('New Fellowship application: Amina Yusuf')
  })

  it('sends no email for an application that could not be saved', async () => {
    appendSheetRow.mockRejectedValue(new Error('sheet down'))
    insert.mockResolvedValue({ error: { message: 'db down' } })
    await post(validApplication())
    expect(notifyTeam).not.toHaveBeenCalled()
    expect(confirmApplicant).not.toHaveBeenCalled()
  })

  it('emails the applicant a confirmation with their reference', async () => {
    const res = await post(validApplication())
    const { id } = await res.json()
    expect(confirmApplicant).toHaveBeenCalledOnce()
    const email = confirmApplicant.mock.calls[0][0]
    expect(email.to).toBe('amina@example.org')
    expect(email.body).toContain('Hi Amina,')
    expect(email.body).toContain(id)
  })
})
