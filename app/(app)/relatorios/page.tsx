"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function RelatoriosPage() {
  const { data, getCategory, isLoaded } = useFinance()

  const yearlyData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expense: number; balance: number }> = {}
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      months[key] = {
        month: getMonthName(date.getMonth()).substring(0, 3),
        income: 0,
        expense: 0,
        balance: 0,
      }
    }

    // Transações manuais
    data.transactions.forEach((t) => {
      const key = t.date.substring(0, 7)
      if (months[key]) {
        if (t.type === "income") months[key].income += t.amount
        else months[key].expense += t.amount
      }
    })

    // Lançamentos futuros concluídos
    data.scheduledTransactions
      .filter((t) => t.isCompleted)
      .forEach((t) => {
        const key = t.scheduledDate.substring(0, 7)
        if (months[key]) {
          if (t.type === "income") months[key].income += t.amount
          else months[key].expense += t.amount
        }
      })

    // Meses que têm pelo menos uma transação ou lançamento concluído


    let runningBalance = 0
    return Object.values(months).map((m) => {
      runningBalance += m.income - m.expense
      return { ...m, balance: runningBalance }
    })
  }, [data.transactions])

  const totalIncome = useMemo(() =>
    data.transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  , [data.transactions])

  const totalExpenses = useMemo(() =>
    data.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  , [data.transactions])

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; value: number; color: string }> = {}

    // Transações manuais
    data.transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const category = getCategory(t.categoryId)
        const name = category?.name || "Outros"
        const color = category?.color || "#6b7280"
        if (!grouped[name]) grouped[name] = { name, value: 0, color }
        grouped[name].value += t.amount
      })

    return Object.values(grouped).sort((a, b) => b.value - a.value)
  }, [data.transactions, getCategory])

  const averageMonthlyExpense = useMemo(() => {
    const monthsWithData = new Set(
      data.transactions.filter((t) => t.type === "expense").map((t) => t.date.substring(0, 7))
    ).size
    return monthsWithData > 0 ? totalExpenses / monthsWithData : 0
  }, [data.transactions, totalExpenses])

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Total de Receitas</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Total de Despesas</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Saldo Total</p>
          <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Média Mensal de Gastos</p>
          <p className="text-2xl font-bold">{formatCurrency(averageMonthlyExpense)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Evolução do Saldo - Últimos 12 meses</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                }}
              />
              <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" name="Saldo" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Despesas por Categoria - Total</h3>
          {expensesByCategory.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>Nenhuma despesa registrada</p>
            </div>
          ) : (
            <>
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
              <div className="mt-4 space-y-2">
                {expensesByCategory.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Estatísticas</h3>
          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total de Transações</p>
              <p className="text-xl font-bold">{data.transactions.length}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Contas Fixas Ativas</p>
              <p className="text-xl font-bold">{data.fixedBills.filter((b) => b.isActive).length}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Metas Criadas</p>
              <p className="text-xl font-bold">{data.goals.length}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Metas Concluídas</p>
              <p className="text-xl font-bold">
                {data.goals.filter((g) => g.currentAmount >= g.targetAmount).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}