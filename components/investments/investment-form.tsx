"use client"

import { formatCurrency } from "@/lib/utils"
import { calcFixedIncomeYield } from "@/lib/investment-calc"
import { AssetType, FixedIncomeIndex } from "@/lib/types"
import { X, Calendar, Percent } from "lucide-react"
import { Tab, PriceMap, SAVINGS_BOX_RATES, FIXED_INCOME_TYPES, RATE_INDEXES, emptyFixed } from "./use-investments"

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
  editingId: string | null
  varForm: { name: string; ticker: string; assetType: AssetType; quantity: string; price: string; investedAt: string }
  setVarForm: (fn: (p: any) => any) => void
  fixForm: { name: string; investedAmount: string; investedAt: string; rateIndex: FixedIncomeIndex; rate: string; maturityDate: string }
  setFixForm: (fn: (p: any) => any) => void
  priceInput: string
  setPriceInput: (v: string) => void
  manualMode: boolean
  setManualMode: (fn: (p: boolean) => boolean) => void
  errors: Record<string, string>
  setErrors: (fn: (p: any) => any) => void
  prices: PriceMap
  onTickerChange: (v: string) => void
  onQuantityChange: (v: string) => void
  onPriceInputChange: (v: string) => void
  onSave: () => void
  onClose: () => void
}

export function InvestmentForm({ tab, setTab, editingId, varForm, setVarForm, fixForm, setFixForm, priceInput, setPriceInput, manualMode, setManualMode, errors, setErrors, prices, onTickerChange, onQuantityChange, onPriceInputChange, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">{editingId ? "Editar" : "Novo"} Investimento</h3>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors"><X className="h-4 w-4" /></button>
          </div>
          {!editingId && (
            <div className="flex gap-2 mt-3">
              {([["variable", "Renda Variável"], ["fixed", "Renda Fixa"], ["savings", "Caixinha"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === key ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {tab === "savings" ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome da caixinha</label>
                <input value={fixForm.name} onChange={e => setFixForm((p: any) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Reserva de emergência, Viagem..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Saldo inicial (R$)</label>
                  <input value={fixForm.investedAmount} onChange={e => setFixForm((p: any) => ({ ...p, investedAmount: e.target.value }))}
                    placeholder="0,00" type="text"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data de início</label>
                  <input value={fixForm.investedAt} onChange={e => setFixForm((p: any) => ({ ...p, investedAt: e.target.value }))}
                    type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rendimento</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {SAVINGS_BOX_RATES.map(r => (
                    <button key={r.label} onClick={() => setFixForm((p: any) => ({ ...p, rate: r.value.toString(), rateIndex: r.index }))}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${fixForm.rate === r.value.toString() ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <input type="number" step="0.01" min="0" value={fixForm.rate}
                  onChange={e => setFixForm((p: any) => ({ ...p, rate: e.target.value, rateIndex: "CDI" }))}
                  placeholder="Ex: 110"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.rate && <p className="text-xs text-red-500 mt-1">{errors.rate}</p>}
                {!errors.rate && fixForm.rate && <p className="text-xs text-muted-foreground mt-1">= {((parseFloat(fixForm.rate) / 100) * 10.65).toFixed(2)}% a.a. efetivo</p>}
              </div>
            </>
          ) : tab === "variable" ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ticker / ID</label>
                <input value={varForm.ticker} onChange={e => onTickerChange(e.target.value)}
                  placeholder="Ex: PETR4, bitcoin"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.ticker && <p className="text-xs text-red-500 mt-1">{errors.ticker}</p>}
                {prices[varForm.ticker] && <p className="text-xs text-emerald-600 mt-1">Cotação: {formatCurrency(prices[varForm.ticker].price)}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome</label>
                <input value={varForm.name} onChange={e => setVarForm((p: any) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do ativo"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo</label>
                <select value={varForm.assetType} onChange={e => setVarForm((p: any) => ({ ...p, assetType: e.target.value as AssetType }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="stock">Ação / FII / ETF</option>
                  <option value="crypto">Criptomoeda</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{manualMode ? "Modo Manual" : "Modo Automático"}</p>
                  <p className="text-xs text-muted-foreground">{manualMode ? "Quantidade e valor independentes" : "Quantidade ↔ Valor calculados automaticamente"}</p>
                </div>
                <button onClick={() => setManualMode(m => !m)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${manualMode ? "bg-primary" : "bg-border"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${manualMode ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Quantidade</label>
                  <input value={varForm.quantity} onChange={e => { onQuantityChange(e.target.value); setErrors((p: any) => ({ ...p, quantity: "" })) }}
                    placeholder="0,00" type="text"
                    className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.quantity ? "border-red-400" : "border-border"}`} />
                  {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Valor investido (R$)</label>
                  <input value={priceInput} onChange={e => { onPriceInputChange(e.target.value); setErrors((p: any) => ({ ...p, price: "" })) }}
                    placeholder="0,00" type="text"
                    className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.price ? "border-red-400" : "border-border"}`} />
                  {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de aplicação</label>
                <input type="date" value={varForm.investedAt} onChange={e => setVarForm((p: any) => ({ ...p, investedAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo de investimento</label>
                <select value={fixForm.name} onChange={e => setFixForm((p: any) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Selecione...</option>
                  {FIXED_INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Valor aplicado (R$)</label>
                  <input value={fixForm.investedAmount} onChange={e => setFixForm((p: any) => ({ ...p, investedAmount: e.target.value }))}
                    placeholder="1000,00" type="text"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data de aplicação</label>
                  <input value={fixForm.investedAt} onChange={e => setFixForm((p: any) => ({ ...p, investedAt: e.target.value }))}
                    type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Índice</label>
                  <select value={fixForm.rateIndex} onChange={e => setFixForm((p: any) => ({ ...p, rateIndex: e.target.value as FixedIncomeIndex }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {RATE_INDEXES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{fixForm.rateIndex === "prefixado" ? "Taxa a.a. (%)" : `% do ${fixForm.rateIndex}`}</label>
                  <input value={fixForm.rate} onChange={e => setFixForm((p: any) => ({ ...p, rate: e.target.value }))}
                    placeholder={fixForm.rateIndex === "prefixado" ? "12,5" : "110"} type="number" min="0" step="0.01"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  {errors.rate && <p className="text-xs text-red-500 mt-1">{errors.rate}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de vencimento (opcional)</label>
                <input value={fixForm.maturityDate} onChange={e => setFixForm((p: any) => ({ ...p, maturityDate: e.target.value }))}
                  type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              {fixForm.investedAmount && fixForm.investedAt && fixForm.rate && (() => {
                const preview = calcFixedIncomeYield({ id: "", name: fixForm.name, ticker: "", assetType: "fixed_income" as AssetType, quantity: 1, avgPrice: parseFloat(fixForm.investedAmount) || 0, investedAmount: parseFloat(fixForm.investedAmount) || 0, investedAt: fixForm.investedAt, rate: parseFloat(fixForm.rate) || 0, rateIndex: fixForm.rateIndex })
                return (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Preview do rendimento atual</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">Bruto: </span><span className="font-medium text-emerald-600">+{formatCurrency(preview.grossYield)}</span></div>
                      <div><span className="text-muted-foreground">Líquido: </span><span className="font-bold text-emerald-600">+{formatCurrency(preview.netYield)}</span></div>
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm">Cancelar</button>
          <button onClick={onSave} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            {editingId ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  )
}
