"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getCurrentMonth, parseMonth, getMonthName } from "@/lib/utils"
import { useMemo } from "react"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts"

export function ExpenseChart({ selectedMonth }: { selectedMonth?: string } = {}) {
  const { data, getCategory, isLoaded } = useFinance()
  const currentMonth = selectedMonth ?? getCurrentMonth()

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; value: number; color: string }> = {}

    // Transações manuais do mês
    data.transactions
      .filter(t => t.type === "expense" && t.date.startsWith(currentMonth))
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
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.5rem" }} />
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
      ...data.scheduledTransactions.filter(t => t.isCompleted).map(t => t.scheduledDate.substring(0, 7)),
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
    data.scheduledTransactions.filter(t => !t.isCompleted).forEach(t => {
      const key = t.scheduledDate.substring(0, 7)
      if (!months[key]) return
      if (t.type === "income") months[key].forecastIncome += t.amount
      else months[key].forecastExpense += t.amount
    })

    return Object.values(months)
  }, [data.transactions, data.fixedBills, data.scheduledTransactions])

  const hasForecast = monthlyData.some(m => m.forecastIncome > 0 || m.forecastExpense > 0)

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
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={v => `${v / 1000}k`} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  income: "Receitas", expense: "Despesas",
                  forecastIncome: "Previsão Receitas", forecastExpense: "Previsão Despesas",
                }
                return [formatCurrency(value), labels[name] ?? name]
              }}
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.5rem" }}
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
    </div>
  )
}
export function CreditCardChart({ selectedMonth }: { selectedMonth?: string } = {}) {
  const { data, getCategory } = useFinance()
  const currentMonth = selectedMonth ?? getCurrentMonth()

  const chartData = useMemo(() => {
    const today = new Date()
    const byCategory: Record<string, number> = {}
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`

    data.ccInstallments.filter(i => !i.isPaid).forEach(i => {
      const card = data.creditCards.find(c => c.id === i.creditCardId)
      if (!card) return

      const closeFrom = new Date(today.getFullYear(), today.getMonth() - 1, card.closingDay + 1)
      const closeTo = new Date(today.getFullYear(), today.getMonth(), card.closingDay)

      const purchase = data.ccPurchases.find(p => p.id === i.purchaseId)
      const purchaseDate = purchase?.purchaseDate ?? ""
      if (!purchaseDate || purchaseDate < fmt(closeFrom) || purchaseDate > fmt(closeTo)) return

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