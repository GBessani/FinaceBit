"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getCurrentMonth, getMonthName, parseMonth } from "@/lib/utils"
import {
  ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown,
  Wallet, ChevronLeft, ChevronRight,
} from "lucide-react"
import { useState, useMemo } from "react"

interface DashboardSummaryProps {
  selectedMonth?: string
  onMonthChange?: (month: string) => void
}

export function DashboardSummary({ selectedMonth: selectedMonthProp, onMonthChange }: DashboardSummaryProps = {}) {
  const { getTotalIncome, getTotalExpenses, getBalance, isLoaded, data, initialBalance } = useFinance()
  const [internalMonth, setInternalMonth] = useState(getCurrentMonth())
  const currentMonth = selectedMonthProp ?? internalMonth

  const { year, month } = parseMonth(currentMonth)

  // Verifica se o mês selecionado é futuro
  const now = new Date()
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth())

  // Previsão para meses futuros: contas fixas + lançamentos pendentes
  const forecastIncome = useMemo(() => {
    if (!isFutureMonth) return null
    const fixed = data.fixedBills.filter(b => b.isActive && b.type === "income").reduce((s, b) => s + b.amount, 0)
    const scheduled = data.scheduledTransactions
      .filter(t => !t.isCompleted && t.type === "income" && t.scheduledDate.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0)
    return fixed + scheduled
  }, [isFutureMonth, data.fixedBills, data.scheduledTransactions, currentMonth])

  const forecastExpenses = useMemo(() => {
    if (!isFutureMonth) return null
    const fixed = data.fixedBills.filter(b => b.isActive && b.type === "expense").reduce((s, b) => s + b.amount, 0)
    const scheduled = data.scheduledTransactions
      .filter(t => !t.isCompleted && t.type === "expense" && t.scheduledDate.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0)
    return fixed + scheduled
  }, [isFutureMonth, data.fixedBills, data.scheduledTransactions, currentMonth])

  const income = useMemo(() => forecastIncome ?? getTotalIncome(currentMonth), [forecastIncome, getTotalIncome, currentMonth])
  const expenses = useMemo(() => forecastExpenses ?? getTotalExpenses(currentMonth), [forecastExpenses, getTotalExpenses, currentMonth])
  const balance = useMemo(() => income - expenses, [income, expenses])

  // Saldo total acumulado desde o início (todas as transações)
  const totalBalance = useMemo(() => {
    const allIncome = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const allExpenses = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    return (initialBalance ?? 0) + allIncome - allExpenses
  }, [data.transactions, initialBalance])

  // Mês anterior para comparativo
  const prevMonthKey = useMemo(() => {
    const d = new Date(year, month - 1, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }, [year, month])

  const prevIncome = useMemo(() => getTotalIncome(prevMonthKey), [getTotalIncome, prevMonthKey])
  const prevExpenses = useMemo(() => getTotalExpenses(prevMonthKey), [getTotalExpenses, prevMonthKey])

  const incomeDiff = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : null
  const expensesDiff = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : null

  // Progresso de despesas em relação às receitas
  const expenseRatio = income > 0 ? Math.min((expenses / income) * 100, 100) : 0

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1)
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    setInternalMonth(m); onMonthChange?.(m)
  }

  const nextMonth = () => {
    const d = new Date(year, month + 1, 1)
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    setInternalMonth(m); onMonthChange?.(m)
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center w-36">
            <h2 className="text-xl font-semibold">{getMonthName(month)} {year}</h2>
            {isFutureMonth && (
              <span className="text-xs text-muted-foreground">🔮 previsão</span>
            )}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {income > 0 && (
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span>{expenseRatio.toFixed(0)}% da receita comprometida</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${expenseRatio > 80 ? "bg-red-500" : expenseRatio > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${expenseRatio}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receitas */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{isFutureMonth ? "Previsão Receitas" : "Receitas"}</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(income)}
          </p>
          {incomeDiff !== null && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${incomeDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {incomeDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{incomeDiff >= 0 ? "+" : ""}{incomeDiff.toFixed(1)}% vs mês anterior</span>
            </div>
          )}
        </div>

        {/* Despesas */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{isFutureMonth ? "Previsão Despesas" : "Despesas"}</span>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(expenses)}
          </p>
          {expensesDiff !== null && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${expensesDiff <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {expensesDiff <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              <span>{expensesDiff >= 0 ? "+" : ""}{expensesDiff.toFixed(1)}% vs mês anterior</span>
            </div>
          )}
          {income > 0 && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${expenseRatio > 80 ? "bg-red-500" : expenseRatio > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${expenseRatio}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{expenseRatio.toFixed(0)}% da receita</p>
            </div>
          )}
        </div>

        {/* Saldo */}
        <div className={`border rounded-xl p-5 shadow-sm ${balance >= 0 ? "bg-card border-border" : "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{isFutureMonth ? "Saldo Previsto" : "Saldo"}</span>
            <div className={`p-2 rounded-lg ${balance >= 0 ? "bg-primary/10" : "bg-red-100 dark:bg-red-900/30"}`}>
              {balance >= 0 ? (
                <Wallet className="h-4 w-4 text-primary" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(balance)}
          </p>
          {income > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {balance >= 0 ? `${((balance / income) * 100).toFixed(0)}% da receita guardada` : "Saldo negativo este mês"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}