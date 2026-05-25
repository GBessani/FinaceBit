"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getCurrentMonth, parseMonth, getMonthName } from "@/lib/utils"
import { useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

export function ExpenseChart() {
  const { data, getCategory, isLoaded } = useFinance()

  const currentMonth = getCurrentMonth()

  const expensesByCategory = useMemo(() => {
    // Transações de despesa do mês
    const filtered = data.transactions.filter(
      (t) => t.type === "expense" && t.date.startsWith(currentMonth)
    )

    const grouped = filtered.reduce((acc, t) => {
      const category = getCategory(t.categoryId)
      const name = category?.name || "Outros"
      const color = category?.color || "#6b7280"
      if (!acc[name]) {
        acc[name] = { name, value: 0, color }
      }
      acc[name].value += t.amount
      return acc
    }, {} as Record<string, { name: string; value: number; color: string }>)

    // Adicionar contas fixas de despesa ativas
    data.fixedBills
      .filter((b) => b.isActive && b.type === "expense")
      .forEach((bill) => {
        const category = getCategory(bill.categoryId)
        const name = category?.name || "Outros"
        const color = category?.color || "#6b7280"
        if (!grouped[name]) {
          grouped[name] = { name, value: 0, color }
        }
        grouped[name].value += bill.amount
      })

    return Object.values(grouped).sort((a, b) => b.value - a.value)
  }, [data.transactions, data.fixedBills, getCategory, currentMonth])

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
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {expensesByCategory.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {expensesByCategory.slice(0, 6).map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MonthlyChart() {
  const { data, isLoaded } = useFinance()

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expense: number }> = {}

    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      months[key] = {
        month: getMonthName(date.getMonth()).substring(0, 3),
        income: 0,
        expense: 0,
      }
    }

    // Adicionar transações
    data.transactions.forEach((t) => {
      const key = t.date.substring(0, 7)
      if (months[key]) {
        if (t.type === "income") {
          months[key].income += t.amount
        } else {
          months[key].expense += t.amount
        }
      }
    })

    // Adicionar contas fixas ativas a todos os meses
    data.fixedBills
      .filter((b) => b.isActive)
      .forEach((bill) => {
        Object.keys(months).forEach((key) => {
          if (bill.type === "income") {
            months[key].income += bill.amount
          } else {
            months[key].expense += bill.amount
          }
        })
      })

    return Object.values(months)
  }, [data.transactions, data.fixedBills])

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
      <h3 className="font-semibold mb-4">Evolução Mensal</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
              }}
            />
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Receitas</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Despesas</span>
        </div>
      </div>
    </div>
  )
}
