import { describe, it, expect } from "vitest"
import { localDateStr } from "../lib/utils"

// Simula a lógica de status de transação (extraída do transactions-list.tsx)
function getTransactionStatus(date: string, todayStr: string): "pending" | "completed" {
  return date > todayStr ? "pending" : "completed"
}

// Simula a lógica de classificação de abas
function classifyTransaction(tx: { status: string; date: string }, todayStr: string) {
  if (tx.status === "pending" && tx.date >= todayStr) return "pending"
  if (tx.status === "pending" && tx.date < todayStr) return "overdue"
  return "completed"
}

// Simula cálculo de saldo
function calcBalance(initialBalance: number, transactions: { type: string; amount: number; status: string }[]) {
  const completed = transactions.filter(t => t.status !== "pending")
  const income = completed.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const expense = completed.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  return initialBalance + income - expense
}

describe("Status de transação", () => {
  const today = "2026-06-10"

  it("data futura → pending", () => {
    expect(getTransactionStatus("2026-06-15", today)).toBe("pending")
  })

  it("data de hoje → completed", () => {
    expect(getTransactionStatus("2026-06-10", today)).toBe("completed")
  })

  it("data passada → completed", () => {
    expect(getTransactionStatus("2026-06-01", today)).toBe("completed")
  })
})

describe("Classificação de abas", () => {
  const today = "2026-06-10"

  it("pending + data futura → aba A Vencer", () => {
    expect(classifyTransaction({ status: "pending", date: "2026-06-20" }, today)).toBe("pending")
  })

  it("pending + data passada → aba Atrasadas", () => {
    expect(classifyTransaction({ status: "pending", date: "2026-06-01" }, today)).toBe("overdue")
  })

  it("completed → aba Concluídas", () => {
    expect(classifyTransaction({ status: "completed", date: "2026-06-05" }, today)).toBe("completed")
  })
})

describe("Cálculo de saldo", () => {
  it("pendentes não afetam saldo", () => {
    const txs = [
      { type: "income", amount: 2000, status: "completed" },
      { type: "expense", amount: 500, status: "completed" },
      { type: "expense", amount: 1000, status: "pending" }, // não deve contar
    ]
    expect(calcBalance(0, txs)).toBe(1500) // 2000 - 500
  })

  it("saldo inicial somado às transações", () => {
    const txs = [
      { type: "income", amount: 1000, status: "completed" },
    ]
    expect(calcBalance(500, txs)).toBe(1500)
  })

  it("saldo pode ser negativo", () => {
    const txs = [
      { type: "expense", amount: 2000, status: "completed" },
    ]
    expect(calcBalance(500, txs)).toBe(-1500)
  })

  it("saldo zerado sem transações", () => {
    expect(calcBalance(1000, [])).toBe(1000)
  })
})

describe("Parcelamento", () => {
  it("calcula valor de cada parcela corretamente", () => {
    const total = 900
    const installments = 3
    const perInstallment = Math.round((total / installments) * 100) / 100
    expect(perInstallment).toBe(300)
  })

  it("parcela futura é pending", () => {
    const today = "2026-06-10"
    const installmentDate = "2026-07-10"
    expect(getTransactionStatus(installmentDate, today)).toBe("pending")
  })

  it("parcela atual é completed", () => {
    const today = "2026-06-10"
    const installmentDate = "2026-06-10"
    expect(getTransactionStatus(installmentDate, today)).toBe("completed")
  })
})
