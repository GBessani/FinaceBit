"use client"

import { useState, useMemo } from "react"
import { useFinance } from "@/contexts/finance-context"
import { formatCurrency } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Circle } from "lucide-react"
import { parseISO, isSameDay, format } from "date-fns"
import { ptBR } from "date-fns/locale"

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

export default function CalendarioPage() {
  const { data, getCategory, isLoaded } = useFinance()
  const [today] = useState(new Date())
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Dias do mês
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(null) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(null) }

  // Eventos por dia
  const eventsByDay = useMemo(() => {
    const map: Record<string, { type: string; label: string; amount: number; color: string }[]> = {}

    const addEvent = (dateStr: string, type: string, label: string, amount: number, color: string) => {
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push({ type, label, amount, color })
    }

    // Transações
    data.transactions.forEach(t => {
      const d = t.date.slice(0, 10)
      const cat = getCategory(t.categoryId)
      addEvent(d,
        t.type === "income" ? "income" : "expense",
        t.description,
        t.amount,
        t.type === "income" ? "#10b981" : "#ef4444"
      )
    })

    // Contas fixas (próximo vencimento no mês)
    data.fixedBills.filter(b => b.isActive).forEach(b => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(b.dueDay).padStart(2, "0")}`
      addEvent(dateStr, b.type === "income" ? "fixed-income" : "fixed-expense",
        `${b.description} (fixa)`, b.amount,
        b.type === "income" ? "#06b6d4" : "#f97316"
      )
    })

    // Lançamentos futuros
    data.transactions.filter(t => t.status === "pending").forEach(t => {
      const d = t.date.slice(0, 10)
      addEvent(d, "scheduled", `${t.description} (agendado)`, t.amount, "#8b5cf6")
    })

    // Vencimento de cartões
    data.creditCards.forEach(card => {
      const dueStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(card.dueDay).padStart(2, "0")}`
      const closeStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(card.closingDay).padStart(2, "0")}`
      addEvent(dueStr, "card-due", `Vence: ${card.name}`, 0, "#ec4899")
      addEvent(closeStr, "card-close", `Fecha: ${card.name}`, 0, "#6366f1")
    })

    return map
  }, [data, year, month, getCategory])

  function getDayKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const selectedEvents = selectedDay
    ? eventsByDay[`${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`] ?? []
    : []

  if (!isLoaded) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="h-96 bg-muted rounded-xl animate-pulse" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendário Financeiro</h1>
        <p className="text-muted-foreground">Visualize transações, vencimentos e agendamentos</p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: "#10b981", label: "Receita" },
          { color: "#ef4444", label: "Despesa" },
          { color: "#06b6d4", label: "Conta Fixa (receita)" },
          { color: "#f97316", label: "Conta Fixa (despesa)" },
          { color: "#8b5cf6", label: "Agendado" },
          { color: "#ec4899", label: "Vencimento cartão" },
          { color: "#6366f1", label: "Fechamento cartão" },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Header do mês */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={prevMonth} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-bold text-lg">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(d => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {/* Espaços vazios */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-border/50 bg-muted/20" />
          ))}

          {/* Dias do mês */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const key = getDayKey(day)
            const events = eventsByDay[key] ?? []
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
            const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month && selectedDay?.getFullYear() === year
            const hasIncome = events.some(e => e.type === "income" || e.type === "fixed-income")
            const hasExpense = events.some(e => e.type === "expense" || e.type === "fixed-expense")
            const hasScheduled = events.some(e => e.type === "scheduled")
            const hasCard = events.some(e => e.type === "card-due" || e.type === "card-close")

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(new Date(year, month, day))}
                className={`min-h-[72px] border-b border-r border-border/50 p-1.5 cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 border-primary" :
                  isToday ? "bg-primary/5" : "hover:bg-secondary/50"
                }`}
              >
                <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                  isToday ? "bg-primary text-primary-foreground" :
                  isSelected ? "text-primary font-bold" : "text-foreground"
                }`}>
                  {day}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {hasIncome && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Receita" />}
                  {hasExpense && <span className="w-2 h-2 rounded-full bg-red-500" title="Despesa" />}
                  {hasScheduled && <span className="w-2 h-2 rounded-full bg-violet-500" title="Agendado" />}
                  {hasCard && <span className="w-2 h-2 rounded-full bg-pink-500" title="Cartão" />}
                </div>
                {events.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">{events.length} evento{events.length > 1 ? "s" : ""}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Painel de detalhes do dia selecionado */}
      {selectedDay && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
          <h3 className="font-semibold mb-4">
            {format(selectedDay, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className="text-sm truncate">{ev.label}</span>
                  </div>
                  {ev.amount > 0 && (
                    <span className="text-sm font-semibold shrink-0 ml-2" style={{ color: ev.color }}>
                      {ev.type === "income" || ev.type === "fixed-income" ? "+" : "-"}{formatCurrency(ev.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}