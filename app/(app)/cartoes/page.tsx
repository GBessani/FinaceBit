"use client"

import { useFinance } from "@/contexts/finance-context"
import { CreditCard as CreditCardType, CreditCardInstallment } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { useState, useMemo } from "react"
import {
  CreditCard as CardIcon, Plus, Trash2, Pencil,
  ShoppingCart, ChevronDown, ChevronUp, X, AlertTriangle, CheckCircle2
} from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

const CARD_COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#10b981","#3b82f6","#0891b2"]
const emptyCard = { name: "", limitAmount: "", dueDay: "10", color: "#6366f1" }

export default function CartoesPage() {
  const { data, addCreditCard, updateCreditCard, deleteCreditCard, addCCPurchase, payCCInvoice, deleteCCPurchase } = useFinance()

  const [showCardForm, setShowCardForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null)
  const [cardForm, setCardForm] = useState(emptyCard)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [showPurchaseForm, setShowPurchaseForm] = useState<string | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<{ cardId: string; month: string; total: number; installments: CreditCardInstallment[] } | null>(null)
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null)

  const [purchaseForm, setPurchaseForm] = useState({
    description: "", amount: "", categoryId: "",
    date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` })(),
    installments: "1",
  })
  const [purchaseErrors, setPurchaseErrors] = useState<Record<string, string>>({})

  const today = new Date()
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`
  const expenseCategories = data.categories.filter(c => c.type === "expense")

  const cardData = useMemo(() => {
    return data.creditCards.map(card => {
      const closingDay = card.closingDay
      const dueDay = card.dueDay
      const currentDay = today.getDate()

      let daysToClose = closingDay - currentDay
      if (daysToClose < 0) daysToClose += 30
      let daysToDue = dueDay - currentDay
      if (daysToDue < 0) daysToDue += 30

      // Parcelas do mês atual não pagas
      const currentInstallments = data.ccInstallments.filter(
        i => i.creditCardId === card.id && i.dueMonth === currentMonthStr && !i.isPaid
      )
      const invoiceTotal = currentInstallments.reduce((s, i) => s + i.amount, 0)

      // Todas as compras do cartão (para listagem)
      const allInstallments = data.ccInstallments.filter(
        i => i.creditCardId === card.id && !i.isPaid
      )

      const isClosed = currentDay >= closingDay
      const status = invoiceTotal > 0 && daysToDue <= 5 ? "due" :
                     invoiceTotal > 0 && daysToClose <= 3 ? "closing" : "ok"

      return { card, currentInstallments, invoiceTotal, allInstallments, daysToClose, daysToDue, status, isClosed }
    })
  }, [data.creditCards, data.ccInstallments, currentMonthStr, today])

  async function saveCard() {
    if (!cardForm.name || !cardForm.limitAmount || !cardForm.dueDay) { toast.error("Preencha todos os campos"); return }
    const dueDay = parseInt(cardForm.dueDay)
    const closingDay = dueDay - 7 <= 0 ? dueDay - 7 + 30 : dueDay - 7
    const payload = { id: editingId || "", name: cardForm.name, limitAmount: parseFloat(cardForm.limitAmount), dueDay, closingDay, color: cardForm.color, isActive: true }
    if (editingId) await updateCreditCard(payload)
    else await addCreditCard(payload)
    setShowCardForm(false); setEditingId(null); setCardForm(emptyCard)
    toast.success(editingId ? "Cartão atualizado!" : "Cartão adicionado!")
  }

  async function savePurchase(cardId: string) {
    const errs: Record<string, string> = {}
    if (!purchaseForm.description.trim()) errs.description = "Descrição é obrigatória"
    if (!purchaseForm.amount || parseFloat(purchaseForm.amount) <= 0) errs.amount = "Valor deve ser maior que zero"
    if (!purchaseForm.categoryId) errs.categoryId = "Selecione uma categoria"
    if (Object.keys(errs).length > 0) { setPurchaseErrors(errs); return }

    const installments = parseInt(purchaseForm.installments) || 1
    await addCCPurchase({
      creditCardId: cardId,
      description: purchaseForm.description,
      totalAmount: parseFloat(purchaseForm.amount),
      installments,
      categoryId: purchaseForm.categoryId,
      purchaseDate: purchaseForm.date,
    }, installments)

    toast.success(installments > 1 ? `${installments}x de ${formatCurrency(parseFloat(purchaseForm.amount)/installments)} registradas!` : "Compra registrada!")
    setShowPurchaseForm(null)
    setPurchaseForm({ description: "", amount: "", categoryId: "", date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` })(), installments: "1" })
    setPurchaseErrors({})
  }

  function openPayInvoice(cardId: string, installments: CreditCardInstallment[], total: number) {
    setPayingInvoice({ cardId, month: currentMonthStr, total, installments })
  }

  async function confirmPayInvoice() {
    if (!payingInvoice) return
    await payCCInvoice(payingInvoice.cardId, payingInvoice.month, payingInvoice.total)
    toast.success("Fatura paga!")
    setPayingInvoice(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Controle suas compras e faturas</p>
        </div>
        <button onClick={() => setShowCardForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
          <Plus className="h-4 w-4" /> Novo Cartão
        </button>
      </div>

      {data.creditCards.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <CardIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum cartão cadastrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cardData.map(({ card, currentInstallments, invoiceTotal, allInstallments, daysToClose, daysToDue, status, isClosed }) => (
            <div key={card.id} className={`bg-card border rounded-xl shadow-sm overflow-hidden ${
              status === "due" ? "border-red-300 dark:border-red-800" :
              status === "closing" ? "border-amber-300 dark:border-amber-800" : "border-border"
            }`}>
              {/* Header */}
              <div className="p-5" style={{ background: `linear-gradient(135deg, ${card.color}22, ${card.color}11)` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: card.color }}>
                      <CardIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-lg truncate">{card.name}</p>
                      <p className="text-xs text-muted-foreground">Fecha dia {card.closingDay} • Vence dia {card.dueDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {status === "due" && <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" />Vence em {daysToDue}d</span>}
                    {status === "closing" && <span className="flex items-center gap-1 text-xs text-amber-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" />Fecha em {daysToClose}d</span>}
                    <button onClick={() => { setEditingId(card.id); setCardForm({ name: card.name, limitAmount: card.limitAmount.toString(), dueDay: card.dueDay.toString(), color: card.color }); setShowCardForm(true) }}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteCardId(card.id)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{isClosed ? "Fatura fechada" : "Fatura atual"}</p>
                    <p className="text-3xl font-bold">{formatCurrency(invoiceTotal)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{currentInstallments.length} item{currentInstallments.length !== 1 ? "s" : ""} este mês</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Limite: {formatCurrency(card.limitAmount)}</p>
                    <p>Total pendente: {formatCurrency(allInstallments.reduce((s,i)=>s+i.amount,0))}</p>
                  </div>
                </div>

                {card.limitAmount > 0 && (
                  <div className="mt-3 w-full bg-black/20 rounded-full h-1.5">
                    <div className="h-full rounded-full bg-white/80 transition-all"
                      style={{ width: `${Math.min((invoiceTotal/card.limitAmount)*100, 100)}%` }} />
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="px-4 py-3 border-t border-border flex flex-wrap gap-2">
                <button onClick={() => setShowPurchaseForm(card.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                  <ShoppingCart className="h-4 w-4" /> Registrar Compra
                </button>
                {currentInstallments.length > 0 && (
                  <button onClick={() => openPayInvoice(card.id, currentInstallments, invoiceTotal)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                    <CheckCircle2 className="h-4 w-4" /> Pagar Fatura
                  </button>
                )}
                <button onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                  className="px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                  {expandedCard === card.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Lista de parcelas expandida */}
              {expandedCard === card.id && (
                <div className="px-4 pb-4 space-y-2">
                  {allInstallments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma compra pendente</p>
                  ) : (
                    <>
                      {/* Agrupar por mês */}
                      {Array.from(new Set(allInstallments.map(i => i.dueMonth))).sort().map(month => {
                        const monthInst = allInstallments.filter(i => i.dueMonth === month)
                        const [y, m] = month.split("-").map(Number)
                        const label = new Date(y, m-1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                        return (
                          <div key={month}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 capitalize">{label}</p>
                            {monthInst.map(inst => (
                              <div key={inst.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg mb-1">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {inst.purchase?.description ?? "Compra"}
                                    {(inst.purchase?.installments ?? 1) > 1 && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ({inst.installmentNum}/{inst.purchase?.installments})
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <p className="text-sm font-semibold text-red-500">-{formatCurrency(inst.amount)}</p>
                                  {inst.purchaseId && inst.installmentNum === 1 && (
                                    <button onClick={() => setDeletePurchaseId(inst.purchaseId)}
                                      className="p-1 hover:bg-secondary rounded transition-colors">
                                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmar pagamento */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-lg">Pagar Fatura</h3>
            <div className="p-4 bg-secondary/50 rounded-xl">
              <p className="text-sm text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(payingInvoice.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{payingInvoice.installments.length} item(s) em {payingInvoice.month}</p>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {payingInvoice.installments.map(inst => (
                <div key={inst.id} className="flex justify-between text-sm p-2 bg-secondary/30 rounded-lg">
                  <span className="truncate mr-2">
                    {inst.purchase?.description ?? "Compra"}
                    {(inst.purchase?.installments ?? 1) > 1 && ` (${inst.installmentNum}/${inst.purchase?.installments})`}
                  </span>
                  <span className="font-medium shrink-0">{formatCurrency(inst.amount)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Uma transação de despesa será lançada no valor total.</p>
            <div className="flex gap-3">
              <button onClick={() => setPayingInvoice(null)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={confirmPayInvoice}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar compra */}
      {showPurchaseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Registrar Compra</h3>
              <button onClick={() => setShowPurchaseForm(null)} className="p-1.5 hover:bg-secondary rounded-lg"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <input value={purchaseForm.description}
                onChange={e => { setPurchaseForm(p => ({ ...p, description: e.target.value })); setPurchaseErrors(p => ({ ...p, description: "" })) }}
                placeholder="Ex: Supermercado, Netflix..."
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${purchaseErrors.description ? "border-red-400" : "border-border"}`} />
              {purchaseErrors.description && <p className="text-xs text-red-500 mt-1">{purchaseErrors.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
                <input value={purchaseForm.amount}
                  onChange={e => { setPurchaseForm(p => ({ ...p, amount: e.target.value })); setPurchaseErrors(p => ({ ...p, amount: "" })) }}
                  placeholder="0,00" type="number" min="0" step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${purchaseErrors.amount ? "border-red-400" : "border-border"}`} />
                {purchaseErrors.amount && <p className="text-xs text-red-500 mt-1">{purchaseErrors.amount}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Parcelas</label>
                <select value={purchaseForm.installments} onChange={e => setPurchaseForm(p => ({ ...p, installments: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x{n > 1 && purchaseForm.amount ? ` de ${formatCurrency(parseFloat(purchaseForm.amount||"0")/n)}` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <select value={purchaseForm.categoryId}
                onChange={e => { setPurchaseForm(p => ({ ...p, categoryId: e.target.value })); setPurchaseErrors(p => ({ ...p, categoryId: "" })) }}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${purchaseErrors.categoryId ? "border-red-400" : "border-border"}`}>
                <option value="">Selecione...</option>
                {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              {purchaseErrors.categoryId && <p className="text-xs text-red-500 mt-1">{purchaseErrors.categoryId}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data da compra</label>
              <input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            {parseInt(purchaseForm.installments) > 1 && purchaseForm.amount && (
              <div className="p-3 bg-primary/5 rounded-lg text-sm text-muted-foreground">
                {purchaseForm.installments}x de <strong>{formatCurrency(parseFloat(purchaseForm.amount)/parseInt(purchaseForm.installments))}</strong> = Total {formatCurrency(parseFloat(purchaseForm.amount))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowPurchaseForm(null)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={() => savePurchase(showPurchaseForm)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal form cartão */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-lg">{editingId ? "Editar" : "Novo"} Cartão</h3>
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <input value={cardForm.name} onChange={e => setCardForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Nubank, Itaú..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Limite (R$)</label>
                <input value={cardForm.limitAmount} onChange={e => setCardForm(p => ({ ...p, limitAmount: e.target.value }))}
                  placeholder="5000" type="number"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Dia vencimento</label>
                <input value={cardForm.dueDay} onChange={e => setCardForm(p => ({ ...p, dueDay: e.target.value }))}
                  placeholder="10" type="number" min="1" max="31"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {cardForm.dueDay && <p className="text-xs text-muted-foreground mt-1">Fecha dia {parseInt(cardForm.dueDay)-7<=0?parseInt(cardForm.dueDay)-7+30:parseInt(cardForm.dueDay)-7}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map(color => (
                  <button key={color} onClick={() => setCardForm(p => ({ ...p, color }))}
                    className={`w-8 h-8 rounded-full transition-transform ${cardForm.color === color ? "scale-125 ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCardForm(false); setEditingId(null); setCardForm(emptyCard) }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={saveCard}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {editingId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm isOpen={!!deleteCardId} title="Excluir cartão?"
        description="O cartão e todas as compras vinculadas serão removidos."
        onConfirm={() => { deleteCardId && deleteCreditCard(deleteCardId); setDeleteCardId(null) }}
        onCancel={() => setDeleteCardId(null)} />

      <DeleteConfirm isOpen={!!deletePurchaseId} title="Excluir compra?"
        description="Todas as parcelas desta compra serão removidas."
        onConfirm={() => { deletePurchaseId && deleteCCPurchase(deletePurchaseId); setDeletePurchaseId(null) }}
        onCancel={() => setDeletePurchaseId(null)} />
    </div>
  )
}