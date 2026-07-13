"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getMonthName, localDateStr } from "@/lib/utils"
import { useMemo, useState } from "react"
import { Calendar } from "lucide-react"
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
    const end = localDateStr(now)

    // Se personalizado mas datas não preenchidas, usa 12 meses
    if (preset === "custom") {
      if (customStart && customEnd && customStart <= customEnd) {
        return { startDate: customStart, endDate: customEnd }
      }
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      return { startDate: localDateStr(start), endDate: end }
    }
    if (preset === "all") {
      return { startDate: "2000-01-01", endDate: end }
    }
    const months = parseInt(preset)
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    return { startDate: localDateStr(start), endDate: end }
  }, [preset, customStart, customEnd])

  // Filtra transações pelo período.
  // Exclui 'pending' (lançamentos futuros/a vencer): o relatório reflete o que
  // de fato aconteceu, não previsões. Sem isso, parcelas futuras entram como
  // despesa/receita real e inflam os totais do período.
  const filteredTransactions = useMemo(() =>
    data.transactions.filter(t => t.status !== "pending" && t.date >= startDate && t.date <= endDate)
  , [data.transactions, startDate, endDate])

  // Compras de cartão pagas no período (pela data da compra)
  const filteredCCPurchases = useMemo(() =>
    data.ccPurchases.filter(p => p.purchaseDate >= startDate && p.purchaseDate <= endDate)
  , [data.ccPurchases, startDate, endDate])

  // Total gasto no cartão no período
  const totalCCExpenses = useMemo(() =>
    filteredCCPurchases.reduce((s, p) => s + p.totalAmount, 0)
  , [filteredCCPurchases])

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
      const income = Math.round(m.income * 100) / 100
      const expense = Math.round(m.expense * 100) / 100
      runningBalance = Math.round((runningBalance + income - expense) * 100) / 100
      return { ...m, income, expense, balance: runningBalance }
    })
  }, [filteredTransactions, startDate, endDate])

  // Dados do gráfico de investimentos — evolução mensal baseada nas movimentações
  const investmentChartData = useMemo(() => {
    const months: Record<string, { month: string; investido: number }> = {}

    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
      months[key] = { month: getMonthName(current.getMonth()).substring(0, 3), investido: 0 }
      current.setMonth(current.getMonth() + 1)
    }

    // Usa movimentações se existirem, senão usa investedAt do ativo
    const hasTxs = data.investmentTransactions && data.investmentTransactions.length > 0

    if (hasTxs) {
      // Acumula compras e subtrai vendas mês a mês
      const monthlyNet: Record<string, number> = {}
      data.investmentTransactions.forEach(tx => {
        const key = tx.date.substring(0, 7)
        if (!monthlyNet[key]) monthlyNet[key] = 0
        monthlyNet[key] += tx.type === "buy" ? tx.total : -tx.total
      })

      // Acumula ao longo do tempo
      let accumulated = 0
      Object.keys(months).sort().forEach(key => {
        accumulated = Math.round((accumulated + (monthlyNet[key] ?? 0)) * 100) / 100
        months[key].investido = Math.max(0, accumulated)
      })
    } else {
      // Fallback: usa investedAt do ativo
      data.investments.forEach(inv => {
        if (!inv.investedAt) return
        const invKey = inv.investedAt.substring(0, 7)
        Object.keys(months).forEach(key => {
          if (key >= invKey) {
            months[key].investido = Math.round((months[key].investido + (inv.investedAmount ?? 0)) * 100) / 100
          }
        })
      })
    }

    return Object.values(months)
  }, [data.investments, data.investmentTransactions, startDate, endDate])

  const totalIncome = useMemo(() =>
    filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  , [filteredTransactions])

  const totalExpenses = useMemo(() =>
    filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  , [filteredTransactions])

  const totalExpensesWithCC = useMemo(() =>
    totalExpenses + totalCCExpenses
  , [totalExpenses, totalCCExpenses])

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

    // Compras de cartão
    filteredCCPurchases.forEach(p => {
      const category = p.categoryId ? getCategory(p.categoryId) : null
      const name = (category?.name || "Outros") + " (Cartão)"
      const color = category?.color || "#6366f1"
      if (!grouped[name]) grouped[name] = { name, value: 0, color }
      grouped[name].value += p.totalAmount
    })

    return Object.values(grouped).sort((a, b) => b.value - a.value)
  }, [filteredTransactions, filteredCCPurchases, getCategory])

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
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v.toFixed(0)}`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  color: "var(--foreground)",
                }}
                itemStyle={{ color: "var(--foreground)" }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" name="Saldo" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Investimentos */}
      {data.investments.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Evolução dos Investimentos — {periodLabel}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={investmentChartData}>
                <defs>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v.toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--foreground)",
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="investido"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorInvested)"
                  name="Total Investido"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
                        color: "var(--foreground)",
                      }}
                      itemStyle={{ color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--foreground)" }}
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