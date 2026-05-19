'use client'
import { useState, useRef, useCallback } from 'react'

export type VoiceState = 'idle' | 'recording' | 'processing'

export function useVoice(fieldContext: string, onResult: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const finalTranscript = useRef('')

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Voice input needs Chrome, Edge, or Safari. Try one of those.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    finalTranscript.current = ''
    recognitionRef.current = recognition

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let final = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
      }
      finalTranscript.current = final
    }

    recognition.onend = async () => {
      const raw = finalTranscript.current.trim()
      if (!raw) { setState('idle'); return }

      setState('processing')
      try {
        const res = await fetch('/api/voice-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw, fieldContext }),
        })
        const data = await res.json()
        onResult(data.cleaned || raw)
      } catch {
        onResult(raw)
      } finally {
        setState('idle')
      }
    }

    recognition.onerror = () => {
      setState('idle')
    }

    recognition.start()
    setState('recording')
  }, [fieldContext, onResult])

  return { state, start, stop }
}
