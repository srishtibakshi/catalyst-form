'use client'
import { useState, useRef, useCallback } from 'react'

export type VoiceState = 'idle' | 'recording' | 'processing'

function mimeToExt(mimeType: string): string {
  if (mimeType.includes('mp4'))  return 'mp4'
  if (mimeType.includes('ogg'))  return 'ogg'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav'))  return 'wav'
  return 'webm'
}

export function useVoice(fieldContext: string, onResult: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const chunksRef  = useRef<Blob[]>([])

  const stop = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size === 0) { setState('idle'); return }

        setState('processing')
        try {
          const ext = mimeToExt(mimeType)
          const formData = new FormData()
          formData.append('audio', blob, `recording.${ext}`)
          formData.append('fieldContext', fieldContext)

          const res = await fetch('/api/voice-cleanup', { method: 'POST', body: formData })
          const data = await res.json()
          onResult(data.cleaned || '')
        } catch {
          // silent fail — user can try again
        } finally {
          setState('idle')
        }
      }

      recorder.start()
      setState('recording')
    } catch {
      alert('Microphone access denied. Please allow it in your browser settings and try again.')
      setState('idle')
    }
  }, [fieldContext, onResult])

  return { state, start, stop }
}
