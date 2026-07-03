"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getActiveInvoiceMonth, getCurrentMonth, parseMonth, getMonthName } from "@/lib/utils"
import { useMemo, useState } from "react"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts"
import { X, TrendingUp, TrendingDown } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function ExpenseChart({ selectedMonth }: { selectedMonth?: string } = {}) {
  const { data, getCategory, isLoaded } = useFinance()
  const currentMonth = selectedMonth ?? getCurrentMonth()

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; value: number; color: string }> = {}

    // Transações manuais do mês
    data.transactions
      .filter(t => t.type === "expense" && t.status !== "pending" && t.date.startsWith(currentMonth))
      .forEach(t => {
        const cat = getCategory(t.categoryId)
        const name = cat?.name || "Outros"
        const color = cat?.color || "#6b7280"
        if (!grouped[name]) grouped[name] = { name, value: 0, color }
        grouped[name].value += t.amount
      })

    return Object.values(grouped).sort((a, b) => b.value - a.value)
  }, [data.transactions, getCategory, currentMonth])

  if (!isLoaded) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  const { month } = parseMonth(currentMonth)

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold mb-4">Despesas por Categoria - {getMonthName(month)}</h3>

      {expensesByCategory.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>Nenhuma despesa registrada este mês</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={expensesByCategory} cx="50%" cy="50%"
                innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.5rem", color: "var(--foreground)" }} itemStyle={{ color: "var(--foreground)" }} labelStyle={{ color: "var(--foreground)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {expensesByCategory.length > 0 && (
        <div className="mt-4 space-y-2">
          {expensesByCategory.slice(0, 5).map((item) => {
            const total = expensesByCategory.reduce((s, i) => s + i.value, 0)
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
            return (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate flex-1 text-muted-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{pct}%</span>
                <span className="font-medium shrink-0">{formatCurrency(item.value)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MonthlyChart({ selectedMonth }: { selectedMonth?: string } = {}) {
  const { data, isLoaded } = useFinance()
  const [modalMonth, setModalMonth] = useState<string | null>(null)

  const monthlyData = useMemo(() => {
    const now = new Date()
    const months: Record<string, {
      month: string
      income: number
      expense: number
      forecastIncome: number
      forecastExpense: number
      isFuture: boolean
    }> = {}

    for (let i = 5; i >= -1; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const isFuture = date.getFullYear() > now.getFullYear() || (date.getFullYear() === now.getFullYear() && date.getMonth() > now.getMonth())
      months[key] = { month: getMonthName(date.getMonth()).substring(0, 3), income: 0, expense: 0, forecastIncome: 0, forecastExpense: 0, isFuture }
    }

    // Meses com movimento real
    const monthsWithMovement = new Set([
      ...data.transactions.map(t => t.date.substring(0, 7)),
      ...data.transactions.filter(t => t.status === "completed").map(t => t.date.substring(0, 7)),
    ])

    // Transações manuais
    data.transactions.forEach(t => {
      const key = t.date.substring(0, 7)
      if (!months[key]) return
      if (t.type === "income") months[key].income += t.amount
      else if (t.type === "expense") months[key].expense += t.amount
    })

    // Contas fixas — apenas previsão no mês futuro
    data.fixedBills.filter(b => b.isActive).forEach(b => {
      Object.keys(months).forEach(key => {
        if (!months[key].isFuture) return
        if (b.type === "income") months[key].forecastIncome += b.amount
        else months[key].forecastExpense += b.amount
      })
    })

    // Lançamentos futuros NÃO concluídos → somam na previsão
    data.transactions.filter(t => t.status === "pending").forEach(t => {
      const key = t.date.substring(0, 7)
      if (!months[key]) return
      if (t.type === "income") months[key].forecastIncome += t.amount
      else months[key].forecastExpense += t.amount
    })

    return Object.values(months)
  }, [data.transactions, data.fixedBills])

  const hasForecast = monthlyData.some(m => m.forecastIncome > 0 || m.forecastExpense > 0)

  const maxDataValue = Math.max(
    1,
    ...monthlyData.map(d => d.income + d.forecastIncome + d.expense + d.forecastExpense)
  )
  const yTickFormatter = (v: number) => {
    if (v === 0) return "0"
    if (maxDataValue >= 1000) {
      const k = v / 1000
      return `${Number.isInteger(k) ? k : k.toFixed(1)}k`
    }
    return v.toFixed(0)
  }

  if (!isLoaded) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Evolução Mensal</h3>
        {hasForecast && (
          <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded-full">
            🔮 inclui previsão
          </span>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthlyData}
            onClick={(payload) => {
              if (!payload?.activePayload?.[0]) return
              const label = payload.activePayload[0].payload?.month
              const entry = monthlyData.find(m => m.month === label)
              if (!entry) return
              const idx = monthlyData.indexOf(entry)
              const now = new Date()
              const date = new Date(now.getFullYear(), now.getMonth() - (monthlyData.length - 2 - idx), 1)
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}`
              setModalMonth(key)
            }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={yTickFormatter} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  income: "Receitas", expense: "Despesas",
                  forecastIncome: "Previsão Receitas", forecastExpense: "Previsão Despesas",
                }
                return [formatCurrency(value), labels[name] ?? name]
              }}
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.5rem", color: "var(--foreground)" }} itemStyle={{ color: "var(--foreground)" }} labelStyle={{ color: "var(--foreground)" }}
            />
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="income" stackId="a" />
            <Bar dataKey="forecastIncome" fill="#10b981" fillOpacity={0.35} radius={[4, 4, 0, 0]} name="forecastIncome" stackId="a" />
            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="expense" stackId="b" />
            <Bar dataKey="forecastExpense" fill="#ef4444" fillOpacity={0.35} radius={[4, 4, 0, 0]} name="forecastExpense" stackId="b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Receitas</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Despesas</span>
        </div>
        {hasForecast && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-40" />
              <span className="text-muted-foreground">Previsão Receitas</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-40" />
              <span className="text-muted-foreground">Previsão Despesas</span>
            </div>
          </>
        )}
      </div>

      {modalMonth && (
        <MonthSummaryModal
          month={modalMonth}
          transactions={data.transactions}
          onClose={() => setModalMonth(null)}
        />
      )}
    </div>
  )
}
export function CreditCardChart({ selectedMonth }: { selectedMonth?: string } = {}) {
  const { data, getCategory } = useFinance()

  const chartData = useMemo(() => {
    const today = new Date()
    const byCategory: Record<string, number> = {}

    // FIX (#18): usa o mesmo critério da página de Cartões — parcelas cujo
    // dueMonth bate com a fatura ativa do cartão. Antes filtrava por janela de
    // data da compra (getInvoiceWindow), o que excluía compras feitas após o
    // fechamento e divergia do "Total pendente"/"Fatura atual".
    data.ccInstallments.filter(i => !i.isPaid).forEach(i => {
      const card = data.creditCards.find(c => c.id === i.creditCardId)
      if (!card) return

      const activeMonth = getActiveInvoiceMonth(card.closingDay, today)
      if (i.dueMonth !== activeMonth) return

      const purchase = data.ccPurchases.find(p => p.id === i.purchaseId)
      const catId = purchase?.categoryId ?? ""
      const catName = catId ? (getCategory(catId)?.name ?? "Outros") : "Outros"
      byCategory[catName] = (byCategory[catName] || 0) + i.amount
    })

    return Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [data.ccInstallments, data.ccPurchases, data.creditCards, getCategory])

  const total = chartData.reduce((s, d) => s + d.value, 0)
  const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#10b981","#3b82f6","#0891b2"]

  if (chartData.length === 0) return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold mb-4">💳 Gastos no Cartão por Categoria</h3>
      <p className="text-center text-muted-foreground text-sm py-8">Nenhuma compra no cartão este mês</p>
    </div>
  )

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold mb-4">💳 Gastos no Cartão por Categoria</h3>
      <div className="flex flex-col gap-2">
        {chartData.map((item, i) => (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {item.name}
              </span>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div className="h-full rounded-full" style={{ width: `${(item.value/total)*100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold mt-1">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

    </div>
  )
}
// ─── Modal de resumo mensal ───────────────────────────────────────────────────
interface MonthSummaryModalProps {
  month: string // YYYY-MM
  transactions: import("@/lib/types").Transaction[]
  onClose: () => void
}

function MonthSummaryModal({ month, transactions, onClose }: MonthSummaryModalProps) {
  const monthTxs = transactions.filter(
    t => t.date.startsWith(month) && t.status !== "pending"
  )
  const income  = monthTxs.filter(t => t.type === "income")
    .sort((a, b) => b.amount - a.amount)
  const expense = monthTxs.filter(t => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)

  const totalIncome  = income.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0)
  const saldo = totalIncome - totalExpense

  const [y, m] = month.split("-").map(Number)
  const label = format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold capitalize">{label}</h3>
            <p className={`text-sm font-medium mt-0.5 ${saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              Saldo: {saldo >= 0 ? "+" : ""}{formatCurrency(saldo)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo: duas colunas */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-border">
          
          {/* Entradas */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" /> Entradas
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                +{formatCurrency(totalIncome)}
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              {income.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Sem receitas</p>
              ) : income.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(t.date), "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 tabular-nums">
                    +{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Saídas */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                <TrendingDown className="h-3.5 w-3.5" /> Saídas
              </span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                -{formatCurrency(totalExpense)}
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              {expense.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Sem despesas</p>
              ) : expense.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(t.date), "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-500 shrink-0 ml-2 tabular-nums">
                    -{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-4 py-3 border-t border-border shrink-0 flex justify-between text-xs text-muted-foreground">
          <span>{income.length} entradas · {expense.length} saídas · {income.length + expense.length} total</span>
          <span>Clique fora para fechar</span>
        </div>
      </div>
    </div>
  )
}