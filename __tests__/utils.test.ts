import { describe, it, expect } from "vitest"
import { formatCurrency, localDateStr, getInvoiceWindow } from "../lib/utils"

describe("formatCurrency", () => {
  it("formata valor positivo", () => {
    expect(formatCurrency(1000)).toBe("R$\u00a01.000,00")
  })

  it("formata valor com centavos", () => {
    expect(formatCurrency(1234.56)).toBe("R$\u00a01.234,56")
  })

  it("formata zero", () => {
    expect(formatCurrency(0)).toBe("R$\u00a00,00")
  })

  it("formata valor negativo", () => {
    expect(formatCurrency(-500)).toBe("-R$\u00a0500,00")
  })
})

describe("localDateStr", () => {
  it("retorna data no formato YYYY-MM-DD", () => {
    const result = localDateStr(new Date(2026, 5, 10)) // junho = mês 5
    expect(result).toBe("2026-06-10")
  })

  it("padeia mês e dia com zero", () => {
    const result = localDateStr(new Date(2026, 0, 5)) // janeiro = mês 0, dia 5
    expect(result).toBe("2026-01-05")
  })

  it("usa data atual quando não fornecida", () => {
    const result = localDateStr()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("getInvoiceWindow", () => {
  it("retorna strings no formato YYYY-MM-DD", () => {
    const { from, to } = getInvoiceWindow(10)
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("from é antes de to", () => {
    const { from, to } = getInvoiceWindow(10)
    expect(from < to).toBe(true)
  })

  it("janela tem ~30 dias", () => {
    const { from, to } = getInvoiceWindow(15)
    const diff = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
    expect(diff).toBeGreaterThan(25)
    expect(diff).toBeLessThan(35)
  })
})
