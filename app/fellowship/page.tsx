'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Mnemonic } from '@/components/Mnemonic'
import {
  QuestionHead, SingleChoice, MultiChoice, ScaleInput, LongAnswer, Consent,
} from '@/components/fellowship/Fields'
import {
  EMPTY_APPLICATION, SLIDE_FIELDS, LAST_SLIDE, QUESTION_COUNT, MAX_FOCUS_AREAS,
  STAGE_OPTIONS, CONNECTION_OPTIONS, FOCUS_OPTIONS, TIME_OPTIONS, HEARD_OPTIONS,
  errorsFor, firstSlideWithError,
  type FellowshipApplication, type FieldErrors,
} from '@/lib/fellowship'

gsap.registerPlugin(useGSAP)

type SlideState = 'active' | 'entering-from-right' | 'exiting-to-left' | 'exiting-to-right'

function firstName(name: string) {
  return name.trim().split(' ')[0] || name.trim()
}

function BackgroundLayers() {
  return (
    <>
      <div className="orb orb-teal" aria-hidden="true" />
      <div className="orb orb-amber" aria-hidden="true" />
      <div className="orb orb-deep" aria-hidden="true" />
      <div className="bg-mnemonic" aria-hidden="true"><Mnemonic /></div>
    </>
  )
}

function LogoStrip({ step }: { step: string }) {
  return (
    <div className="logo-strip">
      <div className="logo">
        <span className="logo-mark"><Mnemonic /></span>
        <span className="logo-word">Philanthropel <span>Fellowship</span></span>
      </div>
      <span className="step-label">{step}</span>
    </div>
  )
}

export default function FellowshipApplicationForm() {
  const [intro, setIntro]           = useState(true)
  const [slide, setSlide]           = useState(0)
  const [slideState, setSlideState] = useState<SlideState>('active')
  const [form, setForm]             = useState<FellowshipApplication>(EMPTY_APPLICATION)
  const [stepError, setStepError]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)
  const [honeypot, setHoneypot]     = useState('')
  const sliding                     = useRef(false)
  const introRef                    = useRef<HTMLDivElement>(null)
  const introTl                     = useRef<gsap.core.Timeline | null>(null)

  const progress  = done ? 100 : Math.round((slide / LAST_SLIDE) * 100)
  const stepLabel = done ? 'Done' : slide === 0 ? '' : slide === LAST_SLIDE ? 'Last one' : `${slide} of ${QUESTION_COUNT}`

  // Same brand intro as the Catalyst intake.
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

  const goTo = useCallback((target: number, direction: 'forward' | 'back') => {
    if (sliding.current) return
    sliding.current = true
    setStepError('')
    setSlideState(direction === 'forward' ? 'exiting-to-left' : 'exiting-to-right')
    setTimeout(() => {
      setSlide(target)
      setSlideState('entering-from-right')
      // Released on a timer, not rAF, so a backgrounded tab can't lock navigation.
      setTimeout(() => {
        setSlideState('active')
        sliding.current = false
      }, 40)
    }, 200)
  }, [])

  /* A slide only lets you past once its required answers are in. The first
     problem is shown; fixing it and pressing Next shows the next, if any. */
  const currentErrors = useCallback(
    (): FieldErrors => errorsFor(SLIDE_FIELDS[slide], form),
    [slide, form],
  )

  const next = useCallback(() => {
    if (slide >= LAST_SLIDE) return
    const errs = Object.values(currentErrors())
    if (errs.length > 0) { setStepError(errs[0] ?? ''); return }
    goTo(slide + 1, 'forward')
  }, [slide, currentErrors, goTo])

  const back = useCallback(() => { if (slide > 0) goTo(slide - 1, 'back') }, [slide, goTo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return
      if (!intro && slide < LAST_SLIDE && !done) next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slide, done, intro, next])

  /* Editing an answer clears the warning about it — leaving "required" on
     screen while the person is typing the answer reads as a scolding. */
  const set = <K extends keyof FellowshipApplication>(key: K) =>
    (value: FellowshipApplication[K]) => {
      setForm(f => ({ ...f, [key]: value }))
      setStepError('')
    }

  const handleSubmit = async () => {
    const errs = Object.values(currentErrors())
    if (errs.length > 0) { setStepError(errs[0] ?? ''); return }

    setSubmitting(true)
    setStepError('')
    try {
      const res = await fetch('/api/fellowship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_website: honeypot }),
      })
      const data: { error?: string; fields?: FieldErrors } = await res.json()
      if (!res.ok) {
        // The server disagrees with an earlier answer: take them back to it.
        const target = data.fields ? firstSlideWithError(data.fields) : null
        if (target !== null && target !== slide) {
          goTo(target, 'back')
          setTimeout(() => setStepError(Object.values(data.fields ?? {})[0] ?? ''), 260)
          return
        }
        throw new Error(data.error || 'Submission failed.')
      }
      setDone(true)
    } catch (err: unknown) {
      setStepError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── THANK YOU ────────────────────────────────────────
  if (done) {
    const name = firstName(form.name)
    return (
      <>
        <BackgroundLayers />
        <div className="progress"><div className="progress-fill" style={{ width: '100%' }} /></div>
        <LogoStrip step="Done" />
        <div className="slide-container">
          <div className="slide active">
            <div className="card-body ty-body reveal">
              <div className="ty-mark">✓</div>
              <h1 className="headline-xl">
                {name ? `Thank you, ${name}.\n` : ''}Your application<br />is <em>in.</em>
              </h1>
              <p className="body">
                We read every application ourselves. Once we&apos;ve reviewed yours,
                we&apos;ll come back to you, whatever the outcome.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--sage)' }}>
                Anything to add in the meantime? Write to info@philanthropel.com.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const N = QUESTION_COUNT

  // ── FORM ─────────────────────────────────────────────
  return (
    <>
      <BackgroundLayers />

      {intro && (
        <div className="intro" ref={introRef} onClick={skipIntro}>
          <div className="intro-inner">
            <div className="intro-mark"><Mnemonic animate /></div>
            <div className="intro-word">Philanthropel<span>Fellowship</span></div>
          </div>
          <div className="intro-skip">Tap to continue</div>
        </div>
      )}

      <div className="progress">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <LogoStrip step={stepLabel} />

      <div className="slide-container">
        <div className={`slide ${slideState}`}>
          <div className={`card-body${intro ? '' : ' reveal'}`}>

            {slide === 0 && <>
              <div className="eyebrow">Philanthropel Fellowship · Application</div>
              <h1 className="headline-xl">
                Build for the<br />third sector,<br /><em>from anywhere.</em>
              </h1>
              <p className="body">
                The Fellowship is open to anyone, whatever your background. Tell us who
                you are, why this work, and how you think. There are no trick questions,
                and you can speak your answers instead of typing them.
              </p>
              <div className="meta-row">
                {['8–10 minutes', `${N} questions`, 'Speak or type'].map(m => (
                  <div key={m} className="meta-pill"><div className="meta-dot" />{m}</div>
                ))}
              </div>
            </>}

            {slide === 1 && <>
              <QuestionHead number={1} total={N} section="About you"
                title="First, who are you?"
                sub="Your name and email, so we know who we're hearing from." />
              <div className="input-wrap">
                <label className="input-label" htmlFor="f-name">Your name</label>
                <input id="f-name" className="q-input" type="text" placeholder="Full name"
                  value={form.name} onChange={e => set('name')(e.target.value)} autoComplete="name" />
              </div>
              <div className="input-wrap">
                <label className="input-label" htmlFor="f-email">Email address</label>
                <input id="f-email" className="q-input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email')(e.target.value)}
                  autoComplete="email" inputMode="email" />
              </div>
              {/* Honeypot — see the API route. Hidden from people and screen readers. */}
              <div className="hp" aria-hidden="true">
                <label htmlFor="f-company-website">Company website</label>
                <input id="f-company-website" type="text" tabIndex={-1} autoComplete="off"
                  value={honeypot} onChange={e => setHoneypot(e.target.value)} />
              </div>
            </>}

            {slide === 2 && <>
              <QuestionHead number={2} total={N}
                title="Where are you based?"
                sub="City and country is plenty. We welcome applicants from anywhere in the world." />
              <div className="input-wrap">
                <label className="input-label" htmlFor="f-location">City and country</label>
                <input id="f-location" className="q-input" type="text" placeholder="e.g. Nairobi, Kenya"
                  value={form.location} onChange={e => set('location')(e.target.value)}
                  autoComplete="address-level2" />
              </div>
              <div className="input-wrap">
                <label className="input-label" htmlFor="f-link">
                  LinkedIn, portfolio or website <span className="optional-tag">Optional</span>
                </label>
                <input id="f-link" className="q-input" type="url" placeholder="https://"
                  value={form.link} onChange={e => set('link')(e.target.value)} inputMode="url" />
              </div>
            </>}

            {slide === 3 && <>
              <QuestionHead number={3} total={N}
                title="Which best describes where you are right now?"
                sub="Pick the one that fits best. Every one of these is welcome." />
              <SingleChoice options={STAGE_OPTIONS} value={form.stage} onChange={set('stage')} />
            </>}

            {slide === 4 && <>
              <QuestionHead number={4} total={N}
                title="What's your background?"
                sub="What you've studied, worked on or cared about. Any field counts: a nurse, a teacher, a lawyer or a fundraiser is as welcome here as an engineer." />
              <LongAnswer value={form.background} onChange={set('background')}
                placeholder="Your studies, your work, the things you've given your time to…"
                voiceContext="What's your background? What you've studied, worked on or cared about."
                voiceHint="Easier to say than write? Hit the mic." />
            </>}

            {slide === 5 && <>
              <QuestionHead number={5} total={N} section="You and the third sector"
                title="Why the third sector?"
                sub="What draws you to work with non-profits, charities, foundations or causes? One specific moment or person tells us more than a general principle." />
              <LongAnswer value={form.why_sector} onChange={set('why_sector')}
                placeholder="The moment, the person, the thing you saw…"
                voiceContext="Why do you want to work in the third sector (non-profits, charities, foundations, causes)?"
                voiceHint="Tell it the way you'd tell a friend. Just speak." />
            </>}

            {slide === 6 && <>
              <QuestionHead number={6} total={N}
                title="What's your connection to the sector so far?" />
              <div className="multi-hint">Select all that apply</div>
              <MultiChoice options={CONNECTION_OPTIONS} value={form.sector_connection}
                onChange={set('sector_connection')} />
            </>}

            {slide === 7 && <>
              <QuestionHead number={7} total={N} section="The work"
                title="Which areas would you most want to work on?"
                sub="These are the areas we build bespoke agentic systems for." />
              <div className="multi-hint">
                Choose up to {MAX_FOCUS_AREAS} · {form.focus_areas.length} selected
              </div>
              <MultiChoice options={FOCUS_OPTIONS} value={form.focus_areas}
                max={MAX_FOCUS_AREAS} onChange={set('focus_areas')} />
            </>}

            {slide === 8 && <>
              <QuestionHead number={8} total={N}
                title="How comfortable are you building with AI today?"
                sub="1 = I've barely used it. 5 = I build with it regularly. We take people at every level." />
              <ScaleInput value={form.ai_comfort} onChange={set('ai_comfort')}
                low="Barely used it" high="Build with it regularly" />
            </>}

            {slide === 9 && <>
              <QuestionHead number={9} total={N}
                title="Tell us about something you've built, organised or fixed."
                sub="It doesn't have to be technical. A project, a campaign, a process at work, something in your community. What was the problem, what did you do, and what changed?" />
              <LongAnswer value={form.built_something} onChange={set('built_something')} rows={6}
                placeholder="The problem, what you did, what changed…"
                voiceContext="Tell us about something you've built, organised or fixed: the problem, what you did, what changed."
                voiceHint="Walk us through it out loud if that's easier." />
            </>}

            {slide === 10 && <>
              <QuestionHead number={10} total={N}
                title="Pick a problem you've seen an organisation struggle with."
                sub="How might an AI system help with it, and where should a person stay in charge? There's no right answer. We're interested in how you think." />
              <LongAnswer value={form.problem_idea} onChange={set('problem_idea')} rows={6}
                placeholder="The problem, how AI could help, and where people stay in charge…"
                voiceContext="Pick a problem an organisation struggled with. How might an AI system help, and where should a person stay in charge?"
                voiceHint="Think out loud. We'll catch every word." />
            </>}

            {slide === 11 && <>
              <QuestionHead number={11} total={N} section="Practicalities"
                title="Roughly how much time could you give each week?" />
              <SingleChoice options={TIME_OPTIONS} value={form.time_commitment}
                onChange={set('time_commitment')} />
            </>}

            {slide === 12 && <>
              <QuestionHead number={12} total={N}
                title="How did you hear about the Fellowship?"
                sub="Optional, but it helps us reach more people like you." />
              <SingleChoice options={HEARD_OPTIONS} value={form.heard_from} onChange={set('heard_from')} />
            </>}

            {slide === LAST_SLIDE && <>
              <QuestionHead total={N} label="One last thing"
                title="Is there anything else we should know?"
                sub="Including anything that would make the Fellowship more accessible to you. Optional." />
              <LongAnswer value={form.anything_else} onChange={set('anything_else')} rows={4}
                placeholder="Anything at all, or leave it blank…"
                voiceContext="Is there anything else we should know, including anything that would make the Fellowship more accessible?"
                voiceHint="Say whatever comes to mind." />
              <Consent checked={form.consent} onChange={set('consent')} />
            </>}

          </div>

          <div className="card-foot">
            {stepError && <p className="error-text" role="alert">{stepError}</p>}
            {slide > 0 && (
              <button className="btn btn-back" onClick={back} aria-label="Back">←</button>
            )}
            {slide === LAST_SLIDE ? (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Sending…' : `Send my application, ${firstName(form.name)} →`}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={next}>
                {slide === 0 ? 'Start my application →' : slide === 12 && !form.heard_from ? 'Skip →' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
