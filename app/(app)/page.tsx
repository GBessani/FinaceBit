import { DashboardSummary } from "@/components/dashboard/dashboard-summary"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { ExpenseChart, MonthlyChart } from "@/components/dashboard/charts"
import { UpcomingOverview } from "@/components/dashboard/upcoming-overview"
import { AlertBanner } from "@/components/dashboard/alert-banner"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas finanças</p>
      </div>

      <AlertBanner />

      <DashboardSummary />

      <UpcomingOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart />
        <MonthlyChart />
      </div>

      <RecentTransactions />
    </div>
  )
}
