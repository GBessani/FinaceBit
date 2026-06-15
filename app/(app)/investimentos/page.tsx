"use client"

import { formatCurrency } from "@/lib/utils"
import { calcFixedIncomeYield, calcPortfolioStats, calcSavingsBoxYield, formatDays, CDI_RATE_ANNUAL, SELIC_RATE_ANNUAL, IPCA_RATE_ANNUAL } from "@/lib/investment-calc"
import { TrendingUp, TrendingDown, Plus, Trash2, Pencil, RefreshCw, Bitcoin, BarChart2, LineChart, Info, ShieldAlert, Clock, ArrowDownCircle, ArrowUpCircle, PiggyBank, Wallet2 } from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { InvestmentSummary } from "@/components/investments/investment-summary"
import { InvestmentForm } from "@/components/investments/investment-form"
import { InvestmentTransactionModal } from "@/components/investments/investment-transaction-modal"
import { useInvestments } from "@/components/investments/use-investments"

export default function InvestimentosPage() {
  const ctx = useInvestments()
  const { data, isLoaded, tab, setTab, showForm, setShowForm, editingId, setEditingId, deleteId, setDeleteId, txModalId, setTxModalId, txForm, setTxForm, txDeleteId, setTxDeleteId, prices, loadingPrices, fetchPrices, varForm, setVarForm, fixForm, setFixForm, priceInput, setPriceInput, manualMode, setManualMode, errors, setErrors, variableInvestments, fixedInvestments, savingsBoxes, totals, saveTx, saveVariable, saveFixed, openEdit, onTickerChange, onQuantityChange, onPriceInputChange, deleteInvestment, deleteInvestmentTransaction } = ctx

  const irLabel = (rate: number) => `${(rate * 100).toFixed(1)}%`

  if (!isLoaded) return <div className="h-64 bg-muted rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">Carteira completa com impostos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPrices} disabled={loadingPrices}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm">
            <RefreshCw className={`h-4 w-4 ${loadingPrices ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      <InvestmentSummary totalInvested={totals.totalInvested} totalCurrent={totals.totalCurrent} totalNet={totals.totalNet} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([["variable", "Renda Variável", TrendingUp], ["fixed", "Renda Fixa", BarChart2], ["savings", "Caixinha", Wallet2]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Renda Variável */}
      {tab === "variable" && (
        <div className="space-y-3">
          {variableInvestments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Nenhum ativo cadastrado</p>
              <p className="text-sm text-muted-foreground">Adicione ações, FIIs, ETFs ou criptomoedas</p>
            </div>
          ) : variableInvestments.map(inv => {
            const cp = prices[inv.ticker]?.price || inv.avgPrice
            const change24h = prices[inv.ticker]?.change24h || 0
            const invTxs = data.investmentTransactions.filter(t => t.investmentId === inv.id)
            const stats = invTxs.length > 0 ? calcPortfolioStats(invTxs, cp, inv.assetType) : null
            const currentValue = stats ? stats.quantity * cp : inv.quantity * cp
            const profit = stats ? stats.profit : currentValue - (inv.investedAmount ?? 0)
            const irAmount = stats ? stats.irAmount : (profit > 0 ? profit * 0.15 : 0)
            const netProfit = stats ? stats.netProfit : profit - irAmount
            const irRate = stats ? stats.irRate : 0.15
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-secondary rounded-lg shrink-0">
                      {inv.assetType === "crypto" ? <Bitcoin className="h-5 w-5" /> : <LineChart className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{inv.name}</p>
                      <p className="text-xs text-muted-foreground uppercase truncate">{inv.ticker} • {inv.quantity} un.</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">{formatCurrency(currentValue)}</p>
                    <p className={`text-sm font-medium ${change24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}% 24h
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Investido</p><p className="font-medium">{formatCurrency(inv.investedAmount ?? 0)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Lucro Bruto</p><p className={`font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{profit >= 0 ? "+" : ""}{formatCurrency(profit)}</p></div>
                  <div><p className="text-muted-foreground text-xs flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> IR ({irLabel(irRate)})</p><p className="font-medium text-amber-600 dark:text-amber-400">{irAmount > 0 ? `-${formatCurrency(irAmount)}` : "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Lucro Líquido</p><p className={`font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)}</p></div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setTxModalId(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors"><Clock className="h-3.5 w-3.5" /> Movimentações</button>
                  <button onClick={() => openEdit(inv)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(inv.id)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Renda Fixa */}
      {tab === "fixed" && (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex flex-wrap gap-4 text-sm">
            <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Taxas de referência:</span>
            <span>CDI: {(CDI_RATE_ANNUAL * 100).toFixed(2)}% a.a.</span>
            <span>SELIC: {(SELIC_RATE_ANNUAL * 100).toFixed(2)}% a.a.</span>
            <span>IPCA: {(IPCA_RATE_ANNUAL * 100).toFixed(2)}% a.a.</span>
          </div>
          {fixedInvestments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Nenhuma renda fixa cadastrada</p>
              <p className="text-sm text-muted-foreground">Adicione CDBs, LCIs, Tesouro Direto e outros</p>
            </div>
          ) : fixedInvestments.map(inv => {
            const invTxs = data.investmentTransactions.filter(t => t.investmentId === inv.id)
            const { grossYield, netYield, currentValue, netValue, iofAmount, irAmount, days, irRate, iofRate } = invTxs.length > 0
              ? (() => { const r = calcSavingsBoxYield(invTxs, inv.rate ?? 100, inv.rateIndex ?? "CDI"); return { ...r, currentValue: r.netValue, iofAmount: 0, irAmount: r.grossYield - r.netYield, iofRate: 0, irRate: 0.15 } })()
              : calcFixedIncomeYield(inv)
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{inv.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.rateIndex === "prefixado" ? `${inv.rate}% a.a. prefixado` : `${inv.rate}% do ${inv.rateIndex}`}{inv.maturityDate && ` • Vence ${new Date(inv.maturityDate + "T00:00:00").toLocaleDateString("pt-BR")}`}</p>
                    {inv.investedAt && <p className="text-xs text-muted-foreground">Aplicado em {new Date(inv.investedAt + "T00:00:00").toLocaleDateString("pt-BR")} ({formatDays(days)})</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">{formatCurrency(currentValue)}</p>
                    <p className="text-xs text-muted-foreground">Líquido: {formatCurrency(netValue)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Investido</p><p className="font-medium">{formatCurrency(inv.investedAmount ?? 0)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Rendimento Bruto</p><p className="font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(grossYield)}</p></div>
                  <div><p className="text-muted-foreground text-xs flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> IOF{iofRate > 0 ? ` (${(iofRate * 100).toFixed(0)}%)` : ""}</p><p className="font-medium text-amber-600 dark:text-amber-400">{iofAmount > 0 ? `-${formatCurrency(iofAmount)}` : "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> IR ({irLabel(irRate)})</p><p className="font-medium text-amber-600 dark:text-amber-400">{irAmount > 0 ? `-${formatCurrency(irAmount)}` : "—"}</p></div>
                </div>
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rendimento Líquido (após IR/IOF)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(netYield)}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setTxModalId(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors"><Clock className="h-3.5 w-3.5" /> Movimentações</button>
                  <button onClick={() => openEdit(inv)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(inv.id)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Caixinha */}
      {tab === "savings" && (
        <div className="space-y-3">
          {savingsBoxes.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Nenhuma caixinha cadastrada</p>
              <p className="text-sm text-muted-foreground">Adicione sua caixinha ou reserva de emergência</p>
            </div>
          ) : savingsBoxes.map(inv => {
            const invTxs = data.investmentTransactions.filter(t => t.investmentId === inv.id)
            const { grossYield, netYield, netValue, balance, iofAmount, irAmount, iofRate, irRate } = invTxs.length > 0
              ? calcSavingsBoxYield(invTxs, inv.rate ?? 100, inv.rateIndex ?? "CDI")
              : (() => { const r = calcFixedIncomeYield(inv); return { ...r, balance: inv.investedAmount ?? 0 } })()
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0"><PiggyBank className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{inv.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.rateIndex === "prefixado" ? `${inv.rate}% a.a.` : `${inv.rate}% do ${inv.rateIndex}`}{inv.investedAt && ` • Desde ${new Date(inv.investedAt + "T00:00:00").toLocaleDateString("pt-BR")}`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(netValue)}</p>
                    <p className="text-xs text-muted-foreground">Saldo líquido</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Depositado</p><p className="font-medium">{formatCurrency(balance)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Rendimento Bruto</p><p className="font-medium text-emerald-600">+{formatCurrency(grossYield)}</p></div>
                  <div><p className="text-muted-foreground text-xs flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> IOF {iofRate > 0 ? `(${(iofRate * 100).toFixed(0)}%)` : ""}</p><p className="font-medium text-amber-600 dark:text-amber-400">{iofAmount > 0 ? `-${formatCurrency(iofAmount)}` : "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> IR ({(irRate * 100).toFixed(1)}%)</p><p className="font-medium text-amber-600 dark:text-amber-400">{irAmount > 0 ? `-${formatCurrency(irAmount)}` : "—"}</p></div>
                </div>
                <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rendimento Líquido (após IOF/IR)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(netYield)}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setTxModalId(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs hover:bg-emerald-100 transition-colors"><ArrowDownCircle className="h-3.5 w-3.5" /> Depositar / Retirar</button>
                  <button onClick={() => openEdit(inv)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(inv.id)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <InvestmentForm
          tab={tab} setTab={setTab} editingId={editingId}
          varForm={varForm} setVarForm={setVarForm}
          fixForm={fixForm} setFixForm={setFixForm}
          priceInput={priceInput} setPriceInput={setPriceInput}
          manualMode={manualMode} setManualMode={setManualMode}
          errors={errors} setErrors={setErrors}
          prices={prices}
          onTickerChange={onTickerChange}
          onQuantityChange={onQuantityChange}
          onPriceInputChange={onPriceInputChange}
          onSave={tab === "variable" ? saveVariable : saveFixed}
          onClose={() => { setShowForm(false); setEditingId(null) }}
        />
      )}

      {txModalId && (() => {
        const inv = data.investments.find(i => i.id === txModalId)
        if (!inv) return null
        return (
          <InvestmentTransactionModal
            inv={inv}
            txs={data.investmentTransactions.filter(t => t.investmentId === txModalId)}
            txForm={txForm} setTxForm={setTxForm}
            onSave={saveTx}
            onClose={() => setTxModalId(null)}
            onDeleteTx={(id) => { setTxDeleteId(id) }}
          />
        )
      })()}

      <DeleteConfirm isOpen={!!txDeleteId} title="Remover movimentação?"
        description="A movimentação será removida. O saldo do ativo será recalculado."
        onConfirm={() => { txDeleteId && deleteInvestmentTransaction(txDeleteId); setTxDeleteId(null) }}
        onCancel={() => setTxDeleteId(null)} />

      <DeleteConfirm isOpen={!!deleteId} title="Excluir investimento?"
        description="O investimento será removido permanentemente."
        onConfirm={() => { deleteId && deleteInvestment(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)} />
    </div>
  )
}