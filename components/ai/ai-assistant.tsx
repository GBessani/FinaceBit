"use client"

import { useState, useRef, useEffect } from "react"
import { useFinance } from "@/contexts/finance-context"
import { useChat } from "@ai-sdk/react"
import { formatCurrency, getCurrentMonth, getMonthName, parseMonth } from "@/lib/utils"
import { Sparkles, Send, X, Loader2, Bot, User } from "lucide-react"

export function AIAssistant() {
  const { data, getTotalIncome, getTotalExpenses, getBalance, getCategory, isLoaded } = useFinance()
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentMonth = getCurrentMonth()
  const { month, year } = parseMonth(currentMonth)

  const financialContext = isLoaded
    ? `
Dados financeiros do usuário (${getMonthName(month)} ${year}):
- Receita total: ${formatCurrency(getTotalIncome(currentMonth))}
- Despesas totais: ${formatCurrency(getTotalExpenses(currentMonth))}
- Saldo: ${formatCurrency(getBalance(currentMonth))}
- Número de transações este mês: ${data.transactions.filter((t) => t.date.startsWith(currentMonth)).length}

Últimas 10 transações:
${data.transactions
  .slice(0, 10)
  .map((t) => {
    const cat = getCategory(t.categoryId)
    return `- ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)} - ${t.description} (${cat?.name || "Sem categoria"}) em ${t.date}`
  })
  .join("\n")}

Despesas por categoria este mês:
${Object.entries(
  data.transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(currentMonth))
    .reduce((acc, t) => {
      const cat = getCategory(t.categoryId)
      const name = cat?.name || "Outros"
      acc[name] = (acc[name] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
)
  .sort((a, b) => b[1] - a[1])
  .map(([name, value]) => `- ${name}: ${formatCurrency(value)}`)
  .join("\n") || "Nenhuma despesa registrada"}

Metas financeiras:
${
  data.goals.length > 0
    ? data.goals
        .map(
          (g) =>
            `- ${g.name}: ${formatCurrency(g.currentAmount)} de ${formatCurrency(g.targetAmount)} (${((g.currentAmount / g.targetAmount) * 100).toFixed(0)}%)`
        )
        .join("\n")
    : "Nenhuma meta cadastrada"
}
`
    : ""

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
    body: {
      financialContext,
    },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Olá! Sou seu assistente financeiro com IA. Posso analisar seus gastos, dar dicas de economia, ajudar a planejar metas e responder perguntas sobre suas finanças. Como posso ajudar?",
      },
    ],
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!isLoaded) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 z-40"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg h-[600px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Assistente Financeiro</h3>
                  <p className="text-xs text-muted-foreground">Powered by AI</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`p-2 rounded-lg h-fit ${
                      message.role === "user" ? "bg-primary/10" : "bg-secondary"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {status === "streaming" && (
                <div className="flex gap-3">
                  <div className="p-2 bg-secondary rounded-lg h-fit">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-secondary p-3 rounded-2xl">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Pergunte sobre suas finanças..."
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={status === "streaming"}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || status === "streaming"}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
