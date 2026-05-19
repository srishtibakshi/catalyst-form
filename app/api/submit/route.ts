import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveCohort } from '@/lib/cohort'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      respondent_name, respondent_email,
      q1_intro, q2_world, q3_tuesday,
      q4_ai_reaction, q5_ai_experience, q6_confidence,
      q7_energy, q8_dread, q9_two_hours,
      q10_outcomes, q11_worries, q12_wildcard,
    } = body

    if (!respondent_name?.trim() || !respondent_email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }

    const cohort_tag = deriveCohort(q4_ai_reaction, q5_ai_experience, Number(q6_confidence))

    // Use service role on server — never expose this key client-side
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const record = {
      respondent_name:  respondent_name.trim(),
      respondent_email: respondent_email.trim().toLowerCase(),
      q1_intro, q2_world, q3_tuesday,
      q4_ai_reaction, q5_ai_experience,
      q6_confidence: Number(q6_confidence) || null,
      q7_energy:    Array.isArray(q7_energy)   ? q7_energy   : [],
      q8_dread, q9_two_hours,
      q10_outcomes: Array.isArray(q10_outcomes) ? q10_outcomes : [],
      q11_worries, q12_wildcard,
      cohort_tag,
      raw_payload: body,
    }

    const { data, error } = await supabase
      .from('intake_responses')
      .insert(record)
      .select('id, cohort_tag')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Could not save response.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id, cohort: data.cohort_tag })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 })
  }
}
