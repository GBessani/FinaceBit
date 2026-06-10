"use client"

import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Props {
  totalInvested: number
  totalCurrent: number
  totalNet: number
}

export function InvestmentSummary({ totalInvested, totalCurrent, totalNet }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <p className="text-sm text-muted-foreground mb-1">Capital em Carteira</p>
        <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <p className="text-sm text-muted-foreground mb-1">Valor Bruto Atual</p>
        <p className={`text-2xl font-bold ${totalCurrent >= totalInvested ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {formatCurrency(totalCurrent)}
        </p>
        <p className={`text-xs mt-1 flex items-center gap-1 ${totalCurrent >= totalInvested ? "text-emerald-600" : "text-red-500"}`}>
          {totalCurrent >= totalInvested
            ? <TrendingUp className="h-3 w-3" />
            : <TrendingDown className="h-3 w-3" />}
          {totalInvested > 0 ? `${(((totalCurrent - totalInvested) / totalInvested) * 100).toFixed(2)}%` : "—"}
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <p className="text-sm text-muted-foreground mb-1">Valor Líquido (após IR/IOF)</p>
        <p className={`text-2xl font-bold ${totalNet >= totalInvested ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {formatCurrency(totalNet)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatCurrency(totalNet - totalInvested)} de rendimento líquido
        </p>
      </div>
    </div>
  )
}
