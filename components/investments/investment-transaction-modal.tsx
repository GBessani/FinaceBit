"use client"

import { formatCurrency } from "@/lib/utils"
import { Investment, InvestmentTransaction } from "@/lib/types"
import { X, ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { useState } from "react"

interface Props {
  inv: Investment
  txs: InvestmentTransaction[]
  txForm: { type: "buy" | "sell"; quantity: string; price: string; date: string; notes: string }
  setTxForm: (fn: (p: any) => any) => void
  onSave: () => void
  onClose: () => void
  onDeleteTx: (id: string) => void
}

export function InvestmentTransactionModal({ inv, txs, txForm, setTxForm, onSave, onClose, onDeleteTx }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const isSavings = inv.assetType === "savings_box"
  const buyLabel = isSavings ? "Depositar" : "Compra"
  const sellLabel = isSavings ? "Retirar" : "Venda"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold">{inv.name}</h3>
            <p className="text-sm text-muted-foreground">Histórico de movimentações</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 border-b border-border space-y-3">
          <p className="text-sm font-semibold">Nova movimentação</p>
          <div className="flex gap-2">
            {([["buy", buyLabel, ArrowDownCircle], ["sell", sellLabel, ArrowUpCircle]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setTxForm((p: any) => ({ ...p, type: v }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${txForm.type === v ? (v === "buy" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "bg-secondary"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {isSavings ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                <input value={txForm.price} onChange={e => setTxForm((p: any) => ({ ...p, price: e.target.value, quantity: "1" }))}
                  placeholder="0,00" type="text"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                <input value={txForm.date} onChange={e => setTxForm((p: any) => ({ ...p, date: e.target.value }))}
                  type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quantidade</label>
                <input value={txForm.quantity} onChange={e => setTxForm((p: any) => ({ ...p, quantity: e.target.value }))}
                  placeholder="0.00" type="text"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Preço unit. (R$)</label>
                <input value={txForm.price} onChange={e => setTxForm((p: any) => ({ ...p, price: e.target.value }))}
                  placeholder="0.00" type="text"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                <input value={txForm.date} onChange={e => setTxForm((p: any) => ({ ...p, date: e.target.value }))}
                  type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          )}

          {txForm.quantity && txForm.price && !isSavings && (
            <p className="text-xs text-muted-foreground">Total: <strong>{formatCurrency(parseFloat(txForm.quantity.replace(",", ".") || "0") * parseFloat(txForm.price.replace(",", ".") || "0"))}</strong></p>
          )}
          <button onClick={onSave}
            className={`w-full py-2 rounded-lg text-sm font-medium text-white transition-colors ${txForm.type === "buy" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
            {txForm.type === "buy" ? buyLabel : sellLabel}
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-semibold mb-3">Histórico</p>
          {txs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação registrada</p>
          ) : (
            <div className="space-y-2">
              {txs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                  <div className="flex items-center gap-3">
                    {tx.type === "buy" ? <ArrowDownCircle className="h-4 w-4 text-emerald-600 shrink-0" /> : <ArrowUpCircle className="h-4 w-4 text-red-500 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{tx.type === "buy" ? "Compra" : "Venda"} — {tx.quantity} un.</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.date + "T00:00:00").toLocaleDateString("pt-BR")} • {formatCurrency(tx.price)}/un.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold text-sm ${tx.type === "buy" ? "text-emerald-600" : "text-red-500"}`}>
                      {tx.type === "buy" ? "-" : "+"}{formatCurrency(tx.total)}
                    </p>
                    <button onClick={() => setDeleteId(tx.id)} className="p-1 hover:bg-secondary rounded transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirm isOpen={!!deleteId} title="Remover movimentação?"
        description="A movimentação será removida. O saldo do ativo será recalculado."
        onConfirm={() => { deleteId && onDeleteTx(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)} />
    </div>
  )
}
