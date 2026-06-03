"use client"

import { useFinance } from "@/contexts/finance-context"
import { CreditCard as CreditCardType } from "@/lib/types"
import { formatCurrency, generateId } from "@/lib/utils"
import { useState, useMemo } from "react"
import {
  CreditCard as CardIcon, Plus, Trash2, Pencil,
  ShoppingCart, Receipt, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp
} from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

const CARD_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#10b981", "#3b82f6", "#0891b2",
]

const emptyCardForm = { name: "", limitAmount: "", dueDay: "10", color: "#6366f1" }

export default function CartoesPage() {
  const { data, addCreditCard, updateCreditCard, deleteCreditCard, addScheduledTransaction, addTransaction, updateScheduledTransaction } = useFinance()
  const [showCardForm, setShowCardForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [cardForm, setCardForm] = useState(emptyCardForm)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  // Estado do formulário de compra
  const [showPurchaseForm, setShowPurchaseForm] = useState<string | null>(null)
  const [purchaseForm, setPurchaseForm] = useState({
    description: "", amount: "", categoryId: "",
    date: new Date().toISOString().split("T")[0],
    installments: "1",
  })
  const [purchaseErrors, setPurchaseErrors] = useState<Record<string, string>>({})

  // Estado para pagar fatura
  const [payingCard, setPayingCard] = useState<string | null>(null)

  const today = new Date()
  const currentDay = today.getDate()
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

  const expenseCategories = data.categories.filter(c => c.type === "expense")

  // Para cada cartão, calcula fatura e status
  const cardData = useMemo(() => {
    return data.creditCards.map(card => {
      const closingDay = card.closingDay
      const dueDay = card.dueDay

      let daysToClose = closingDay - currentDay
      if (daysToClose < 0) daysToClose += 30
      let daysToDue = dueDay - currentDay
      if (daysToDue < 0) daysToDue += 30

      // Compras pendentes no cartão (lançamentos futuros vinculados a este cartão)
      const purchases = data.scheduledTransactions.filter(
        t => t.creditCardId === card.id && !t.isCompleted
      )

      // Total da fatura atual
      const invoiceTotal = purchases.reduce((s, t) => s + t.amount, 0)

      // Status
      const status = daysToClose <= 3 ? "closing" : daysToDue <= 5 ? "due" : "ok"

      return { card, purchases, invoiceTotal, daysToClose, daysToDue, status }
    })
  }, [data.creditCards, data.scheduledTransactions, currentDay])

  // ── Salvar cartão ───────────────────────────────
  async function saveCard() {
    if (!cardForm.name || !cardForm.limitAmount || !cardForm.dueDay) {
      toast.error("Preencha todos os campos"); return
    }
    const dueDay = parseInt(cardForm.dueDay)
    const closingDay = dueDay - 7 <= 0 ? dueDay - 7 + 30 : dueDay - 7
    const payload = {
      id: editingId || "",
      name: cardForm.name,
      limitAmount: parseFloat(cardForm.limitAmount),
      dueDay, closingDay,
      color: cardForm.color,
      isActive: true,
    }
    if (editingId) await updateCreditCard(payload)
    else await addCreditCard(payload)
    setShowCardForm(false); setEditingId(null); setCardForm(emptyCardForm)
  }

  // ── Registrar compra no cartão ──────────────────
  async function savePurchase(cardId: string) {
    const errs: Record<string, string> = {}
    if (!purchaseForm.description.trim()) errs.description = "Descrição é obrigatória"
    if (!purchaseForm.amount || parseFloat(purchaseForm.amount) <= 0) errs.amount = "Valor deve ser maior que zero"
    if (!purchaseForm.categoryId) errs.categoryId = "Selecione uma categoria"
    if (Object.keys(errs).length > 0) { setPurchaseErrors(errs); return }

    const total = parseFloat(purchaseForm.amount)
    const installments = parseInt(purchaseForm.installments) || 1
    const installmentAmount = total / installments

    for (let i = 1; i <= installments; i++) {
      const baseDate = new Date(purchaseForm.date)
      baseDate.setMonth(baseDate.getMonth() + (i - 1))
      const scheduledDate = baseDate.toISOString().split("T")[0]

      await addScheduledTransaction({
        id: "",
        description: installments > 1 ? `${purchaseForm.description} (${i}/${installments})` : purchaseForm.description,
        amount: Math.round(installmentAmount * 100) / 100,
        type: "expense",
        categoryId: purchaseForm.categoryId,
        scheduledDate,
        isCompleted: false,
        creditCardId: cardId,
        totalInstallments: installments > 1 ? installments : undefined,
        installmentNumber: installments > 1 ? i : undefined,
      })
    }

    toast.success(installments > 1 ? `${installments}x de ${formatCurrency(installmentAmount)} registradas!` : "Compra registrada!")
    setShowPurchaseForm(null)
    setPurchaseForm({ description: "", amount: "", categoryId: "", date: new Date().toISOString().split("T")[0], installments: "1" })
    setPurchaseErrors({})
  }

  // ── Pagar fatura ────────────────────────────────
  async function payInvoice(cardId: string) {
    const cd = cardData.find(d => d.card.id === cardId)
    if (!cd || cd.purchases.length === 0) return

    // Cria transação de despesa para cada compra
    for (const purchase of cd.purchases) {
      await addTransaction({
        id: generateId(),
        description: purchase.description,
        amount: purchase.amount,
        type: "expense",
        categoryId: purchase.categoryId,
        date: new Date().toISOString().split("T")[0],
        notes: `Fatura ${cd.card.name}`,
      })
      // Marca como concluído
      await updateScheduledTransaction({ ...purchase, isCompleted: true })
    }

    toast.success(`Fatura de ${cd.card.name} paga! ${cd.purchases.length} lançamento(s) registrado(s).`)
    setPayingCard(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie suas compras e faturas</p>
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
          <p className="text-sm text-muted-foreground mt-1">Adicione seus cartões para controlar os gastos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cardData.map(({ card, purchases, invoiceTotal, daysToClose, daysToDue, status }) => (
            <div key={card.id} className={`bg-card border rounded-xl shadow-sm overflow-hidden ${
              status === "due" ? "border-red-300 dark:border-red-800" :
              status === "closing" ? "border-amber-300 dark:border-amber-800" : "border-border"
            }`}>
              {/* Header do cartão */}
              <div className="p-5" style={{ background: `linear-gradient(135deg, ${card.color}22, ${card.color}11)` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: card.color }}>
                      <CardIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === "due" && <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Vence em {daysToDue}d</span>}
                    {status === "closing" && <span className="flex items-center gap-1 text-xs text-amber-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Fecha em {daysToClose}d</span>}
                    <button onClick={() => { setEditingId(card.id); setCardForm({ name: card.name, limitAmount: card.limitAmount.toString(), dueDay: card.dueDay.toString(), color: card.color }); setShowCardForm(true) }}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteId(card.id)}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Fatura */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Fatura atual</p>
                    <p className="text-3xl font-bold">{formatCurrency(invoiceTotal)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{purchases.length} compra{purchases.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Limite: {formatCurrency(card.limitAmount)}</p>
                    <p>Disponível: {formatCurrency(Math.max(0, card.limitAmount - invoiceTotal))}</p>
                  </div>
                </div>

                {/* Barra de uso do limite */}
                {card.limitAmount > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-black/20 rounded-full h-1.5">
                      <div className="h-full rounded-full bg-white/80 transition-all"
                        style={{ width: `${Math.min((invoiceTotal / card.limitAmount) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="px-5 py-3 border-t border-border flex gap-2">
                <button onClick={() => setShowPurchaseForm(card.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                  <ShoppingCart className="h-4 w-4" /> Registrar Compra
                </button>
                {purchases.length > 0 && (
                  <button onClick={() => setPayingCard(card.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                    <Receipt className="h-4 w-4" /> Pagar Fatura
                  </button>
                )}
                <button onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                  className="px-3 py-2 bg-secondary rounded-lg text-sm hover:bg-secondary/80 transition-colors">
                  {expandedCard === card.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Lista de compras expandida */}
              {expandedCard === card.id && (
                <div className="px-5 pb-4 space-y-2">
                  {purchases.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma compra registrada nesta fatura</p>
                  ) : purchases.map(purchase => (
                    <div key={purchase.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{purchase.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(purchase.scheduledDate + "T00:00:00").toLocaleDateString("pt-BR")}
                          {purchase.totalInstallments && ` • ${purchase.installmentNumber}/${purchase.totalInstallments}x`}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-red-500">-{formatCurrency(purchase.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de compra */}
      {showPurchaseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Registrar Compra</h3>
              <button onClick={() => setShowPurchaseForm(null)} className="p-1.5 hover:bg-secondary rounded-lg">
                <X className="h-4 w-4" />
              </button>
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
                <input value={purchaseForm.amount} onChange={e => { setPurchaseForm(p => ({ ...p, amount: e.target.value })); setPurchaseErrors(p => ({ ...p, amount: "" })) }}
                  placeholder="0,00" type="number" min="0" step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${purchaseErrors.amount ? "border-red-400" : "border-border"}`} />
                {purchaseErrors.amount && <p className="text-xs text-red-500 mt-1">{purchaseErrors.amount}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Parcelas</label>
                <select value={purchaseForm.installments} onChange={e => setPurchaseForm(p => ({ ...p, installments: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x{n > 1 && purchaseForm.amount ? ` de ${formatCurrency(parseFloat(purchaseForm.amount || "0") / n)}` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <select value={purchaseForm.categoryId} onChange={e => { setPurchaseForm(p => ({ ...p, categoryId: e.target.value })); setPurchaseErrors(p => ({ ...p, categoryId: "" })) }}
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
              <div className="p-3 bg-primary/5 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  {purchaseForm.installments}x de <strong>{formatCurrency(parseFloat(purchaseForm.amount) / parseInt(purchaseForm.installments))}</strong>
                  {" "}= Total {formatCurrency(parseFloat(purchaseForm.amount))}
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPurchaseForm(null)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={() => savePurchase(showPurchaseForm)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de pagar fatura */}
      {payingCard && (() => {
        const cd = cardData.find(d => d.card.id === payingCard)
        if (!cd) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Pagar Fatura</h3>
                <button onClick={() => setPayingCard(null)} className="p-1.5 hover:bg-secondary rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 bg-secondary/50 rounded-xl">
                <p className="text-sm text-muted-foreground">{cd.card.name}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(cd.invoiceTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">{cd.purchases.length} compra(s) serão lançadas como despesa</p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cd.purchases.map(p => (
                  <div key={p.id} className="flex justify-between text-sm p-2 bg-secondary/30 rounded-lg">
                    <span className="truncate">{p.description}</span>
                    <span className="font-medium shrink-0 ml-2">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Ao confirmar, todas as compras serão registradas como transações de despesa na data de hoje.</p>
              <div className="flex gap-3">
                <button onClick={() => setPayingCard(null)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">Cancelar</button>
                <button onClick={() => payInvoice(payingCard)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  <CheckCircle className="h-4 w-4 inline mr-2" />Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal de formulário do cartão */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-lg">{editingId ? "Editar" : "Novo"} Cartão</h3>
            <div>
              <label className="text-sm font-medium mb-1 block">Nome do cartão</label>
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
                <label className="text-sm font-medium mb-1 block">Dia de vencimento</label>
                <input value={cardForm.dueDay} onChange={e => setCardForm(p => ({ ...p, dueDay: e.target.value }))}
                  placeholder="10" type="number" min="1" max="31"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {cardForm.dueDay && <p className="text-xs text-muted-foreground mt-1">Fecha dia {parseInt(cardForm.dueDay) - 7 <= 0 ? parseInt(cardForm.dueDay) - 7 + 30 : parseInt(cardForm.dueDay) - 7}</p>}
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
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowCardForm(false); setEditingId(null); setCardForm(emptyCardForm) }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={saveCard}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {editingId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir cartão?"
        description="O cartão e todas as compras vinculadas serão removidos."
        onConfirm={() => { deleteId && deleteCreditCard(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}