/**
 * The Fellowship application — one source of truth.
 *
 * The form, the server-side validation and the Google Sheet's columns all
 * read from this file, so a question cannot be added in one place and
 * silently missed in another. Option lists are validated on the server as
 * well as the client: the browser is not trusted to send only the values it
 * was shown.
 */

export const STAGE_OPTIONS = [
  'Studying — at university or college',
  'Early in my career — a few years into working life',
  'Changing direction — moving in from another field',
  'Experienced — I bring years of work in my field',
  'Something else',
] as const

export const NOT_YET_CONNECTED = "Not yet — that's part of why I'm applying"
export const CONNECTION_OPTIONS = [
  'I work or have worked at a non-profit, charity or foundation',
  'I volunteer or have volunteered',
  "I've studied it, or worked with it from the outside",
  "I've been on the receiving end of its work",
  NOT_YET_CONNECTED,
] as const

/* The catalogue areas, in the order philanthropel.com lists them. */
export const OPEN_TO_ANYTHING = 'Not sure yet — open to anything'
export const FOCUS_OPTIONS = [
  'Donor engagement',
  'Campaigns and supporter marketing',
  'Prospect research',
  'Grantmaking',
  'Scholarships and awards',
  'Employee giving and volunteering',
  'Membership and visitor operations',
  OPEN_TO_ANYTHING,
] as const
export const MAX_FOCUS_AREAS = 3

export const TIME_OPTIONS = [
  'Full time — around 35 hours or more',
  'Part time — around 15 to 20 hours',
  'A few hours — around 5 to 10',
  'Not sure yet',
] as const

export const HEARD_OPTIONS = [
  'LinkedIn',
  'A friend or colleague',
  'My university or careers service',
  'The Philanthropel website',
  'Somewhere else',
] as const

/* Options that cannot sit alongside any other choice in the same question. */
export const EXCLUSIVE_OPTIONS: readonly string[] = [NOT_YET_CONNECTED, OPEN_TO_ANYTHING]

export interface FellowshipApplication {
  name: string
  email: string
  location: string
  link: string
  stage: string
  background: string
  why_sector: string
  sector_connection: string[]
  focus_areas: string[]
  ai_comfort: number | null
  built_something: string
  problem_idea: string
  time_commitment: string
  heard_from: string
  anything_else: string
  consent: boolean
}

export type FieldKey = keyof FellowshipApplication
export type FieldErrors = Partial<Record<FieldKey, string>>

export const EMPTY_APPLICATION: FellowshipApplication = {
  name: '', email: '', location: '', link: '',
  stage: '', background: '', why_sector: '',
  sector_connection: [], focus_areas: [],
  ai_comfort: null,
  built_something: '', problem_idea: '',
  time_commitment: '', heard_from: '', anything_else: '',
  consent: false,
}

/* Generous enough for a considered answer, small enough that the endpoint
   cannot be used to post megabytes into a spreadsheet. */
export const SHORT_MAX = 200
export const LINK_MAX = 300
export const LONG_MAX = 5000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const REQUIRED = 'This one is required.'

function requiredText(value: string, max: number): string | null {
  const v = value.trim()
  if (!v) return REQUIRED
  if (v.length > max) return `Please keep this under ${max} characters.`
  return null
}

function optionalText(value: string, max: number): string | null {
  return value.trim().length > max ? `Please keep this under ${max} characters.` : null
}

function oneOf(value: string, options: readonly string[], required: boolean): string | null {
  if (!value) return required ? 'Please choose one.' : null
  return options.includes(value) ? null : 'Please choose one of the options.'
}

function someOf(values: string[], options: readonly string[], max?: number): string | null {
  if (values.length === 0) return 'Please choose at least one.'
  if (values.some(v => !options.includes(v))) return 'Please choose from the options.'
  if (new Set(values).size !== values.length) return 'Please choose each option once.'
  if (max !== undefined && values.length > max) return `Please choose up to ${max}.`
  const exclusive = values.filter(v => EXCLUSIVE_OPTIONS.includes(v))
  if (exclusive.length > 0 && values.length > 1) return `"${exclusive[0]}" can't be combined with other choices.`
  return null
}

/** The error for one field, or null if it is valid. */
export function fieldError(key: FieldKey, a: FellowshipApplication): string | null {
  switch (key) {
    case 'name':              return requiredText(a.name, SHORT_MAX)
    case 'email': {
      const err = requiredText(a.email, SHORT_MAX)
      if (err) return err
      return EMAIL_RE.test(a.email.trim()) ? null : 'That email address does not look right.'
    }
    case 'location':          return requiredText(a.location, SHORT_MAX)
    case 'link':              return optionalText(a.link, LINK_MAX)
    case 'stage':             return oneOf(a.stage, STAGE_OPTIONS, true)
    case 'background':        return requiredText(a.background, LONG_MAX)
    case 'why_sector':        return requiredText(a.why_sector, LONG_MAX)
    case 'sector_connection': return someOf(a.sector_connection, CONNECTION_OPTIONS)
    case 'focus_areas':       return someOf(a.focus_areas, FOCUS_OPTIONS, MAX_FOCUS_AREAS)
    case 'ai_comfort': {
      const n = a.ai_comfort
      return n !== null && Number.isInteger(n) && n >= 1 && n <= 5 ? null : 'Please choose a number from 1 to 5.'
    }
    case 'built_something':   return requiredText(a.built_something, LONG_MAX)
    case 'problem_idea':      return requiredText(a.problem_idea, LONG_MAX)
    case 'time_commitment':   return oneOf(a.time_commitment, TIME_OPTIONS, true)
    case 'heard_from':        return oneOf(a.heard_from, HEARD_OPTIONS, false)
    case 'anything_else':     return optionalText(a.anything_else, LONG_MAX)
    case 'consent':           return a.consent ? null : 'Please confirm you are happy for us to store your application.'
  }
}

export const FIELD_KEYS = Object.keys(EMPTY_APPLICATION) as FieldKey[]

export function errorsFor(keys: readonly FieldKey[], a: FellowshipApplication): FieldErrors {
  return keys.reduce<FieldErrors>((acc, key) => {
    const err = fieldError(key, a)
    return err ? { ...acc, [key]: err } : acc
  }, {})
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

/** Narrow untrusted input into an application, without judging it yet. */
export function coerceApplication(input: unknown): FellowshipApplication {
  const r = isRecord(input) ? input : {}
  const comfort = typeof r.ai_comfort === 'number' ? r.ai_comfort : Number(r.ai_comfort)
  return {
    name: str(r.name),
    email: str(r.email),
    location: str(r.location),
    link: str(r.link),
    stage: str(r.stage),
    background: str(r.background),
    why_sector: str(r.why_sector),
    sector_connection: strArr(r.sector_connection),
    focus_areas: strArr(r.focus_areas),
    ai_comfort: Number.isFinite(comfort) && r.ai_comfort !== null && r.ai_comfort !== '' ? comfort : null,
    built_something: str(r.built_something),
    problem_idea: str(r.problem_idea),
    time_commitment: str(r.time_commitment),
    heard_from: str(r.heard_from),
    anything_else: str(r.anything_else),
    consent: r.consent === true,
  }
}

export type ValidationResult =
  | { ok: true; value: FellowshipApplication }
  | { ok: false; errors: FieldErrors }

/** Validate untrusted input. On success the value is trimmed and normalised. */
export function validateApplication(input: unknown): ValidationResult {
  const a = coerceApplication(input)
  const errors = errorsFor(FIELD_KEYS, a)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      ...a,
      name: a.name.trim(),
      email: a.email.trim().toLowerCase(),
      location: a.location.trim(),
      link: a.link.trim(),
      background: a.background.trim(),
      why_sector: a.why_sector.trim(),
      built_something: a.built_something.trim(),
      problem_idea: a.problem_idea.trim(),
      anything_else: a.anything_else.trim(),
    },
  }
}

/** Which fields each slide of the form asks for. Index = slide number. */
export const SLIDE_FIELDS: readonly (readonly FieldKey[])[] = [
  [],                                   // 0  welcome
  ['name', 'email'],                    // 1
  ['location', 'link'],                 // 2
  ['stage'],                            // 3
  ['background'],                       // 4
  ['why_sector'],                       // 5
  ['sector_connection'],                // 6
  ['focus_areas'],                      // 7
  ['ai_comfort'],                       // 8
  ['built_something'],                  // 9
  ['problem_idea'],                     // 10
  ['time_commitment'],                  // 11
  ['heard_from'],                       // 12
  ['anything_else', 'consent'],         // 13 one last thing
]

export const LAST_SLIDE = SLIDE_FIELDS.length - 1
export const QUESTION_COUNT = LAST_SLIDE - 1

/** The first slide that holds any of these errors, for jumping back to it. */
export function firstSlideWithError(errors: FieldErrors): number | null {
  const idx = SLIDE_FIELDS.findIndex(keys => keys.some(k => errors[k]))
  return idx === -1 ? null : idx
}

/* ── The Google Sheet ─────────────────────────────────────────────── */

export interface SubmissionMeta {
  id: string
  submittedAt: string
}

const join = (xs: string[]) => xs.join('; ')

/** Column order of the review sheet. Reviewers work left to right. */
export const SHEET_COLUMNS: readonly {
  header: string
  value: (a: FellowshipApplication, m: SubmissionMeta) => string
}[] = [
  { header: 'Submitted at',                 value: (_, m) => m.submittedAt },
  { header: 'Status',                       value: () => 'New' },
  { header: 'Name',                         value: a => a.name },
  { header: 'Email',                        value: a => a.email },
  { header: 'Location',                     value: a => a.location },
  { header: 'Link',                         value: a => a.link },
  { header: 'Stage',                        value: a => a.stage },
  { header: 'Background',                   value: a => a.background },
  { header: 'Why the third sector',         value: a => a.why_sector },
  { header: 'Connection to the sector',     value: a => join(a.sector_connection) },
  { header: 'Areas of interest',            value: a => join(a.focus_areas) },
  { header: 'AI comfort (1–5)',             value: a => (a.ai_comfort === null ? '' : String(a.ai_comfort)) },
  { header: "Something they've built",      value: a => a.built_something },
  { header: 'A problem, and their approach', value: a => a.problem_idea },
  { header: 'Time per week',                value: a => a.time_commitment },
  { header: 'Heard about us',               value: a => a.heard_from },
  { header: 'Anything else',                value: a => a.anything_else },
  { header: 'Consent',                      value: a => (a.consent ? 'Yes' : 'No') },
  { header: 'Reference',                    value: (_, m) => m.id },
]

export const SHEET_HEADERS = SHEET_COLUMNS.map(c => c.header)

export function toSheetRow(a: FellowshipApplication, m: SubmissionMeta): string[] {
  return SHEET_COLUMNS.map(c => c.value(a, m))
}

/* ── Multi-select behaviour ───────────────────────────────────────── */

/**
 * The selection after tapping `option`. An exclusive option ("Not yet",
 * "open to anything") clears the others; any other option clears it. At the
 * cap, a new pick is ignored rather than silently dropping an earlier one —
 * the applicant decides what to give up.
 */
export function toggleMulti(current: readonly string[], option: string, max?: number): string[] {
  if (current.includes(option)) return current.filter(v => v !== option)
  if (EXCLUSIVE_OPTIONS.includes(option)) return [option]
  const rest = current.filter(v => !EXCLUSIVE_OPTIONS.includes(v))
  if (max !== undefined && rest.length >= max) return rest
  return [...rest, option]
}
