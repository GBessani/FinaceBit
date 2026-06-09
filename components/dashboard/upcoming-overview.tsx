"use client"

import { useFinance } from "@/contexts/finance-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CategoryIcon } from "@/components/categories/category-icon"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO, differenceInDays, isToday, isBefore } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarClock, RefreshCw, AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export function UpcomingOverview() {
  const { data, getCategory, getUpcomingBills } = useFinance()

  const upcomingBills = getUpcomingBills().slice(0, 3)
  const today = new Date()

  const upcomingScheduled = data.transactions.filter(t => t.status === "pending")
    
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  const getDaysUntilDue = (dueDay: number) => {
    const currentDay = today.getDate()
    if (dueDay >= currentDay) {
      return dueDay - currentDay
    }
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    return daysInMonth - currentDay + dueDay
  }

  const getScheduledStatus = (scheduledDate: string) => {
    const date = parseISO(scheduledDate)
    const diff = differenceInDays(date, today)

    if (isToday(date)) {
      return { label: "Hoje", variant: "default" as const, className: "bg-warning text-warning-foreground" }
    }
    if (isBefore(date, today)) {
      return { label: "Atrasado", variant: "destructive" as const, className: "" }
    }
    if (diff <= 7) {
      return { label: `Em ${diff} dias`, variant: "outline" as const, className: "" }
    }
    return null
  }

  if (upcomingBills.length === 0 && upcomingScheduled.length === 0) {
    return null
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Próximas Contas Fixas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Próximas Contas Fixas
          </CardTitle>
          <Link
            href="/contas-fixas"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingBills.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhuma conta fixa vencendo em breve</p>
              <a href="/contas-fixas" className="text-xs text-primary hover:underline mt-1 inline-block">Cadastrar conta fixa →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBills.map((bill) => {
                const category = getCategory(bill.categoryId)
                const daysUntil = getDaysUntilDue(bill.dueDay)
                return (
                  <div key={bill.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {category && (
                        <CategoryIcon icon={category.icon} color={category.color} size={14} />
                      )}
                      <div>
                        <p className="text-sm font-medium">{bill.description}</p>
                        <p className="text-xs text-muted-foreground">Dia {bill.dueDay}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {daysUntil <= 5 && (
                        <Badge
                          variant={daysUntil === 0 ? "default" : "outline"}
                          className={daysUntil === 0 ? "bg-warning text-warning-foreground" : ""}
                        >
                          {daysUntil === 0 ? "Hoje" : `${daysUntil}d`}
                        </Badge>
                      )}
                      <span className={`text-sm font-medium ${bill.type === "expense" ? "text-destructive" : "text-primary"}`}>
                        {bill.type === "expense" ? "-" : "+"}{formatCurrency(bill.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos Lançamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Próximos Lançamentos
          </CardTitle>
          <Link
            href="/transacoes"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingScheduled.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhum lançamento nos próximos 7 dias</p>
              <a href="/transacoes" className="text-xs text-primary hover:underline mt-1 inline-block">Agendar lançamento →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingScheduled.map((transaction) => {
                const category = getCategory(transaction.categoryId)
                const status = getScheduledStatus(transaction.date)
                return (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {category && (
                        <CategoryIcon icon={category.icon} color={category.color} size={14} />
                      )}
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(transaction.date), "dd MMM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status && (
                        <Badge variant={status.variant} className={status.className}>
                          {status.variant === "destructive" && <AlertCircle className="h-3 w-3 mr-1" />}
                          {status.label}
                        </Badge>
                      )}
                      <span className={`text-sm font-medium ${transaction.type === "expense" ? "text-destructive" : "text-primary"}`}>
                        {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}