import { streamText } from "ai"
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
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
- Não invente dados que não foram fornecidos
- Se não tiver informação suficiente, peça mais detalhes ao usuário`

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}