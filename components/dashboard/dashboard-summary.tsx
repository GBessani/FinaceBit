"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getCurrentMonth, getMonthName, parseMonth } from "@/lib/utils"
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState, useMemo } from "react"

export function DashboardSummary() {
  const { getTotalIncome, getTotalExpenses, getBalance, isLoaded } = useFinance()
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())

  const { year, month } = parseMonth(currentMonth)

  const income = useMemo(() => getTotalIncome(currentMonth), [getTotalIncome, currentMonth])
  const expenses = useMemo(() => getTotalExpenses(currentMonth), [getTotalExpenses, currentMonth])
  const balance = useMemo(() => getBalance(currentMonth), [getBalance, currentMonth])

  const prevMonth = () => {
    const date = new Date(year, month - 1, 1)
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`)
  }

  const nextMonth = () => {
    const date = new Date(year, month + 1, 1)
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`)
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {getMonthName(month)} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Receitas</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(income)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Despesas</span>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(expenses)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Saldo</span>
            <div className={`p-2 rounded-lg ${balance >= 0 ? "bg-primary/10" : "bg-red-100 dark:bg-red-900/30"}`}>
              {balance >= 0 ? (
                <Wallet className="h-4 w-4 text-primary" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  )
}
