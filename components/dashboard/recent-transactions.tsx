"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CategoryIcon } from "@/components/category-icon"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

export function RecentTransactions() {
  const { data, getCategory, isLoaded } = useFinance()

  const recentTransactions = data.transactions.slice(0, 5)

  if (!isLoaded) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold mb-4">Transações Recentes</h3>

      {recentTransactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma transação registrada</p>
          <p className="text-sm mt-1">Adicione sua primeira transação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentTransactions.map((transaction) => {
            const category = getCategory(transaction.categoryId)
            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${category?.color}20` }}
                  >
                    <CategoryIcon
                      icon={category?.icon || "Wallet"}
                      color={category?.color}
                      size={18}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {category?.name} • {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {transaction.type === "income" ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`font-semibold text-sm ${
                      transaction.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
