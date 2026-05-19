import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { raw, fieldContext } = await req.json()

  if (!raw) return Response.json({ cleaned: '' })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are cleaning up a voice transcription for a form field. The question being answered is: "${fieldContext}".

Remove filler words (um, uh, like, you know, sort of, kind of, basically), fix any obvious transcription errors, and make the text read naturally as a written answer. Preserve the person's actual meaning, tone, and words as much as possible — just clean up the spoken-word roughness.

Return ONLY the cleaned text. No explanation, no quotes, no prefix.

Raw transcript: ${raw}`,
        },
      ],
    })

    const cleaned =
      message.content[0].type === 'text' ? message.content[0].text.trim() : raw

    return Response.json({ cleaned })
  } catch {
    return Response.json({ cleaned: raw })
  }
}
