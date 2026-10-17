import { describe, it, expect } from 'vitest'
import {
  validateApplication, coerceApplication, fieldError, toggleMulti, toSheetRow,
  firstSlideWithError, SLIDE_FIELDS, FIELD_KEYS, SHEET_HEADERS, SHEET_COLUMNS,
  FOCUS_OPTIONS, OPEN_TO_ANYTHING, NOT_YET_CONNECTED, MAX_FOCUS_AREAS, LONG_MAX,
  EMPTY_APPLICATION,
} from '@/lib/fellowship'
import { validApplication } from './fixtures'

describe('the form, the validator and the sheet stay in step', () => {
  it('asks for every field on exactly one slide', () => {
    const asked = SLIDE_FIELDS.flat()
    expect([...asked].sort()).toEqual([...FIELD_KEYS].sort())
    expect(new Set(asked).size).toBe(asked.length)
  })

  it('gives the sheet one cell per header', () => {
    const row = toSheetRow(validApplication(), { id: 'ref-1', submittedAt: '2026-10-17T10:00:00Z' })
    expect(row).toHaveLength(SHEET_HEADERS.length)
  })

  it('has no duplicate sheet headers', () => {
    expect(new Set(SHEET_HEADERS).size).toBe(SHEET_HEADERS.length)
  })
})

describe('validateApplication', () => {
  it('accepts a complete application and normalises it', () => {
    const result = validateApplication(validApplication())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('Amina Yusuf')
    expect(result.value.email).toBe('amina@example.org')
  })

  it('reports every missing required answer', () => {
    const result = validateApplication(EMPTY_APPLICATION)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual([
      'ai_comfort', 'background', 'built_something', 'consent', 'email', 'focus_areas',
      'location', 'name', 'problem_idea', 'sector_connection', 'stage', 'time_commitment', 'why_sector',
    ])
  })

  it('leaves the optional answers optional', () => {
    const result = validateApplication(validApplication({ link: '', heard_from: '', anything_else: '' }))
    expect(result.ok).toBe(true)
  })

  it('treats whitespace as no answer', () => {
    expect(fieldError('background', validApplication({ background: '   \n ' }))).not.toBeNull()
  })

  it('rejects a malformed email', () => {
    expect(fieldError('email', validApplication({ email: 'amina@' }))).toMatch(/does not look right/)
  })

  it('rejects option values the form never offered', () => {
    expect(fieldError('stage', validApplication({ stage: 'Billionaire' }))).not.toBeNull()
    expect(fieldError('time_commitment', validApplication({ time_commitment: '<script>' }))).not.toBeNull()
    expect(fieldError('heard_from', validApplication({ heard_from: 'Spam' }))).not.toBeNull()
    expect(fieldError('focus_areas', validApplication({ focus_areas: ['Crypto trading'] }))).not.toBeNull()
  })

  it('caps the focus areas', () => {
    const four = FOCUS_OPTIONS.slice(0, MAX_FOCUS_AREAS + 1) as string[]
    expect(fieldError('focus_areas', validApplication({ focus_areas: four }))).toMatch(/up to 3/)
  })

  it('refuses an exclusive option combined with another', () => {
    expect(fieldError('focus_areas', validApplication({ focus_areas: [OPEN_TO_ANYTHING, 'Grantmaking'] }))).not.toBeNull()
    expect(fieldError('sector_connection', validApplication({
      sector_connection: [NOT_YET_CONNECTED, 'I volunteer or have volunteered'],
    }))).not.toBeNull()
  })

  it('refuses the same option twice', () => {
    expect(fieldError('focus_areas', validApplication({ focus_areas: ['Grantmaking', 'Grantmaking'] }))).not.toBeNull()
  })

  it.each([0, 6, 2.5, null])('rejects an AI comfort of %s', value => {
    expect(fieldError('ai_comfort', validApplication({ ai_comfort: value }))).not.toBeNull()
  })

  it('refuses over-long answers', () => {
    expect(fieldError('background', validApplication({ background: 'x'.repeat(LONG_MAX + 1) }))).toMatch(/under/)
  })

  it('requires consent to be literally true', () => {
    expect(validateApplication({ ...validApplication(), consent: 'true' }).ok).toBe(false)
  })
})

describe('coerceApplication', () => {
  it.each([null, undefined, 'a string', 42, ['array']])('survives %s without throwing', input => {
    expect(coerceApplication(input)).toEqual({ ...EMPTY_APPLICATION })
  })

  it('drops non-string entries from lists', () => {
    const a = coerceApplication({ focus_areas: ['Grantmaking', 7, null, { x: 1 }] })
    expect(a.focus_areas).toEqual(['Grantmaking'])
  })

  it('reads a numeric string for AI comfort', () => {
    expect(coerceApplication({ ai_comfort: '4' }).ai_comfort).toBe(4)
  })
})

describe('toggleMulti', () => {
  it('adds and removes', () => {
    expect(toggleMulti([], 'Grantmaking')).toEqual(['Grantmaking'])
    expect(toggleMulti(['Grantmaking'], 'Grantmaking')).toEqual([])
  })

  it('lets an exclusive option clear the rest', () => {
    expect(toggleMulti(['Grantmaking', 'Prospect research'], OPEN_TO_ANYTHING)).toEqual([OPEN_TO_ANYTHING])
  })

  it('lets any other option clear the exclusive one', () => {
    expect(toggleMulti([OPEN_TO_ANYTHING], 'Grantmaking')).toEqual(['Grantmaking'])
  })

  it('ignores a new pick at the cap instead of dropping an earlier one', () => {
    const three = ['Donor engagement', 'Grantmaking', 'Prospect research']
    expect(toggleMulti(three, 'Scholarships and awards', 3)).toEqual(three)
  })

  it('does not mutate its input', () => {
    const current = Object.freeze(['Grantmaking'])
    expect(() => toggleMulti(current, 'Prospect research')).not.toThrow()
  })
})

describe('toSheetRow', () => {
  const meta = { id: 'ref-123', submittedAt: '2026-10-17T10:00:00.000Z' }

  it('fills each column from the application', () => {
    const row = toSheetRow(validApplication({ heard_from: 'LinkedIn' }), meta)
    const cell = (header: string) => row[SHEET_HEADERS.indexOf(header)]
    expect(cell('Submitted at')).toBe(meta.submittedAt)
    expect(cell('Status')).toBe('New')
    expect(cell('Areas of interest')).toBe('Donor engagement; Grantmaking')
    expect(cell('AI comfort (1–5)')).toBe('2')
    expect(cell('Heard about us')).toBe('LinkedIn')
    expect(cell('Consent')).toBe('Yes')
    expect(cell('Reference')).toBe('ref-123')
  })

  it('puts the review columns first', () => {
    expect(SHEET_COLUMNS.slice(0, 3).map(c => c.header)).toEqual(['Submitted at', 'Status', 'Name'])
  })
})

describe('firstSlideWithError', () => {
  it('finds the earliest slide holding an error', () => {
    expect(firstSlideWithError({ problem_idea: 'x', email: 'y' })).toBe(1)
    expect(firstSlideWithError({ consent: 'x' })).toBe(SLIDE_FIELDS.length - 1)
  })

  it('returns null when there are no errors', () => {
    expect(firstSlideWithError({})).toBeNull()
  })
})
