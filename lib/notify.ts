/**
 * Email alerts to the Philanthropel team when someone submits a form.
 *
 * Sent through the same Apps Script web app that writes the Fellowship
 * review sheet (google-apps-script/fellowship-sheet.gs), using its
 * "notify" action: the script mails the alert from the Google account that
 * owns it, to the addresses in its NOTIFY_EMAILS script property. No mail
 * provider, no extra API key, and recipients change without a deploy.
 *
 * An alert is a courtesy, not a record: the submission is already saved
 * before one is sent, so a failed alert is logged and never fails the form.
 *
 * Server-only. Never import this from a client component.
 */
import type { FellowshipApplication, SubmissionMeta } from '@/lib/fellowship'
import { sheetConfigFromEnv, type SheetConfig } from '@/lib/sheets'

const TIMEOUT_MS = 10_000
const SUBJECT_NAME_MAX = 100

export interface Alert {
  subject: string
  body: string
}

/** Applicant text in a subject: one line, bounded length. */
function subjectPart(value: string): string {
  const oneLine = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  const safe = oneLine || '(no name)'
  return safe.length > SUBJECT_NAME_MAX ? `${safe.slice(0, SUBJECT_NAME_MAX - 1)}…` : safe
}

function lines(fields: ReadonlyArray<readonly [string, string]>): string {
  return fields
    .filter(([, value]) => value.trim() !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}

export function fellowshipAlert(a: FellowshipApplication, m: SubmissionMeta): Alert {
  return {
    subject: `New Fellowship application: ${subjectPart(a.name)}`,
    body: [
      'A new Fellowship application has arrived.',
      '',
      lines([
        ['Name', a.name.trim()],
        ['Email', a.email.trim()],
        ['Location', a.location],
        ['Link', a.link],
        ['Stage', a.stage],
        ['Focus areas', a.focus_areas.join(', ')],
        ['Time commitment', a.time_commitment],
        ['Submitted', m.submittedAt],
        ['Reference', m.id],
      ]),
      '',
      'The full application is in the review sheet and in Supabase (fellowship_applications).',
    ].join('\n'),
  }
}

export interface IntakeSummary {
  id: string
  name: string
  email: string
  cohort: string | null
}

export function intakeAlert(r: IntakeSummary): Alert {
  return {
    subject: `New Catalyst intake: ${subjectPart(r.name)}`,
    body: [
      'A new Catalyst intake response has arrived.',
      '',
      lines([
        ['Name', r.name],
        ['Email', r.email],
        ['Cohort', r.cohort ?? ''],
        ['Reference', r.id],
      ]),
      '',
      'The full response is in Supabase (intake_responses) and the Catalyst admin.',
    ].join('\n'),
  }
}

interface ScriptResponse {
  ok?: boolean
  error?: string
}

/** Ask the Apps Script to email the team. Throws with a reason on failure. */
export async function sendAlert(config: SheetConfig, alert: Alert): Promise<void> {
  const res = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: config.secret, action: 'notify', ...alert }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) throw new Error(`Alert webhook returned HTTP ${res.status}`)

  let body: ScriptResponse
  try {
    body = (await res.json()) as ScriptResponse
  } catch {
    throw new Error('Alert webhook did not return JSON — check the Apps Script deployment access')
  }
  if (!body.ok) throw new Error(`Alert webhook refused: ${body.error ?? 'no reason given'}`)
}

/** Send an alert if configured. Never throws: failures are logged. */
export async function notifyTeam(alert: Alert): Promise<void> {
  const config = sheetConfigFromEnv()
  if (!config) {
    console.error(`[alert] Not sent, webhook is not configured: ${alert.subject}`)
    return
  }
  try {
    await sendAlert(config, alert)
  } catch (err) {
    console.error(`[alert] Not sent: ${alert.subject}`, err)
  }
}
