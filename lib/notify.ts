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
import { SPAM_FLAG, type FellowshipApplication, type SubmissionMeta } from '@/lib/fellowship'
import { sheetConfigFromEnv, type SheetConfig } from '@/lib/sheets'

const TIMEOUT_MS = 10_000
const SUBJECT_NAME_MAX = 100

export interface Alert {
  subject: string
  body: string
  /** Add the Fellowship review sheet link. Only Fellowship alerts set this. */
  reviewSheet?: boolean
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

const LINKEDIN_PROFILE = /linkedin\.com\/in\/[A-Za-z0-9\-_%]+/i

/** The applicant's LinkedIn profile, cleaned up from whatever they typed, or null. */
export function linkedinProfile(text: string): string | null {
  const match = text.match(LINKEDIN_PROFILE)
  return match ? `https://www.${match[0]}` : null
}

/** A LinkedIn line for the team: the profile, or a people search when none was given. */
function linkedinLine(a: FellowshipApplication): string {
  const profile = linkedinProfile(a.link)
  if (profile) return profile
  const search = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(a.name.trim())}`
  return `not provided. Search: ${search}`
}

export function fellowshipAlert(a: FellowshipApplication, m: SubmissionMeta): Alert {
  return {
    subject: `${m.flaggedAsSpam ? `[${SPAM_FLAG}] ` : ''}New Fellowship application: ${subjectPart(a.name)}`,
    body: [
      'A new Fellowship application has arrived.',
      '',
      lines([
        ['Name', a.name.trim()],
        ['Email', a.email.trim()],
        ['LinkedIn', linkedinLine(a)],
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
    reviewSheet: true,
  }
}

/** The Catalyst intake questions, in form order, as the respondent saw them. */
export const INTAKE_QUESTIONS: ReadonlyArray<readonly [string, string]> = [
  ['q1_intro', 'What do you do?'],
  ['q2_world', 'Which of these best describes your world right now?'],
  ['q3_tuesday', 'Walk me through a typical Tuesday.'],
  ['q4_ai_reaction', 'When you hear "AI", what\'s your honest first reaction?'],
  ['q5_ai_experience', 'Have you actually tried any AI tools yet?'],
  ['q6_confidence', 'How confident do you feel talking about AI to someone you respect? (1 to 5)'],
  ['q7_energy', 'Where does most of your energy go each week?'],
  ['q8_dread', 'What part of your week do you dread most?'],
  ['q9_two_hours', 'If you could reclaim 2 hours a day, what would you actually do with them?'],
  ['q10_outcomes', 'What would make our sessions together feel genuinely worthwhile?'],
  ['q11_worries', "Is there anything you're worried about when it comes to AI?"],
  ['q12_wildcard', "What's one thing you want me to know about you that a form like this probably won't capture?"],
]

/** One answer as plain text: lists joined, blanks marked. */
function answerText(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map(v => String(v).trim()).filter(Boolean)
    return items.length ? items.join(', ') : '(no answer)'
  }
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return '(no answer)'
}

export interface IntakeSummary {
  id: string
  name: string
  email: string
  cohort: string | null
  /** The saved answers, keyed q1_intro … q12_wildcard. */
  answers: Readonly<Record<string, unknown>>
}

export function intakeAlert(r: IntakeSummary): Alert {
  const answers = INTAKE_QUESTIONS.map(
    ([key, question], i) => `${i + 1}. ${question}\n${answerText(r.answers[key])}`,
  )
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
      'Their answers',
      '',
      answers.join('\n\n'),
      '',
      'The full response is also in Supabase (intake_responses) and the Catalyst admin.',
    ].join('\n'),
  }
}

/** The email an applicant gets the moment their application is saved. */
export interface ApplicantEmail extends Alert {
  to: string
}

export function applicantConfirmation(a: FellowshipApplication, m: SubmissionMeta): ApplicantEmail {
  const firstName = subjectPart(a.name).split(' ')[0]
  return {
    to: a.email,
    subject: "We've received your Philanthropel Fellowship application",
    body: [
      `Hi ${firstName},`,
      '',
      'Thank you for applying to the Philanthropel Fellowship. Your application has reached us safely.',
      '',
      "We read every application personally, and we'll be in touch by email once we've reviewed yours.",
      '',
      `Your reference: ${m.id}`,
      '',
      'If you have any questions in the meantime, just reply to this email.',
      '',
      'Warm regards,',
      'Anmol and Srishti',
      'Philanthropel',
    ].join('\n'),
  }
}

interface ScriptResponse {
  ok?: boolean
  error?: string
}

/** POST an action to the Apps Script. Throws with a reason on failure. */
async function postToScript(config: SheetConfig, payload: Record<string, string>): Promise<void> {
  const res = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: config.secret, ...payload }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) throw new Error(`Email webhook returned HTTP ${res.status}`)

  let body: ScriptResponse
  try {
    body = (await res.json()) as ScriptResponse
  } catch {
    throw new Error('Email webhook did not return JSON — check the Apps Script deployment access')
  }
  if (!body.ok) throw new Error(`Email webhook refused: ${body.error ?? 'no reason given'}`)
}

/** Ask the Apps Script to email the team. Throws with a reason on failure. */
export async function sendAlert(config: SheetConfig, alert: Alert): Promise<void> {
  const { reviewSheet, ...email } = alert
  await postToScript(config, { action: 'notify', ...email, ...(reviewSheet ? { reviewSheet: 'yes' } : {}) })
}

/** Ask the Apps Script to email one applicant. Throws with a reason on failure. */
export async function sendApplicantEmail(config: SheetConfig, email: ApplicantEmail): Promise<void> {
  await postToScript(config, { action: 'confirm', to: email.to, subject: email.subject, body: email.body })
}

/** Confirm receipt to the applicant if configured. Never throws: failures are logged. */
export async function confirmApplicant(email: ApplicantEmail): Promise<void> {
  const config = sheetConfigFromEnv()
  if (!config) {
    console.error('[confirmation] Not sent, webhook is not configured')
    return
  }
  try {
    await sendApplicantEmail(config, email)
  } catch (err) {
    console.error('[confirmation] Not sent', err)
  }
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
