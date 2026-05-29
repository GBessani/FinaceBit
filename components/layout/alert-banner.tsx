"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getCurrentMonth } from "@/lib/utils"
import { AlertTriangle, Bell, X, CheckCircle } from "lucide-react"
import { useState, useMemo } from "react"
import { differenceInDays, parseISO, isToday, isBefore } from "date-fns"
import Link from "next/link"

export function AlertBanner() {
  const { data, addTransaction, updateScheduledTransaction } = useFinance()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [paying, setPaying] = useState<string | null>(null)
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  const alerts = useMemo(() => {
    const result: {
      id: string
      type: "danger" | "warning"
      message: string
      link: string
      action?: () => Promise<void>
    }[] = []

    // Contas fixas de despesa vencendo hoje ou atrasadas
    data.fixedBills.filter(b => b.isActive && b.type === "expense").forEach(b => {
      const currentDay = today.getDate()
      const daysUntil = b.dueDay === currentDay ? 0 : b.dueDay > currentDay ? b.dueDay - currentDay : -1

      // Verifica se já foi paga este mês
      const currentMonth = getCurrentMonth()
      const alreadyPaid = data.transactions.some(
        t => t.description === b.description && t.date.startsWith(currentMonth) && t.type === "expense"
      )
      if (alreadyPaid) return

      if (daysUntil === 0 || daysUntil === -1) {
        result.push({
          id: `bill-${daysUntil === 0 ? "today" : "overdue"}-${b.id}`,
          type: daysUntil === 0 ? "warning" : "danger",
          message: daysUntil === 0
            ? `"${b.description}" vence hoje — ${formatCurrency(b.amount)}`
            : `"${b.description}" está em atraso — ${formatCurrency(b.amount)}`,
          link: "/contas-fixas",
          action: async () => {
            await addTransaction({
              id: "",
              description: b.description,
              amount: b.amount,
              type: "expense",
              categoryId: b.categoryId,
              date: todayStr,
              notes: "Pago via alerta do dashboard",
            })
          },
        })
      }
    })

    // Lançamentos futuros de despesa atrasados ou de hoje
    data.scheduledTransactions
      .filter(t => !t.isCompleted && t.type === "expense")
      .forEach(t => {
        const date = parseISO(t.scheduledDate)
        const isOverdue = isBefore(date, today) && !isToday(date)
        const isScheduledToday = isToday(date)

        if (isScheduledToday || isOverdue) {
          const days = isOverdue ? Math.abs(differenceInDays(date, today)) : 0
          result.push({
            id: `scheduled-${isScheduledToday ? "today" : "overdue"}-${t.id}`,
            type: isScheduledToday ? "warning" : "danger",
            message: isScheduledToday
              ? `"${t.description}" agendado para hoje — ${formatCurrency(t.amount)}`
              : `"${t.description}" atrasado há ${days} dia${days > 1 ? "s" : ""} — ${formatCurrency(t.amount)}`,
            link: "/lancamentos-futuros",
            action: async () => {
              await updateScheduledTransaction({ ...t, isCompleted: true })
              await addTransaction({
                id: "",
                description: t.description,
                amount: t.amount,
                type: t.type,
                categoryId: t.categoryId,
                date: todayStr,
                notes: t.notes,
              })
            },
          })
        }
      })

    return result.filter(a => !dismissed.includes(a.id))
  }, [data.fixedBills, data.scheduledTransactions, data.transactions, dismissed, today, todayStr, addTransaction, updateScheduledTransaction])

  if (alerts.length === 0) return null

  async function handlePay(alert: typeof alerts[0]) {
    if (!alert.action) return
    setPaying(alert.id)
    try {
      await alert.action()
      setDismissed(prev => [...prev, alert.id])
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            alert.type === "danger"
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === "danger"
              ? <AlertTriangle className="h-4 w-4 shrink-0" />
              : <Bell className="h-4 w-4 shrink-0" />
            }
            <span>{alert.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {alert.action && (
              <button
                onClick={() => handlePay(alert)}
                disabled={paying === alert.id}
                className="flex items-center gap-1 text-xs underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {paying === alert.id ? "Pagando..." : "Marcar pago"}
              </button>
            )}
            <Link href={alert.link} className="underline underline-offset-2 hover:opacity-80 text-xs">
              Ver
            </Link>
            <button onClick={() => setDismissed(prev => [...prev, alert.id])} className="hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}