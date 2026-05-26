"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CategoryIcon } from "@/components/category-icon"
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react"
import Link from "next/link"

export function RecentTransactions() {
  const { data, getCategory, isLoaded } = useFinance()

  const recentTransactions = data.transactions.slice(0, 8)

  if (!isLoaded) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Transações Recentes</h3>
        <Link href="/transacoes" className="text-sm text-primary hover:underline flex items-center gap-1">
          Ver todas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="font-medium">Nenhuma transação ainda</p>
          <p className="text-sm mt-1">Adicione sua primeira transação para começar</p>
          <Link href="/transacoes" className="mt-3 inline-block text-sm text-primary hover:underline">
            Adicionar transação →
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {recentTransactions.map((transaction) => {
            const category = getCategory(transaction.categoryId)
            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: `${category?.color}20` }}
                  >
                    <CategoryIcon
                      icon={category?.icon || "Wallet"}
                      color={category?.color}
                      size={16}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm leading-tight">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {category?.name} • {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`font-semibold text-sm ${
                    transaction.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                  </span>
                  {transaction.type === "income" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
