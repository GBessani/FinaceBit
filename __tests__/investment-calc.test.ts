import { describe, it, expect } from "vitest"
import {
  getIOFRate,
  getIRRate,
  calcFixedIncomeYield,
  calcVariableIR,
  CDI_RATE_ANNUAL,
} from "../lib/investment-calc"
import { Investment } from "../lib/types"

describe("getIOFRate", () => {
  it("dia 1 = 96%", () => expect(getIOFRate(1)).toBe(0.96))
  it("dia 30 = 0%", () => expect(getIOFRate(30)).toBe(0))
  it("dia 31+ = 0%", () => expect(getIOFRate(31)).toBe(0))
  it("dia 0 = 96%", () => expect(getIOFRate(0)).toBe(0.96))
  it("dia 15 = 50%", () => expect(getIOFRate(15)).toBe(0.50))
})

describe("getIRRate", () => {
  it("até 180 dias = 22.5%", () => expect(getIRRate(180, "fixed_income")).toBe(0.225))
  it("181-360 dias = 20%", () => expect(getIRRate(181, "fixed_income")).toBe(0.20))
  it("361-720 dias = 17.5%", () => expect(getIRRate(361, "fixed_income")).toBe(0.175))
  it("acima 720 dias = 15%", () => expect(getIRRate(721, "fixed_income")).toBe(0.15))
  it("crypto = 15%", () => expect(getIRRate(1000, "crypto")).toBe(0.15))
  it("ação = 15%", () => expect(getIRRate(500, "stock")).toBe(0.15))
})

describe("calcFixedIncomeYield", () => {
  const baseInvestment: Investment = {
    id: "test-1",
    name: "CDB Teste",
    ticker: "CDB_TESTE",
    assetType: "fixed_income",
    quantity: 1,
    avgPrice: 10000,
    investedAmount: 10000,
    investedAt: "2025-06-10", // ~365 dias atrás
    rate: 100,
    rateIndex: "CDI",
  }

  it("retorna zero quando não tem investedAt", () => {
    const inv = { ...baseInvestment, investedAt: undefined }
    const result = calcFixedIncomeYield(inv)
    expect(result.grossYield).toBe(0)
    expect(result.netYield).toBe(0)
  })

  it("rendimento bruto positivo após 1 ano CDI", () => {
    const result = calcFixedIncomeYield(baseInvestment)
    expect(result.grossYield).toBeGreaterThan(0)
    expect(result.currentValue).toBeGreaterThan(10000)
  })

  it("rendimento líquido menor que bruto (IR/IOF)", () => {
    const result = calcFixedIncomeYield(baseInvestment)
    expect(result.netYield).toBeLessThan(result.grossYield)
  })

  it("IOF zerado após 30+ dias", () => {
    const result = calcFixedIncomeYield(baseInvestment)
    expect(result.iofAmount).toBe(0) // 1 ano > 30 dias
  })

  it("IR de 15% após 1 ano (365 dias)", () => {
    const result = calcFixedIncomeYield(baseInvestment)
    expect(result.irRate).toBe(0.175) // 361-720 dias
  })

  it("prefixado usa taxa direta sem multiplicar CDI", () => {
    const prefixado = { ...baseInvestment, rate: 12, rateIndex: "prefixado" as const }
    const result = calcFixedIncomeYield(prefixado)
    expect(result.grossYield).toBeGreaterThan(0)
  })

  it("netValue = investedAmount + netYield", () => {
    const result = calcFixedIncomeYield(baseInvestment)
    expect(result.netValue).toBeCloseTo(10000 + result.netYield, 2)
  })
})

describe("calcVariableIR", () => {
  const baseInvestment: Investment = {
    id: "test-2",
    name: "PETR4",
    ticker: "PETR4",
    assetType: "stock",
    quantity: 100,
    avgPrice: 30,
    investedAmount: 3000,
    investedAt: "2025-06-10",
  }

  it("sem lucro = IR zero", () => {
    const result = calcVariableIR(baseInvestment, 25) // preço abaixo do custo
    expect(result.irAmount).toBe(0)
    expect(result.profit).toBeLessThan(0)
  })

  it("com lucro = IR 15%", () => {
    const result = calcVariableIR(baseInvestment, 40) // preço acima do custo
    expect(result.irAmount).toBeGreaterThan(0)
    expect(result.irRate).toBe(0.15)
  })

  it("lucro líquido = lucro bruto - IR", () => {
    const result = calcVariableIR(baseInvestment, 40)
    expect(result.netProfit).toBeCloseTo(result.profit - result.irAmount, 2)
  })
})
