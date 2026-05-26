import { createGroq } from "@ai-sdk/groq"
import { streamText } from "ai"
import { rateLimit, getIP } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
  // Rate limit: 20 mensagens por hora por IP
  const ip = getIP(req)
  const limit = rateLimit(`chat:${ip}`, { limit: 20, windowMs: 60 * 60 * 1000 })

  if (!limit.success) {
    return NextResponse.json(
      { error: `Limite de mensagens atingido. Tente novamente em ${limit.resetIn} segundos.` },
      { status: 429 }
    )
  }

  const { messages, financialContext } = await req.json()

  const systemPrompt = `Você é um assistente financeiro pessoal inteligente e amigável. Seu objetivo é ajudar o usuário a:
- Analisar seus gastos e receitas
- Identificar padrões de consumo
- Dar dicas personalizadas de economia
- Ajudar a planejar e atingir metas financeiras
- Responder dúvidas sobre finanças pessoais

${financialContext ? `Contexto financeiro atual do usuário:\n${financialContext}` : "O usuário ainda não tem dados financeiros registrados."}

Regras:
- Sempre responda em português do Brasil
- Seja conciso e objetivo
- Use linguagem simples e acessível
- Quando relevante, cite os dados específicos do usuário
- Dê conselhos práticos e acionáveis
- Não invente dados que não foram fornecidos`

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
