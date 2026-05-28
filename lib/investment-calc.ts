import { Investment } from "./types"

// ─── Taxas de referência (aproximadas) ───────────────
export const CDI_RATE_ANNUAL = 0.1065   // 10.65% a.a.
export const SELIC_RATE_ANNUAL = 0.1075 // 10.75% a.a.
export const IPCA_RATE_ANNUAL = 0.0483  // 4.83% a.a.

// ─── IOF Regressivo (dias 1-30) ───────────────────────
const IOF_TABLE = [
  96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,
  30,26,23,20,16,13,10,6,3,0
]

export function getIOFRate(days: number): number {
  if (days <= 0) return 0.96
  if (days >= 30) return 0
  return IOF_TABLE[days - 1] / 100
}

export function getIRRate(days: number, assetType: string): number {
  if (assetType === "crypto") return 0.15
  if (assetType === "stock" || assetType === "fund") return 0.15
  if (days <= 180) return 0.225
  if (days <= 360) return 0.20
  if (days <= 720) return 0.175
  return 0.15
}

export function calcFixedIncomeYield(investment: Investment) {
  const empty = {
    grossYield: 0, netYield: 0,
    currentValue: investment.investedAmount ?? 0,
    netValue: investment.investedAmount ?? 0,
    iofAmount: 0, irAmount: 0, days: 0, irRate: 0, iofRate: 0
  }

  if (!investment.investedAt || !investment.rate || !investment.rateIndex) return empty

  const start = new Date(investment.investedAt + "T00:00:00")
  const now = new Date()
  const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  let baseRate = CDI_RATE_ANNUAL
  if (investment.rateIndex === "SELIC") baseRate = SELIC_RATE_ANNUAL
  if (investment.rateIndex === "IPCA") baseRate = IPCA_RATE_ANNUAL
  if (investment.rateIndex === "prefixado") baseRate = investment.rate / 100

  const effectiveRate = investment.rateIndex === "prefixado"
    ? baseRate
    : (investment.rate / 100) * baseRate

  const dailyRate = Math.pow(1 + effectiveRate, 1 / 252) - 1
  const grossYield = (investment.investedAmount ?? 0) * (Math.pow(1 + dailyRate, days) - 1)
  const currentValue = (investment.investedAmount ?? 0) + grossYield

  const iofRate = getIOFRate(days)
  const iofAmount = grossYield * iofRate
  const irRate = getIRRate(days, "fixed_income")
  const irBase = grossYield - iofAmount
  const irAmount = irBase > 0 ? irBase * irRate : 0
  const netYield = grossYield - iofAmount - irAmount
  const netValue = (investment.investedAmount ?? 0) + netYield

  return { grossYield, netYield, currentValue, netValue, iofAmount, irAmount, days, irRate, iofRate }
}

export function calcVariableIR(investment: Investment, currentPrice: number) {
  const currentValue = investment.quantity * currentPrice
  const profit = currentValue - (investment.investedAmount ?? 0)
  const days = investment.investedAt
    ? Math.floor((new Date().getTime() - new Date(investment.investedAt + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (profit <= 0) return { profit, irAmount: 0, netProfit: profit, irRate: 0, days }

  const irRate = getIRRate(days, investment.assetType)
  const irAmount = profit * irRate
  const netProfit = profit - irAmount

  return { profit, irAmount, netProfit, irRate, days }
}

export function formatDays(days: number): string {
  if (days < 30) return `${days} dias`
  if (days < 365) return `${Math.floor(days / 30)} meses`
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return months > 0 ? `${years}a ${months}m` : `${years} ano${years > 1 ? "s" : ""}`
}
