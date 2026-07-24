'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { VoiceButton } from '@/components/VoiceButton'

gsap.registerPlugin(useGSAP)

// ── Philanthropel mnemonic (8 interlocking marks) ────────
const MNEMONIC_PATHS = [
  'M625.2,577.7c-2.12-6.25-7.24-11.39-13.44-13.1-5.47-1.51-9.8-4.74-11.68-9.7-2.11-5.57-1.07-11.46,2.69-15.96,6.15-7.37,17.67-7.41,23.9-.14,3.68,4.3,4.9,10.1,2.88,15.34-1.61,4.19-1.66,8.47-.25,12.74,1.27,3.84,3.35,7.18,6.47,9.71,4.71,3.8,10.73,4.26,15.95,1.17,3.93-2.33,6.66-5.83,8.44-10.11,2.24-5.38,2.13-11.32-.09-16.78-1.59-3.91-2.47-8.03-1.71-12.24,2.71-15.16-3.64-29.02-17.5-35.73-3.74.47-7.11-1.04-9.49-3.8-4.15-4.84-12.45-5.98-18.58-4.19-5.27,1.54-10.37,4.29-14,8.48-3.75,4.34-7.71,8.02-13.23,10-9.41,3.38-20,1.13-27.24-5.8l-2.12-2.32c-6.29-7.86-7.52-18.56-2.96-27.89,4.05-8.29,12.6-14.04,22.42-14.53,9.36-.47,18.22,4.26,23.32,12.18,6.55,10.16,19.32,16.64,30.56,11.69l4.58-2.93c3.59-2.29,7.98-1.7,11.31.69,3.41,2.45,4.6,6.36,4.25,10.69-.22,2.75,1.26,5.58,2.58,7.93,5.19,9.3,15.04,16.62,25.91,16.3,12.07-.35,20.79,5.88,23.5,17.68,1.58,6.85-.26,13.97-4.99,19.06-3.34,3.6-7.14,6.07-11.92,7.25-14.3,3.55-22.29,18.63-16.67,31.92,3.85,9.11,2.7,19.28-3.87,26.92-7.2,8.38-19.4,10.9-29.42,5.98-7.77-3.82-12.88-11.58-13.67-20.11-.46-4.94.73-9.15,2.84-13.45,2.55-5.16,3.14-11.2,1.19-16.94Z',
  'M424.58,582.71c3.63-6.28,4.27-12.87,3.81-19.88-.67-10.23,5.78-19.72,14.53-23.97,9.6-4.66,20.93-3.02,28.72,4.1,5.22,4.77,8.15,11.39,8.5,18.39.41,8.23-3.36,15.88-9.26,20.88-6.59,5.58-14.97,7.32-23.28,5.37-4.81-1.12-9.43-1.28-14.15.01-5.48,1.49-10.1,4.58-13.4,9.2-1.33,1.85-2.56,3.88-2.73,6.24-.43,6.18-5.56,10.98-11.82,10.42-3.33-.52-6.01-2.3-8.06-5.05-5.2-2.96-10.95-4.78-17.15-4.58-7.16.23-14.56,2.72-19.64,7.98-5.29,5.48-11.93,8.73-19.81,7.79-6.89-.82-13.57-5.05-16.98-11.63-3.57-6.91-3.38-15.12.69-21.85,3.19-5.27,4.6-11.26,3.24-17.42-1.8-8.14-7.53-14.67-15.24-17.71-4.08-1.61-7.26-4.05-9.97-7.38-9.53-11.71-6.54-29.27,6.61-36.84,9.72-5.59,22.19-3.84,29.84,4.33,2.45,2.61,4.02,5.41,5.3,8.68,1.84,4.74,4.88,8.81,8.91,11.88,7.03,5.35,15.87,5.08,23.52.74,6.87-3.9,15.55-1.87,20.07,4.64,3.79,5.46,3.95,12.7.19,18.26-3.21,4.74-8.74,7.17-14.47,6.7-5.33-.43-10.3-3.86-12.83-8.91-3.06-6.08-8.77-10.41-15.52-11.62-5.11-.92-10.24.67-13.75,4.41-4.87,5.19-4.34,14.69-.56,20.88,3.01,4.94,7.52,8.39,12.74,10.73,3.77,1.69,6.56,4.55,8.9,7.87,8.22,11.67,23.08,16.85,36.64,11.59,2.43-3.03,5.98-4.61,9.84-4.2,1.72.48,3.37.28,5.05-.31,4.93-1.71,8.85-5.15,11.51-9.74Z',
  'M639.16,415.61c-1.76-2.72-3.57-4.9-5.9-7.03-7.88-7.17-19-9.64-29.19-6.49-1.19.37-2.15.83-2.95,1.77-1.83,2.16-4.54,3.22-7.46,3.03-3.01-.19-5.75.21-8.4,1.63-9.62,5.14-14.11,15.71-13.14,26.45.84,9.35-2.6,17.24-9.87,23.32-6.37,5.32-15.06,7.14-23.46,4.72-7.15-2.06-13.39-7.42-16.69-14.86-4.36-9.83-1.86-21.33,5.86-28.9,5.05-4.95,11.55-7.69,18.69-7.4l5.21.58c3.64.85,7.21,1.21,10.96.85,6.68-.64,12.84-3.79,17.07-8.91,2.38-2.88,3.22-6.07,3.89-9.63.84-4.5,5.08-7.85,9.55-8.27,3.08-.29,5.93,1.02,7.93,3.15,1.45,1.53,2.97,2.42,4.83,3.33,7.32,3.58,15.33,4.13,23.1,1.6,4.16-1.36,7.79-3.37,10.78-6.61,3.42-3.7,7.62-6.06,12.68-7.05,8.46-1.65,17.25,1.86,22.22,8.96,3.12,4.45,4.41,9.81,3.91,15.19-.38,4.13-1.98,7.6-3.89,11.15-2.38,4.42-3.08,9.49-2.58,14.44.85,8.51,7.48,15.5,15.27,18.65,5.02,2.03,9.32,5.49,12.02,10.16,6.6,11.39,3.32,25.67-7.65,32.97-6.8,4.53-15.54,5.28-23.19,1.93-5.98-2.61-11.02-7.63-13.31-13.74-2.13-5.69-5.27-10.51-10.54-13.58-5.88-3.42-12.77-3.75-18.9-.63-2.26,1.15-4.31,2.41-6.91,2.91-9.18,1.75-18.15-5.01-18.71-14.44-.26-4.39,1.3-8.74,4.24-11.92,3.7-4.01,8.97-5.39,14.39-4.48,4.88.83,9,4.13,11.49,8.85,3.66,6.96,10.78,11.39,18.73,11.31,7.59-.07,13.38-5.95,13.84-13.35.46-7.36-2.6-12.49-7.5-17.59-2.17-2.26-4.65-3.76-7.57-4.9-3.64-1.42-6.66-3.83-8.84-7.2Z',
  'M403.73,623.23c3.87,1.74,7.4,3.04,11.62,2.99,9.83-.12,17.54-6.61,20.52-15.87.99-3.08,2.42-5.78,4.91-7.84,7.4-6.14,18.57-4.6,23.62,3.59,3.76,6.09,3.16,13.68-1.41,18.97-4.54,5.26-11.92,6.84-18.48,4.15-6.43-2.64-13.44-.88-18.71,3.43-4.44,3.63-6.77,9.12-5.26,14.78.99,3.69,3.39,6.62,6.32,8.97,6.49,5.21,14.85,6.22,22.53,3.01,9.6-4.01,13.97-.56,19.83-.75,11.04-.35,21.05-6.42,26.63-15.86.91-1.53,1.23-3,1.36-4.74.2-2.66,1.55-5.11,3.57-6.86,1.94-1.68,3.32-3.53,4.16-6.01,1.67-4.93,1.43-10.05-.31-14.99-1.99-5.65-5.69-9.96-10.16-13.9-7.43-6.56-10.62-16.5-8.07-26.3,2.3-8.84,9.41-16.03,18.66-18.5,13.22-3.53,26.69,3.82,31.14,16.79,3.73,10.89-.13,23.01-9.59,29.68l-5.8,4.34c-8.08,7.01-11.79,17.86-6.89,27.85l2.65,4.04c1.73,3.31,1.58,7.15-.44,10.36-1.78,2.83-4.98,5.07-8.7,4.91-2.61-.11-4.93-.02-7.4.96-7.74,3.05-13.89,8.98-17.26,16.56-1.75,3.93-2.16,7.7-2.13,11.93.08,11.74-8.76,21.57-20.46,22.48-6.89.54-13.6-2.28-18.22-7.37-2.61-2.87-4.3-6.29-5.29-10.04-2.19-8.29-8.21-14.96-16.52-17.37-5.76-1.67-11.56-.75-16.97,1.52-6.69,2.81-13.67,2.45-20.07-.65-10.21-4.94-15.61-15.91-13.22-27.06,3.22-14.99,19.68-23.59,33.87-17.22Z',
  'M532.76,623.93c-4.15-7.25-1.97-15.95,4.66-20.62,5.89-4.15,13.49-3.86,19.05.84,3.92,3.31,6,8.33,5.44,13.57-.5,4.67-3.31,9.66-7.94,11.98-7.29,3.65-12.51,10.46-12.39,18.82.1,6.61,4.03,11.97,10.43,13.64,11.07,2.89,21.31-4.73,25.91-14.87,1.5-3.3,3.55-6.13,6.62-8.15,12.36-8.16,18.36-24.01,12.89-37.98-3.18-2.67-4.62-6.47-3.69-10.54-.9-5.15-3.75-9.61-7.82-12.79-6.14-4.68-13.52-6.5-21.22-5.74-8.19.8-16.2-2.33-21.61-8.47-6.13-6.96-8.03-16.5-5.3-25.39,2.92-9.55,11.29-16.25,21.11-17.63,8.14-1.15,15.82,1.33,21.71,6.98,6.47,6.21,9.42,15.27,7.38,24.15-1.66,7.22-1.07,14.69,2.46,21.22,2.81,4.57,6.74,8.08,11.88,9.63,4.7-.32,8.83,2.42,10.58,6.4,1.65,4.42.55,9.31-3.16,12.28-6.23,8.37-7.33,19.26-3.56,28.91,1.66,4.26,4,7.58,7.28,10.7,3.54,3.37,5.52,7.78,6.28,12.59,1.24,7.84-1.96,15.43-7.98,20.4-7.61,6.29-17.92,6.78-26.16,1.64-12.79-7.97-29.13-2.42-34.62,11.48-3.62,9.16-12.19,15.16-21.81,15.53-9.82.38-19.05-5.04-23.15-14-6.23-13.62.8-29.11,14.89-33.76,5.19-1.71,9.42-5.71,12.04-10.4,3.64-6.52,3.51-13.95-.2-20.43Z',
  'M515.43,345.53c-5.58,3.59-9.89,8.51-12.09,14.67.29,3.06-.78,5.71-2.92,7.82-10.78,8.74-6.28,26.35,3.94,34.63,8.79,7.12,12.6,18.41,8.87,29.36-3.44,10.1-12.92,17.49-24.12,17.68-11.03.18-21.08-6.63-24.91-17.01-2.24-6.07-2.01-12.5.19-18.52,1.96-5.36,5.61-9.69,10.42-12.73,6.07-3.83,10.84-9.36,12.87-16.33,1.69-5.8,1.35-12.41-2.38-17.28-3.29-4.31-3.62-9.73.29-13.87,1.85-1.96,4.15-3.26,7.06-3.36l4.16-.14c7.24-1.84,13.05-6.44,17.47-12.29,4.04-5.35,5.45-11.24,5.51-17.8.1-10.42,7.38-18.86,17.35-21.04,12.51-2.73,24.37,5.16,26.75,17.67,2.83,8.6,9.55,15.02,18.43,16.91,4.72.86,9.34.27,13.71-1.76,11.44-5.34,25.22-1.11,31.35,10.03,3.97,7.2,4.35,15.54.38,23.32-3.17,6.19-9.45,11.19-17.07,12.68-5.43,1.06-10.68.25-15.71-2.2-6.53-3.17-14.17-3.33-20.52.33-5.12,2.95-8.32,7.93-9.92,13.51-2.3,8.07-10.15,12.68-18.3,11.04-7.73-1.56-13.4-9.09-12.26-17.24.61-4.4,2.88-8.39,6.46-10.85,4.75-3.26,10.39-3.71,15.64-1.64,8.04,3.18,19.29-2.04,22.87-10.55,2.38-5.65.32-11.78-4-15.82-6.4-5.99-15.37-7.49-23.56-4.23-4.73,1.89-9.79,2.25-14.84,1.21-7.39-1.53-14.62-.38-21.13,3.8Z',
  'M412.04,420.66c6.25,5.8,14.31,8.11,22.68,7.48,5.32-.4,10.49.33,15.07,2.91,5.7,3.21,9.92,7.87,12.13,14,3.25,8.99,1.48,18.9-4.7,26.07s-15.54,10.31-24.93,8.44c-13.65-2.72-22.99-16.01-20.62-29.84.7-4.06,1.58-7.74,1.09-11.96-.66-5.65-2.7-10.94-6.64-15.09-2.3-2.43-5.04-4.58-8.32-5.25l-5.06-1.03c-3.12-1.07-5.49-3.47-6.42-6.07-1.3-3.63-.53-6.96,1.51-9.83l2.78-3.04c2.16-2.37,2.98-5.52,3.77-8.67,1.79-7.11,1.35-14.52-1.84-21.14-1.44-2.99-3.44-5.49-5.77-7.81-8.83-8.78-9.07-22.74-.2-31.67,6.82-6.87,17.89-8.75,26.46-3.89,3.19,1.81,5.96,3.34,9.6,4.07,8.12,1.62,16.19-.97,21.75-7.14,2.56-2.84,4.08-5.99,5.57-9.49,4.53-10.62,16.03-16.09,27.21-13.68,12.97,2.79,21.15,15.31,18.69,28.34-.58,3.06-1.65,5.64-3.31,8.25-3.22,5.07-7.72,8.59-13.4,10.65-12.85,4.66-18.95,19.67-12.35,30.64,3.48,5.78,3.08,13.11-1.16,18.36-4.54,5.63-12.03,7.44-18.62,4.55-6.28-2.75-10.23-9.53-9.09-16.61.96-6.01,5.08-10.25,10.41-12.82,3.39-1.63,5.68-4.85,7.54-8.03,2.45-4.2,3.24-8.97,2.05-13.68-1.18-4.66-4.56-8.16-9.16-9.68-10.66-3.53-21.86,3.94-26.14,14.14-1.3,3.09-3.34,5.58-5.94,7.66l-6.77,5.41c-8.85,8.31-12.6,21.67-7.35,32.91,1.8,1.71,3.27,3.58,3.86,6,.44,1.46-.02,2.93,0,4.43.06,4.67,2.12,8.85,5.62,12.1Z',
  'M371.95,503.45c10.01,5.39,21.78,1.13,29.6-6.77l5.2-5.25c7.01-5.66,16.52-7.32,24.96-4.41,14.45,4.99,21.49,21.04,15.39,34.94-3.95,9.01-12.27,14.94-21.89,15.76-9.91.84-19.32-4.12-24.51-12.63-3.18-5.21-7.78-9.12-13.28-11.61-4.86-2.19-10.15-2.46-15.2-1.02-1.92.55-3.33,1.54-4.84,2.75-3.41,2.76-8.11,2.98-11.92.93-3.81-2.05-5.53-6.15-5.43-10.67.08-3.65-1.66-7.09-3.6-10.09-5.48-8.52-14.27-14.97-24.64-14.74l-5.61-.2c-6.46-1-12.1-5.17-15.12-10.15-3.84-6.32-4.4-13.53-1.76-19.89,1.76-4.24,4.49-7.65,8.25-10.05,2.63-1.68,5.34-2.64,8.34-3.58,7.91-2.48,14.3-8.43,16.81-16.42,1.83-5.84.95-11.74-1.33-17.3-3.02-7.36-2.17-15.51,2.14-22.19,6.65-10.32,20.18-13.99,31.2-8.57,12.47,6.14,16.92,21.07,10.5,33.46-3.24,6.26-3.11,13.67.18,19.78,3.03,5.64,8.46,8.77,14.52,10.2,5.53,1.31,9.22,6.11,10.46,11.45,2,8.65-3.21,17.1-11.9,19.08-5.76,1.31-11.63-1-15.17-5.21-4.02-4.77-4.63-10.62-2.7-16.42,1.86-5.62.19-11.71-2.87-16.56-4.56-7.23-12.54-10.6-19.93-5.95-9.18,5.77-11.71,17.35-7.71,27.45l1.56,5.92c.5,1.9.35,3.88-.1,5.83-2.12,9.04-.21,18.35,5.17,25.93,2.97,4.21,6.94,7.37,11.6,9.55,4.09-.59,7.92.81,10.41,4.03.91,1.08,1.94,1.94,3.19,2.61Z',
]

function Mnemonic({ animate = false }: { animate?: boolean }) {
  return (
    <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {MNEMONIC_PATHS.map((d, i) => (
        <path key={i} className={animate ? 'mnemo-path' : undefined} d={d} />
      ))}
    </svg>
  )
}

// ── Types ────────────────────────────────────────────────
interface FormData {
  respondent_name: string
  respondent_email: string
  q1_intro: string
  q2_world: string
  q3_tuesday: string
  q4_ai_reaction: string
  q5_ai_experience: string
  q6_confidence: number | null
  q7_energy: string[]
  q8_dread: string
  q9_two_hours: string
  q10_outcomes: string[]
  q11_worries: string
  q12_wildcard: string
}

const EMPTY: FormData = {
  respondent_name: '', respondent_email: '',
  q1_intro: '', q2_world: '', q3_tuesday: '',
  q4_ai_reaction: '', q5_ai_experience: '',
  q6_confidence: null,
  q7_energy: [], q8_dread: '', q9_two_hours: '',
  q10_outcomes: [], q11_worries: '', q12_wildcard: '',
}

const TOTAL = 13

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function firstName(name: string) {
  return name.trim().split(' ')[0] || name.trim()
}

type SlideState = 'active' | 'entering-from-right' | 'exiting-to-left' | 'exiting-to-right'

export default function IntakeForm() {
  const [intro, setIntro]             = useState(true)
  const [slide, setSlide]             = useState(0)
  const [slideState, setSlideState]   = useState<SlideState>('active')
  const [form, setForm]               = useState<FormData>(EMPTY)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setError]       = useState('')
  const [done, setDone]               = useState(false)
  const [cohort, setCohort]           = useState('')
  const sliding                       = useRef(false)
  const slideRef                      = useRef<HTMLDivElement>(null)
  const introRef                      = useRef<HTMLDivElement>(null)
  const introTl                       = useRef<gsap.core.Timeline | null>(null)

  const progress = done ? 100 : slide === 0 ? 0 : Math.round((slide / 12) * 100)
  const stepLabel = done ? 'Done' : slide === 0 ? '' : `${slide} of 12`

  // Brand intro: mnemonic reveals, wordmark rises, overlay resolves into the form.
  useGSAP(() => {
    if (!introRef.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      gsap.to(introRef.current, { opacity: 0, duration: 0.4, delay: 0.5, onComplete: () => setIntro(false) })
      return
    }
    const tl = gsap.timeline()
    tl.from('.intro-mark .mnemo-path', {
      scale: 0.1, opacity: 0, transformOrigin: 'center',
      stagger: { each: 0.06, from: 'center' }, duration: 0.7, ease: 'power3.out',
    })
      .to('.intro-mark', { rotation: 10, duration: 1.4, ease: 'sine.inOut' }, 0.2)
      .from('.intro-word', { y: 18, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=1.0')
      .to(introRef.current, {
        opacity: 0, scale: 1.05, duration: 0.7, ease: 'power2.inOut',
        onComplete: () => setIntro(false),
      }, '+=0.5')
    introTl.current = tl
  }, { scope: introRef, dependencies: [] })

  const skipIntro = () => { introTl.current?.kill(); setIntro(false) }

  const goTo = useCallback((next: number, direction: 'forward' | 'back') => {
    if (sliding.current) return
    sliding.current = true
    setSlideState(direction === 'forward' ? 'exiting-to-left' : 'exiting-to-right')
    setTimeout(() => {
      setSlide(next)
      setSlideState('entering-from-right')
      // Release on a timer, not rAF, so a throttled/backgrounded tab can't lock navigation.
      setTimeout(() => {
        setSlideState('active')
        sliding.current = false
      }, 40)
    }, 200)
  }, [])

  const next = useCallback(() => { if (slide < TOTAL) goTo(slide + 1, 'forward') }, [slide, goTo])
  const back = useCallback(() => { if (slide > 0) goTo(slide - 1, 'back') }, [slide, goTo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (!intro && slide < TOTAL && !done) next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slide, done, intro, next])

  const set = (key: keyof FormData) =>
    (val: string | number | string[] | null) =>
      setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed.')
      setCohort(data.cohort || '')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const Choice = ({ k, text, field, multi = false }: {
    k: string; text: string
    field: 'q2_world'|'q4_ai_reaction'|'q5_ai_experience'|'q7_energy'|'q10_outcomes'
    multi?: boolean
  }) => {
    const val = form[field]
    const selected = Array.isArray(val) ? val.includes(text) : val === text
    return (
      <div
        className={`choice${selected ? ' selected' : ''}`}
        onClick={() => {
          if (multi && Array.isArray(val)) set(field)(toggle(val, text))
          else set(field)(text)
        }}
      >
        <div className="choice-key">{k}</div>
        <div className="choice-text">{text}</div>
      </div>
    )
  }

  const FootActions = ({ isSubmit = false }: { isSubmit?: boolean }) => (
    <div className="card-foot">
      {submitError && <p className="error-text">{submitError}</p>}
      {slide > 0 && (
        <button className="btn btn-back" onClick={back} aria-label="Back">←</button>
      )}
      {isSubmit ? (
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : `Submit, ${firstName(form.respondent_name)} →`}
        </button>
      ) : (
        <button className="btn btn-primary" onClick={next}>
          {slide === 0 ? "Let's start →" : 'Next →'}
        </button>
      )}
    </div>
  )

  const BackgroundLayers = () => (
    <>
      <div className="orb orb-teal" aria-hidden="true" />
      <div className="orb orb-amber" aria-hidden="true" />
      <div className="orb orb-deep" aria-hidden="true" />
      <div className="bg-mnemonic" aria-hidden="true"><Mnemonic /></div>
    </>
  )

  // ── THANK YOU ────────────────────────────────────────
  if (done) {
    const name = firstName(form.respondent_name)
    return (
      <>
        <BackgroundLayers />
        <div className="progress"><div className="progress-fill" style={{ width: '100%' }} /></div>
        <div className="logo-strip">
          <div className="logo">
            <span className="logo-mark"><Mnemonic /></span>
            <span className="logo-word">Philanthropel <span>Catalyst AI</span></span>
          </div>
          <span className="step-label">Done</span>
        </div>
        <div className="slide-container">
          <div className="slide active" ref={slideRef}>
            <div className="card-body ty-body reveal">
              <div className="ty-mark">✓</div>
              <h1 className="headline-xl">
                {name ? `Okay, ${name}.\n` : ''}We&apos;ve got<br /><em>everything.</em>
              </h1>
              {cohort && <div className="ty-cohort">Session profile: {cohort}</div>}
              <p className="body">
                I&apos;ve read every word. Our session will be built around your answers,
                not a template, not a script. Just a conversation designed for you.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--sage)' }}>
                You&apos;ll hear from me shortly with next steps.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── FORM ─────────────────────────────────────────────
  return (
    <>
      <BackgroundLayers />

      {intro && (
        <div className="intro" ref={introRef} onClick={skipIntro}>
          <div className="intro-inner">
            <div className="intro-mark"><Mnemonic animate /></div>
            <div className="intro-word">Philanthropel<span>Catalyst AI</span></div>
          </div>
          <div className="intro-skip">Tap to continue</div>
        </div>
      )}

      <div className="progress">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="logo-strip">
        <div className="logo">
          <span className="logo-mark"><Mnemonic /></span>
          <span className="logo-word">Philanthropel <span>Catalyst AI</span></span>
        </div>
        <span className="step-label">{stepLabel}</span>
      </div>

      <div className="slide-container">
        <div className={`slide ${slideState}`} ref={slideRef}>
          <div className={`card-body${intro ? '' : ' reveal'}`}>

            {slide === 0 && <>
              <div className="eyebrow">Catalyst AI · Intake</div>
              <h1 className="headline-xl">
                Let&apos;s get to<br />know each other<br /><em>properly.</em>
              </h1>
              <p className="body">
                This isn&apos;t a test. There are no right answers. I just want to understand
                your world so I can make our time together actually useful to you.
              </p>
              <div className="meta-row">
                {['3–5 minutes', '12 questions', 'No wrong answers'].map(m => (
                  <div key={m} className="meta-pill"><div className="meta-dot" />{m}</div>
                ))}
              </div>
            </>}

            {slide === 1 && <>
              <div className="section-label">
                <div className="section-line" /><div className="section-text">About you</div>
              </div>
              <div className="q-number">Question 1 of 12</div>
              <h2 className="headline">First things first, who are you?</h2>
              <p className="subtext">Your name and email so I know who I&apos;m hearing from.</p>
              <div className="input-wrap">
                <label className="input-label">Your name</label>
                <input className="q-input" type="text" placeholder="Full name"
                  value={form.respondent_name}
                  onChange={e => set('respondent_name')(e.target.value)}
                  autoComplete="name" />
              </div>
              <div className="input-wrap">
                <label className="input-label">Email address</label>
                <input className="q-input" type="email" placeholder="you@example.com"
                  value={form.respondent_email}
                  onChange={e => set('respondent_email')(e.target.value)}
                  autoComplete="email" inputMode="email" />
              </div>
            </>}

            {slide === 2 && <>
              <div className="q-number">Question 2 of 12</div>
              <h2 className="headline">What do you do?</h2>
              <p className="subtext">Tell me what you&apos;d say at a dinner party, not on your LinkedIn.</p>
              <input className="q-input" type="text" placeholder="Type your answer…"
                value={form.q1_intro} onChange={e => set('q1_intro')(e.target.value)} />
              <VoiceButton
                fieldContext="What do you do? (dinner party version, not LinkedIn)"
                hint="Rather just say it out loud? Hit the mic."
                onResult={text => set('q1_intro')(text)}
              />
            </>}

            {slide === 3 && <>
              <div className="q-number">Question 3 of 12</div>
              <h2 className="headline">Which of these best describes your world right now?</h2>
              <p className="subtext">Pick the one that feels most true.</p>
              <div className="choices">
                {[
                  ['A', 'I lead a team or organisation — a lot rides on my decisions'],
                  ['B', "I'm a specialist or professional — my expertise is my currency"],
                  ['C', "I'm building something — a business, a project, a new chapter"],
                  ['D', "I'm in a transition — career change, life shift, figuring things out"],
                  ['E', 'Something else entirely'],
                ].map(([k, t]) => <Choice key={k} k={k} text={t} field="q2_world" />)}
              </div>
            </>}

            {slide === 4 && <>
              <div className="q-number">Question 4 of 12</div>
              <h2 className="headline">Walk me through a typical Tuesday.</h2>
              <p className="subtext">Just a rough sketch, what does your day actually look like from morning to evening?</p>
              <textarea className="q-textarea" rows={5}
                placeholder="Morning meetings, school run, client calls, late nights… whatever it is."
                value={form.q3_tuesday} onChange={e => set('q3_tuesday')(e.target.value)} />
              <VoiceButton
                fieldContext="Walk me through a typical Tuesday, what does your day look like from morning to evening?"
                hint="Walk me through it like you're telling a friend. Just hit the mic."
                onResult={text => set('q3_tuesday')(text)}
              />
            </>}

            {slide === 5 && <>
              <div className="section-label">
                <div className="section-line" /><div className="section-text">You &amp; AI</div>
              </div>
              <div className="q-number">Question 5 of 12</div>
              <h2 className="headline">When you hear &ldquo;AI,&rdquo; what&apos;s your honest first reaction?</h2>
              <p className="subtext">No judgment. The full spectrum is useful to me.</p>
              <div className="choices">
                {[
                  ['A', 'Excited — I want to understand it and use it'],
                  ['B', "Curious but uncertain — I don't know where to start"],
                  ['C', 'A bit overwhelmed — it feels like everything is moving too fast'],
                  ['D', "Sceptical — I've seen the hype before and it rarely delivers"],
                  ['E', 'Anxious — I worry about what it means for me or my work'],
                ].map(([k, t]) => <Choice key={k} k={k} text={t} field="q4_ai_reaction" />)}
              </div>
            </>}

            {slide === 6 && <>
              <div className="q-number">Question 6 of 12</div>
              <h2 className="headline">Have you actually tried any AI tools yet?</h2>
              <p className="subtext">ChatGPT, Siri, a smart filter, all counts.</p>
              <div className="choices">
                {[
                  ['A', "Yes — I use AI tools regularly and they're part of my routine"],
                  ['B', "A few times — I've dabbled but nothing stuck"],
                  ['C', 'Once or twice out of curiosity'],
                  ['D', "Not intentionally — though it's probably around me somewhere"],
                  ['E', 'No — not yet'],
                ].map(([k, t]) => <Choice key={k} k={k} text={t} field="q5_ai_experience" />)}
              </div>
            </>}

            {slide === 7 && <>
              <div className="q-number">Question 7 of 12</div>
              <h2 className="headline">How confident do you feel talking about AI to someone you respect?</h2>
              <p className="subtext">1 = I&apos;d bluff my way through it.&nbsp; 5 = I could hold my own anywhere.</p>
              <div className="scale-labels"><span>Would bluff</span><span>Fully confident</span></div>
              <div className="scale-options">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n}
                    className={`scale-btn${form.q6_confidence === n ? ' selected' : ''}`}
                    onClick={() => set('q6_confidence')(n)}>{n}</button>
                ))}
              </div>
            </>}

            {slide === 8 && <>
              <div className="section-label">
                <div className="section-line" /><div className="section-text">Your world</div>
              </div>
              <div className="q-number">Question 8 of 12</div>
              <h2 className="headline">Where does most of your energy go each week?</h2>
              <div className="multi-hint">Select all that apply</div>
              <div className="choices">
                {[
                  ['A', 'Managing people, meetings, decisions'],
                  ['B', 'Deep work — writing, thinking, creating, building'],
                  ['C', 'Client or customer relationships'],
                  ['D', 'Admin, email, scheduling, the mundane stuff'],
                  ['E', 'Family, caregiving, personal commitments'],
                  ['F', 'Learning, staying current, keeping up'],
                ].map(([k, t]) => <Choice key={k} k={k} text={t} field="q7_energy" multi />)}
              </div>
            </>}

            {slide === 9 && <>
              <div className="q-number">Question 9 of 12</div>
              <h2 className="headline">What part of your week do you dread most?</h2>
              <p className="subtext">The thing you keep putting off, or that drains you more than it should.</p>
              <textarea className="q-textarea" rows={4}
                placeholder="Could be a task, a type of meeting, a recurring situation…"
                value={form.q8_dread} onChange={e => set('q8_dread')(e.target.value)} />
              <VoiceButton
                fieldContext="What part of your week do you dread most? The thing you keep putting off or that drains you."
                hint="Some things are easier to say than write. Use your voice."
                onResult={text => set('q8_dread')(text)}
              />
            </>}

            {slide === 10 && <>
              <div className="q-number">Question 10 of 12</div>
              <h2 className="headline">If you could reclaim 2 hours a day, what would you actually do with them?</h2>
              <p className="subtext">Not what you should do. What you&apos;d genuinely want to do.</p>
              <textarea className="q-textarea" rows={4}
                placeholder="Sleep more, think better, spend time with people, build something…"
                value={form.q9_two_hours} onChange={e => set('q9_two_hours')(e.target.value)} />
              <VoiceButton
                fieldContext="If you could reclaim 2 hours a day, what would you genuinely want to do with them?"
                hint="Close your eyes for a second. Picture it. Then just tell me."
                onResult={text => set('q9_two_hours')(text)}
              />
            </>}

            {slide === 11 && <>
              <div className="section-label">
                <div className="section-line" /><div className="section-text">What you&apos;re after</div>
              </div>
              <div className="q-number">Question 11 of 12</div>
              <h2 className="headline">What would make our sessions together feel genuinely worthwhile?</h2>
              <div className="multi-hint">Select all that apply</div>
              <div className="choices">
                {[
                  ['A', 'I want to actually understand what AI is — demystified, plainly'],
                  ['B', 'I want to save time on things I currently do manually'],
                  ['C', 'I want to feel confident talking about AI to others'],
                  ['D', 'I want to use AI in my work or career in a meaningful way'],
                  ['E', 'I want to make better decisions — and AI might help with that'],
                  ['F', 'I want to feel less left behind — like I understand where the world is going'],
                ].map(([k, t]) => <Choice key={k} k={k} text={t} field="q10_outcomes" multi />)}
              </div>
            </>}

            {slide === 12 && <>
              <div className="q-number">Question 12 of 12</div>
              <h2 className="headline">Is there anything you&apos;re worried about when it comes to AI?</h2>
              <p className="subtext">
                About your job, your privacy, your industry. Optional, but if something&apos;s on
                your mind, I want to know.
              </p>
              <textarea className="q-textarea" rows={4}
                placeholder="Or just write 'not really' — that's valid too."
                value={form.q11_worries} onChange={e => set('q11_worries')(e.target.value)} />
              <VoiceButton
                fieldContext="Is there anything you're worried about when it comes to AI, your job, privacy, your industry?"
                hint="No judgment here. Unfiltered is fine. Just speak."
                onResult={text => set('q11_worries')(text)}
              />
            </>}

            {slide === 13 && <>
              <div className="q-number">One last thing</div>
              <h2 className="headline">
                What&apos;s one thing you want me to know about you that a form like this
                probably won&apos;t capture?
              </h2>
              <p className="subtext">Surprising, personal, professional, strange, all welcome.</p>
              <textarea className="q-textarea" rows={5}
                placeholder="Anything at all…"
                value={form.q12_wildcard} onChange={e => set('q12_wildcard')(e.target.value)} />
              <VoiceButton
                fieldContext="What's one thing you want me to know about you that a form like this probably won't capture?"
                hint="Just talk to me. Say whatever comes to mind, I'll catch every word."
                onResult={text => set('q12_wildcard')(text)}
              />
            </>}

          </div>

          <FootActions isSubmit={slide === 13} />
        </div>
      </div>
    </>
  )
}
