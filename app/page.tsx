'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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

const TOTAL = 13 // slides 0–12, then thank you

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

// Get first name from full name
function firstName(name: string) {
  return name.trim().split(' ')[0] || name.trim()
}

// ── Slide transition state ───────────────────────────────
type SlideState = 'active' | 'entering-from-right' | 'exiting-to-left' | 'exiting-to-right'

export default function IntakeForm() {
  const [slide, setSlide]             = useState(0)
  const [slideState, setSlideState]   = useState<SlideState>('active')
  const [form, setForm]               = useState<FormData>(EMPTY)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setError]       = useState('')
  const [done, setDone]               = useState(false)
  const [cohort, setCohort]           = useState('')
  const sliding                       = useRef(false)

  const progress = done ? 100 : slide === 0 ? 0 : Math.round((slide / 12) * 100)
  const stepLabel = done ? 'Done' : slide === 0 ? '' : `${slide} of 12`

  const goTo = useCallback((next: number, direction: 'forward' | 'back') => {
    if (sliding.current) return
    sliding.current = true

    // Exit current
    setSlideState(direction === 'forward' ? 'exiting-to-left' : 'exiting-to-right')

    setTimeout(() => {
      setSlide(next)
      setSlideState('entering-from-right')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideState('active')
          sliding.current = false
        })
      })
    }, 200)
  }, [])

  const next = useCallback(() => {
    if (slide < TOTAL) goTo(slide + 1, 'forward')
  }, [slide, goTo])

  const back = useCallback(() => {
    if (slide > 0) goTo(slide - 1, 'back')
  }, [slide, goTo])

  // Keyboard: Enter to advance (not in textarea)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (slide < TOTAL && !done) next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slide, done, next])

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

  // ── SHARED COMPONENTS ────────────────────────────────
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

  const BtnBar = ({ isSubmit = false }: { isSubmit?: boolean }) => (
    <div className="btn-bar">
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

  // ── THANK YOU ────────────────────────────────────────
  if (done) {
    const name = firstName(form.respondent_name)
    return (
      <>
        <div className="progress"><div className="progress-fill" style={{ width: '100%' }} /></div>
        <div className="logo-strip">
          <div className="logo">Catalyst<span> AI</span></div>
          <span className="step-label">Done</span>
        </div>
        <div className="slide-container">
          <div className="slide active" style={{ justifyContent: 'center' }}>
            <div className="ty-mark">✓</div>
            <h1 className="headline-xl">
              {name ? `Okay, ${name}.\n` : ''}We&apos;ve got<br /><em>everything.</em>
            </h1>
            {cohort && <div className="ty-cohort">Session profile: {cohort}</div>}
            <p className="body">
              I&apos;ve read every word. Our session will be built around your answers —
              not a template, not a script. Just a conversation designed for you.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--mid)' }}>
              You&apos;ll hear from me shortly with next steps.
            </p>
          </div>
        </div>
      </>
    )
  }

  // ── SLIDES ───────────────────────────────────────────
  return (
    <>
      {/* Progress */}
      <div className="progress">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Logo strip */}
      <div className="logo-strip">
        <div className="logo">Catalyst<span> AI</span></div>
        <span className="step-label">{stepLabel}</span>
      </div>

      {/* Slide */}
      <div className="slide-container">
        <div className={`slide ${slideState}`}>

          {/* ── 0: INTRO ── */}
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
                <div key={m} className="meta-pill">
                  <div className="meta-dot" />{m}
                </div>
              ))}
            </div>
          </>}

          {/* ── 1: NAME + EMAIL ── */}
          {slide === 1 && <>
            <div className="section-label">
              <div className="section-line" /><div className="section-text">About you</div>
            </div>
            <div className="q-number">Question 1 of 12</div>
            <h2 className="headline">First things first — who are you?</h2>
            <p className="subtext">Your name and email so I know who I&apos;m hearing from.</p>
            <div className="input-wrap">
              <label className="input-label">Your name</label>
              <input className="q-input" type="text" placeholder="Full name"
                value={form.respondent_name}
                onChange={e => set('respondent_name')(e.target.value)}
                autoFocus autoComplete="name" />
            </div>
            <div className="input-wrap">
              <label className="input-label">Email address</label>
              <input className="q-input" type="email" placeholder="you@example.com"
                value={form.respondent_email}
                onChange={e => set('respondent_email')(e.target.value)}
                autoComplete="email" inputMode="email" />
            </div>
          </>}

          {/* ── 2: WHAT DO YOU DO ── */}
          {slide === 2 && <>
            <div className="q-number">Question 2 of 12</div>
            <h2 className="headline">What do you do?</h2>
            <p className="subtext">
              Tell me what you&apos;d say at a dinner party, not on your LinkedIn.
            </p>
            <input className="q-input" type="text" placeholder="Type your answer…"
              value={form.q1_intro}
              onChange={e => set('q1_intro')(e.target.value)} autoFocus />
          </>}

          {/* ── 3: WORLD ── */}
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

          {/* ── 4: TYPICAL TUESDAY ── */}
          {slide === 4 && <>
            <div className="q-number">Question 4 of 12</div>
            <h2 className="headline">Walk me through a typical Tuesday.</h2>
            <p className="subtext">
              Just a rough sketch — what does your day actually look like from morning to evening?
            </p>
            <textarea className="q-textarea" rows={5}
              placeholder="Morning meetings, school run, client calls, late nights… whatever it is."
              value={form.q3_tuesday}
              onChange={e => set('q3_tuesday')(e.target.value)} />
          </>}

          {/* ── 5: AI REACTION ── */}
          {slide === 5 && <>
            <div className="section-label">
              <div className="section-line" /><div className="section-text">You & AI</div>
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

          {/* ── 6: AI EXPERIENCE ── */}
          {slide === 6 && <>
            <div className="q-number">Question 6 of 12</div>
            <h2 className="headline">Have you actually tried any AI tools yet?</h2>
            <p className="subtext">ChatGPT, Siri, a smart filter — all counts.</p>
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

          {/* ── 7: CONFIDENCE ── */}
          {slide === 7 && <>
            <div className="q-number">Question 7 of 12</div>
            <h2 className="headline">How confident do you feel talking about AI to someone you respect?</h2>
            <p className="subtext">
              1 = I&apos;d bluff my way through it.&nbsp; 5 = I could hold my own anywhere.
            </p>
            <div className="scale-labels">
              <span>Would bluff</span><span>Fully confident</span>
            </div>
            <div className="scale-options">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n}
                  className={`scale-btn${form.q6_confidence === n ? ' selected' : ''}`}
                  onClick={() => set('q6_confidence')(n)}>
                  {n}
                </button>
              ))}
            </div>
          </>}

          {/* ── 8: ENERGY ── */}
          {slide === 8 && <>
            <div className="section-label">
              <div className="section-line" /><div className="section-text">Your world</div>
            </div>
            <div className="q-number">Question 8 of 12</div>
            <h2 className="headline">Where does most of your energy go each week?</h2>
            <p className="subtext">Select all that apply.</p>
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

          {/* ── 9: DREAD ── */}
          {slide === 9 && <>
            <div className="q-number">Question 9 of 12</div>
            <h2 className="headline">What part of your week do you dread most?</h2>
            <p className="subtext">The thing you keep putting off, or that drains you more than it should.</p>
            <textarea className="q-textarea" rows={4}
              placeholder="Could be a task, a type of meeting, a recurring situation…"
              value={form.q8_dread}
              onChange={e => set('q8_dread')(e.target.value)} />
          </>}

          {/* ── 10: 2 HOURS ── */}
          {slide === 10 && <>
            <div className="q-number">Question 10 of 12</div>
            <h2 className="headline">If you could reclaim 2 hours a day, what would you actually do with them?</h2>
            <p className="subtext">Not what you should do. What you&apos;d genuinely want to do.</p>
            <textarea className="q-textarea" rows={4}
              placeholder="Sleep more, think better, spend time with people, build something…"
              value={form.q9_two_hours}
              onChange={e => set('q9_two_hours')(e.target.value)} />
          </>}

          {/* ── 11: OUTCOMES ── */}
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

          {/* ── 12: WORRIES ── */}
          {slide === 12 && <>
            <div className="q-number">Question 12 of 12</div>
            <h2 className="headline">Is there anything you&apos;re worried about when it comes to AI?</h2>
            <p className="subtext">
              About your job, your privacy, your industry. Optional — but if something&apos;s on
              your mind, I want to know.
            </p>
            <textarea className="q-textarea" rows={4}
              placeholder="Or just write 'not really' — that's valid too."
              value={form.q11_worries}
              onChange={e => set('q11_worries')(e.target.value)} />
          </>}

          {/* ── 13: WILDCARD + SUBMIT ── */}
          {slide === 13 && <>
            <div className="q-number">One last thing</div>
            <h2 className="headline">
              What&apos;s one thing you want me to know about you that a form like this
              probably won&apos;t capture?
            </h2>
            <p className="subtext">Surprising, personal, professional, strange — all welcome.</p>
            <textarea className="q-textarea" rows={5}
              placeholder="Anything at all…"
              value={form.q12_wildcard}
              onChange={e => set('q12_wildcard')(e.target.value)} />
            {submitError && <p className="error-text">{submitError}</p>}
          </>}

        </div>
      </div>

      {/* Button bar */}
      <BtnBar isSubmit={slide === 13} />
    </>
  )
}
