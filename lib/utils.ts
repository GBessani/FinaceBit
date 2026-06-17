import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(date))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function getMonthName(month: number): string {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]
  return months[month]
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function parseMonth(monthStr: string): { year: number; month: number } {
  const [year, month] = monthStr.split("-").map(Number)
  return { year, month: month - 1 }
}

export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

/**
 * Dado o YYYY-MM-DD da compra e o dia de fechamento do cartão, retorna o
 * YYYY-MM da fatura em que essa compra (1ª parcela) cai.
 *
 * Regra: compra feita ATÉ o dia de fechamento (inclusive) entra na fatura
 * que fecha no mesmo mês; compra feita DEPOIS do fechamento entra na fatura
 * do mês seguinte. Trata virada de ano.
 *
 * Esta é a fonte única da verdade para "em qual fatura a parcela cai" —
 * substitui o filtro frágil por janela de datas (getInvoiceWindow).
 */
export function getInvoiceMonth(purchaseDate: string, closingDay: number): string {
  const [y, m, d] = purchaseDate.split("-").map(Number)
  let year = y
  let month = m // 1-12
  if (d > closingDay) {
    month += 1
    if (month > 12) { month = 1; year += 1 }
  }
  return `${year}-${String(month).padStart(2, "0")}-01`
}

/**
 * Retorna o YYYY-MM da fatura ATIVA (a próxima em aberto) de um cartão,
 * dado seu dia de fechamento. Se a fatura do mês corrente já fechou,
 * retorna a do mês seguinte. Trata virada de ano.
 */
export function getActiveInvoiceMonth(closingDay: number, today: Date = new Date()): string {
  let year = today.getFullYear()
  let month = today.getMonth() + 1 // 1-12
  if (today.getDate() > closingDay) {
    month += 1
    if (month > 12) { month = 1; year += 1 }
  }
  return `${year}-${String(month).padStart(2, "0")}-01`
}

/**
 * Soma N meses a um YYYY-MM, tratando virada de ano. Útil para calcular
 * o dueMonth de parcelas a partir do mês da 1ª fatura.
 */
export function addMonthsToInvoiceMonth(invoiceMonth: string, monthsToAdd: number): string {
  const [y, m] = invoiceMonth.split("-").map(Number)
  const total = (y * 12 + (m - 1)) + monthsToAdd
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return `${year}-${String(month).padStart(2, "0")}-01`
}