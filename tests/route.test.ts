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

  it('pretends to accept a bot and stores nothing', async () => {
    const res = await post({ ...validApplication(), company_website: 'https://spam.example' })
    expect(res.status).toBe(200)
    expect(insert).not.toHaveBeenCalled()
    expect(appendSheetRow).not.toHaveBeenCalled()
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
})
