import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  validateApplication,
  toSheetRow,
  SHEET_HEADERS,
  type FellowshipApplication,
  type SubmissionMeta,
} from '@/lib/fellowship'
import { appendSheetRow, sheetConfigFromEnv } from '@/lib/sheets'

/* Hidden field the form renders off-screen. People never see it, so they
   never fill it; form-filling bots fill every field they find. */
const HONEYPOT = 'company_website'

const SAVE_FAILED =
  'We could not save your application. Please try again in a moment, or email info@philanthropel.com.'

async function saveToSupabase(a: FellowshipApplication, m: SubmissionMeta): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase is not configured')

  // Service role on the server only — it bypasses RLS, so it never reaches the browser.
  const supabase = createClient(url, key)
  const { error } = await supabase.from('fellowship_applications').insert({
    id: m.id,
    submitted_at: m.submittedAt,
    ...a,
  })
  if (error) throw new Error(`Supabase insert failed: ${error.message}`)
}

async function saveToSheet(a: FellowshipApplication, m: SubmissionMeta): Promise<void> {
  const config = sheetConfigFromEnv()
  if (!config) throw new Error('Google Sheet webhook is not configured')
  await appendSheetRow(config, SHEET_HEADERS, toSheetRow(a, m))
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'The application could not be read.' }, { status: 400 })
  }

  if (typeof body === 'object' && body !== null && HONEYPOT in body) {
    const trap = (body as Record<string, unknown>)[HONEYPOT]
    if (typeof trap === 'string' && trap.trim() !== '') {
      // Look successful, so the bot learns nothing. Nothing is stored.
      return NextResponse.json({ success: true })
    }
  }

  const result = validateApplication(body)
  if (!result.ok) {
    return NextResponse.json(
      { error: 'A few answers need another look.', fields: result.errors },
      { status: 400 },
    )
  }

  const meta: SubmissionMeta = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
  }

  /* Written to both, independently. Either one holding the application is
     enough to tell the applicant it arrived — failing them because one of two
     stores hiccuped would lose a real application to save a log line. Each
     failure is logged with the reference, so a row missing from one store
     can be reconciled from the other. */
  const [sheet, db] = await Promise.allSettled([
    saveToSheet(result.value, meta),
    saveToSupabase(result.value, meta),
  ])

  if (sheet.status === 'rejected') {
    console.error(`[fellowship ${meta.id}] Google Sheet write failed:`, sheet.reason)
  }
  if (db.status === 'rejected') {
    console.error(`[fellowship ${meta.id}] Supabase write failed:`, db.reason)
  }
  if (sheet.status === 'rejected' && db.status === 'rejected') {
    return NextResponse.json({ error: SAVE_FAILED }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: meta.id })
}
