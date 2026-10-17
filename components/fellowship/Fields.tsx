'use client'

import { VoiceButton } from '@/components/VoiceButton'
import { toggleMulti } from '@/lib/fellowship'

const KEYS = 'ABCDEFGHIJ'

interface QuestionHeadProps {
  number?: number
  total: number
  label?: string
  section?: string
  title: string
  sub?: string
}

export function QuestionHead({ number, total, label, section, title, sub }: QuestionHeadProps) {
  return (
    <>
      {section && (
        <div className="section-label">
          <div className="section-line" /><div className="section-text">{section}</div>
        </div>
      )}
      <div className="q-number">{label ?? `Question ${number} of ${total}`}</div>
      <h2 className="headline">{title}</h2>
      {sub && <p className="subtext">{sub}</p>}
    </>
  )
}

interface SingleChoiceProps {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}

export function SingleChoice({ options, value, onChange }: SingleChoiceProps) {
  return (
    <div className="choices" role="radiogroup">
      {options.map((text, i) => {
        const selected = value === text
        return (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`choice${selected ? ' selected' : ''}`}
            onClick={() => onChange(text)}
          >
            <span className="choice-key">{KEYS[i]}</span>
            <span className="choice-text">{text}</span>
          </button>
        )
      })}
    </div>
  )
}

interface MultiChoiceProps {
  options: readonly string[]
  value: string[]
  max?: number
  onChange: (value: string[]) => void
}

export function MultiChoice({ options, value, max, onChange }: MultiChoiceProps) {
  return (
    <div className="choices" role="group">
      {options.map((text, i) => {
        const selected = value.includes(text)
        return (
          <button
            key={text}
            type="button"
            aria-pressed={selected}
            className={`choice${selected ? ' selected' : ''}`}
            onClick={() => onChange(toggleMulti(value, text, max))}
          >
            <span className="choice-key">{KEYS[i]}</span>
            <span className="choice-text">{text}</span>
          </button>
        )
      })}
    </div>
  )
}

interface ScaleInputProps {
  value: number | null
  low: string
  high: string
  onChange: (value: number) => void
}

export function ScaleInput({ value, low, high, onChange }: ScaleInputProps) {
  return (
    <>
      <div className="scale-labels"><span>{low}</span><span>{high}</span></div>
      <div className="scale-options" role="radiogroup">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className={`scale-btn${value === n ? ' selected' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </>
  )
}

interface LongAnswerProps {
  value: string
  placeholder: string
  rows?: number
  voiceContext: string
  voiceHint: string
  onChange: (value: string) => void
}

/* Speaking adds to what is already there instead of replacing it, so a typed
   draft is never wiped by trying the mic. */
export function LongAnswer({ value, placeholder, rows = 5, voiceContext, voiceHint, onChange }: LongAnswerProps) {
  return (
    <>
      <textarea
        className="q-textarea"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <VoiceButton
        fieldContext={voiceContext}
        hint={voiceHint}
        onResult={text => {
          if (!text) return
          onChange(value.trim() ? `${value.trim()} ${text}` : text)
        }}
      />
    </>
  )
}

interface ConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Consent({ checked, onChange }: ConsentProps) {
  return (
    <label className="consent">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>
        I&apos;m happy for Philanthropel to store and review my application for the
        Fellowship, as set out in the{' '}
        <a href="https://philanthropel.com/privacy#fellowship" target="_blank" rel="noopener noreferrer">
          privacy notice
        </a>.
      </span>
    </label>
  )
}
