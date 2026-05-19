import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audio = formData.get('audio') as File | null
  const fieldContext = (formData.get('fieldContext') as string) || ''

  if (!audio || audio.size === 0) return Response.json({ cleaned: '' })

  try {
    // Step 1: verbatim transcription via Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3',
      response_format: 'text',
    })

    const raw = (typeof transcription === 'string' ? transcription : (transcription as { text: string }).text ?? '').trim()
    if (!raw) return Response.json({ cleaned: '' })

    // Step 2: light cleanup via Claude — filler words only, preserve meaning
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Clean up this voice transcription for a form field. The question being answered is: "${fieldContext}".

Remove filler words (um, uh, like, you know, sort of, kind of, basically, right). Fix obvious transcription errors. Make it read naturally as a written answer. Preserve the person's actual words, meaning, and tone as closely as possible.

Return ONLY the cleaned text. No explanation, no quotes, no prefix.

Raw transcript: ${raw}`,
      }],
    })

    const cleaned = message.content[0].type === 'text' ? message.content[0].text.trim() : raw
    return Response.json({ cleaned })
  } catch (err) {
    console.error('voice-cleanup error:', err)
    return Response.json({ cleaned: '' }, { status: 500 })
  }
}
