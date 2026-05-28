"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { useMemo, useState } from "react"
import { Calendar, ChevronDown } from "lucide-react"
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

  // ─── Filtros de período ────────────────────────────────
  const [preset, setPreset] = useState("12") // "3", "6", "12", "all", "custom"
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [showCustom, setShowCustom] = useState(false)

  const presets = [
    { value: "3", label: "Últimos 3 meses" },
    { value: "6", label: "Últimos 6 meses" },
    { value: "12", label: "Últimos 12 meses" },
    { value: "all", label: "Todo o histórico" },
    { value: "custom", label: "Período personalizado" },
  ]

  // Label do período para os títulos dos gráficos
  const periodLabel = useMemo(() => {
    if (preset === "3") return "Últimos 3 meses"
    if (preset === "6") return "Últimos 6 meses"
    if (preset === "all") return "Todo o histórico"
    if (preset === "custom" && customStart && customEnd) {
      const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
      return `${fmt(customStart)} a ${fmt(customEnd)}`
    }
    return "Últimos 12 meses"
  }, [preset, customStart, customEnd])

  // Calcula datas de início e fim baseado no filtro
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const end = now.toISOString().split("T")[0]

    // Se personalizado mas datas não preenchidas, usa 12 meses
    if (preset === "custom") {
      if (customStart && customEnd && customStart <= customEnd) {
        return { startDate: customStart, endDate: customEnd }
      }
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      return { startDate: start.toISOString().split("T")[0], endDate: end }
    }
    if (preset === "all") {
      return { startDate: "2000-01-01", endDate: end }
    }
    const months = parseInt(preset)
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    return { startDate: start.toISOString().split("T")[0], endDate: end }
  }, [preset, customStart, customEnd])

  // Filtra transações pelo período
  const filteredTransactions = useMemo(() =>
    data.transactions.filter(t => t.date >= startDate && t.date <= endDate)
  , [data.transactions, startDate, endDate])

  const yearlyData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expense: number; balance: number }> = {}

    // Gera meses dinamicamente baseado no período filtrado
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
      months[key] = {
        month: getMonthName(current.getMonth()).substring(0, 3),
        income: 0,
        expense: 0,
        balance: 0,
      }
      current.setMonth(current.getMonth() + 1)
    }

    // Transações manuais (filtradas pelo período)
    filteredTransactions.forEach((t) => {
      const key = t.date.substring(0, 7)
      if (months[key]) {
        if (t.type === "income") months[key].income += t.amount
        else if (t.type === "expense") months[key].expense += t.amount
      }
    })


    let runningBalance = 0
    return Object.values(months).map((m) => {
      runningBalance += m.income - m.expense
      return { ...m, balance: runningBalance }
    })
  }, [filteredTransactions, startDate, endDate])

  const totalIncome = useMemo(() =>
    filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  , [filteredTransactions])

  const totalExpenses = useMemo(() =>
    filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  , [filteredTransactions])

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; value: number; color: string }> = {}

    // Transações manuais
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const category = getCategory(t.categoryId)
        const name = category?.name || "Outros"
        const color = category?.color || "#6b7280"
        if (!grouped[name]) grouped[name] = { name, value: 0, color }
        grouped[name].value += t.amount
      })

    return Object.values(grouped).sort((a, b) => b.value - a.value)
  }, [filteredTransactions, getCategory])

  const averageMonthlyExpense = useMemo(() => {
    const monthsWithData = new Set(
      filteredTransactions.filter((t) => t.type === "expense").map((t) => t.date.substring(0, 7))
    ).size
    return monthsWithData > 0 ? totalExpenses / monthsWithData : 0
  }, [filteredTransactions, totalExpenses])

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

      {/* Filtros de período */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Período:
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button
                key={p.value}
                onClick={() => { setPreset(p.value); setShowCustom(p.value === "custom") }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  preset === p.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {showCustom && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">De:</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Até:</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}
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
        <h3 className="font-semibold mb-4">Evolução do Saldo — {periodLabel}</h3>
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
          <h3 className="font-semibold mb-4">Despesas por Categoria — {periodLabel}</h3>
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