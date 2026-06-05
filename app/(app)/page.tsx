"use client"

import { useState } from "react"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { ExpenseChart, MonthlyChart, CreditCardChart } from "@/components/dashboard/charts"
import { UpcomingOverview } from "@/components/dashboard/upcoming-overview"
import { AlertBanner } from "@/components/dashboard/alert-banner"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { getCurrentMonth } from "@/lib/utils"

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas finanças</p>
      </div>

      <OnboardingTour />
      <AlertBanner />

      <div data-tour="summary">
        <DashboardSummary selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      </div>

      <div data-tour="upcoming"><UpcomingOverview /></div>

      <div data-tour="charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart selectedMonth={selectedMonth} />
        <MonthlyChart selectedMonth={selectedMonth} />
        <CreditCardChart selectedMonth={selectedMonth} />
      </div>

      <div data-tour="recent"><RecentTransactions /></div>
    </div>
  )
}