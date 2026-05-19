'use client'
import { useVoice, VoiceState } from '@/lib/useVoice'

interface Props {
  fieldContext: string
  hint: string
  onResult: (text: string) => void
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="voice-spinner">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

const LABELS: Record<VoiceState, string> = {
  idle: 'Speak instead',
  recording: 'Tap to stop',
  processing: 'Cleaning up…',
}

export function VoiceButton({ fieldContext, hint, onResult }: Props) {
  const { state, start, stop } = useVoice(fieldContext, onResult)

  return (
    <div className="voice-wrap">
      <p className="voice-hint">{hint}</p>
      <button
        type="button"
        className={`voice-btn voice-btn--${state}`}
        onClick={state === 'recording' ? stop : start}
        disabled={state === 'processing'}
        aria-label={state === 'recording' ? 'Stop recording' : 'Start voice input'}
      >
        <span className="voice-btn-icon">
          {state === 'idle' && <MicIcon />}
          {state === 'recording' && <StopIcon />}
          {state === 'processing' && <SpinnerIcon />}
        </span>
        <span className="voice-btn-label">{LABELS[state]}</span>
        {state === 'recording' && <span className="voice-pulse" aria-hidden />}
      </button>
    </div>
  )
}
