"use client"

import * as React from "react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { useFinance } from "@/contexts/finance-context"
import { ScheduledTransaction } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CategoryIcon } from "@/components/category-icon"
import { formatCurrency } from "@/lib/utils"
import { format, differenceInDays, parseISO, isAfter, isBefore, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Plus, Trash2, Edit, CalendarClock, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export function ScheduledList() {
  const {
    data,
    addScheduledTransaction,
    updateScheduledTransaction,
    deleteScheduledTransaction,
    addTransaction,
    getCategory,
  } = useFinance()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = React.useState<ScheduledTransaction | null>(null)
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [type, setType] = React.useState<"income" | "expense">("expense")
  const [categoryId, setCategoryId] = React.useState("")
  const [scheduledDate, setScheduledDate] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isInstallment, setIsInstallment] = React.useState(false)
  const [totalInstallments, setTotalInstallments] = React.useState("2")
  const [totalAmount, setTotalAmount] = React.useState("")

  const filteredCategories = data.categories.filter((c) => c.type === type)

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setType("expense")
    setCategoryId("")
    setScheduledDate("")
    setNotes("")
    setIsInstallment(false)
    setTotalInstallments("2")
    setTotalAmount("")
    setEditingTransaction(null)
  }

  const handleOpenDialog = (transaction?: ScheduledTransaction) => {
    if (transaction) {
      setEditingTransaction(transaction)
      setDescription(transaction.description)
      setAmount(transaction.amount.toString())
      setType(transaction.type)
      setCategoryId(transaction.categoryId)
      setScheduledDate(transaction.scheduledDate)
      setNotes(transaction.notes || "")
    } else {
      resetForm()
      setScheduledDate(new Date().toISOString().split("T")[0])
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalAmount = isInstallment && totalAmount && totalInstallments
      ? parseFloat(totalAmount) / parseInt(totalInstallments)
      : parseFloat(amount)
    if (!description || !finalAmount || !categoryId || !scheduledDate) return

    if (editingTransaction) {
      updateScheduledTransaction({
        ...editingTransaction,
        description,
        amount: finalAmount,
        type,
        categoryId,
        scheduledDate,
        notes: notes || undefined,
      })
    } else if (isInstallment && totalInstallments) {
      const total = parseInt(totalInstallments)
      for (let i = 0; i < total; i++) {
        const date = new Date(scheduledDate)
        date.setMonth(date.getMonth() + i)
        await addScheduledTransaction({
          id: "",
          description: `${description} (${i + 1}/${total})`,
          amount: finalAmount,
          type,
          categoryId,
          scheduledDate: date.toISOString().split("T")[0],
          isCompleted: false,
          notes: notes || undefined,
        })
      }
    } else {
      addScheduledTransaction({
        id: "",
        description,
        amount: finalAmount,
        type,
        categoryId,
        scheduledDate,
        isCompleted: false,
        notes: notes || undefined,
      })
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const markAsCompleted = (transaction: ScheduledTransaction) => {
    // Adiciona como transação real
    addTransaction({
      id: crypto.randomUUID(),
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      date: transaction.scheduledDate,
      notes: transaction.notes,
    })
    // Marca como completado
    updateScheduledTransaction({ ...transaction, isCompleted: true })
  }

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  const pendingTransactions = data.scheduledTransactions
    .filter((t) => !t.isCompleted)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  const completedTransactions = data.scheduledTransactions
    .filter((t) => t.isCompleted)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, 10)

  const overdueTransactions = pendingTransactions.filter(
    (t) => isBefore(parseISO(t.scheduledDate), today) && !isToday(parseISO(t.scheduledDate))
  )
  const todayTransactions = pendingTransactions.filter((t) => isToday(parseISO(t.scheduledDate)))
  const upcomingTransactions = pendingTransactions.filter((t) => isAfter(parseISO(t.scheduledDate), today))

  const totalPendingExpenses = pendingTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)
  const totalPendingIncomes = pendingTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const getStatusBadge = (scheduledDate: string) => {
    const date = parseISO(scheduledDate)
    const diff = differenceInDays(date, today)

    if (isToday(date)) {
      return <Badge variant="default" className="bg-warning text-warning-foreground">Hoje</Badge>
    }
    if (diff < 0) {
      return <Badge variant="destructive">Atrasado</Badge>
    }
    if (diff <= 7) {
      return <Badge variant="outline">Em {diff} dias</Badge>
    }
    return null
  }

  const TransactionCard = ({ transaction, showActions = true }: { transaction: ScheduledTransaction; showActions?: boolean }) => {
    const category = getCategory(transaction.categoryId)
    return (
      <Card key={transaction.id} className={transaction.isCompleted ? "opacity-60" : ""}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            {category && (
              <CategoryIcon icon={category.icon} color={category.color} />
            )}
            <div>
              <p className="font-medium">{transaction.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {format(parseISO(transaction.scheduledDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
                {!transaction.isCompleted && getStatusBadge(transaction.scheduledDate)}
                {transaction.isCompleted && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Concluído
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className={`font-semibold ${transaction.type === "expense" ? "text-destructive" : "text-primary"}`}>
              {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
            </p>
            {showActions && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => markAsCompleted(transaction)}
                  title="Marcar como realizado"
                  className="text-primary hover:text-primary"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(transaction)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(transaction.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lançamentos Futuros</h2>
          <p className="text-muted-foreground">Agende receitas e despesas para datas futuras</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Editar Lançamento" : "Novo Lançamento Futuro"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v: "income" | "expense") => {
                  setType(v)
                  setCategoryId("")
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pagamento do seguro, Bônus..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isInstallment ? "Valor Total" : "Valor"}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={isInstallment ? totalAmount : amount}
                    onChange={(e) => isInstallment ? setTotalAmount(e.target.value) : setAmount(e.target.value)}
                    placeholder="0,00"
                  />
                  {isInstallment && totalAmount && totalInstallments && (
                    <p className="text-xs text-muted-foreground">
                      {parseInt(totalInstallments)}x de {(parseFloat(totalAmount) / parseInt(totalInstallments)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Data da 1ª parcela</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={cat.icon} color={cat.color} size={14} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione notas..."
                />
              </div>

              {!editingTransaction && (
                <div className="space-y-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer">Parcelar?</Label>
                    <Switch
                      checked={isInstallment}
                      onCheckedChange={(checked) => {
                        setIsInstallment(checked)
                        if (checked && amount) setTotalAmount(amount)
                        if (!checked && totalAmount) setAmount(totalAmount)
                      }}
                    />
                  </div>
                  {isInstallment && (
                    <div className="space-y-2">
                      <Label>Número de parcelas</Label>
                      <Input
                        type="number"
                        min="2"
                        max="360"
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full">
                {editingTransaction ? "Salvar Alterações" : isInstallment ? `Parcelar em ${totalInstallments}x` : "Agendar Lançamento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totalPendingExpenses)}
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingTransactions.filter(t => t.type === "expense").length} lançamentos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalPendingIncomes)}
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingTransactions.filter(t => t.type === "income").length} lançamentos
            </p>
          </CardContent>
        </Card>
      </div>

      {pendingTransactions.length === 0 && completedTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum lançamento futuro agendado.
              <br />
              Agende receitas e despesas para controlar melhor suas finanças.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {overdueTransactions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-lg text-destructive">Atrasados</h3>
              </div>
              <div className="space-y-2">
                {overdueTransactions.map((t) => (
                  <TransactionCard key={t.id} transaction={t} />
                ))}
              </div>
            </div>
          )}

          {todayTransactions.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 text-warning">Hoje</h3>
              <div className="space-y-2">
                {todayTransactions.map((t) => (
                  <TransactionCard key={t.id} transaction={t} />
                ))}
              </div>
            </div>
          )}

          {upcomingTransactions.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Próximos</h3>
              <div className="space-y-2">
                {upcomingTransactions.map((t) => (
                  <TransactionCard key={t.id} transaction={t} />
                ))}
              </div>
            </div>
          )}

          {completedTransactions.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 text-muted-foreground">Concluídos Recentemente</h3>
              <div className="space-y-2">
                {completedTransactions.map((t) => (
                  <TransactionCard key={t.id} transaction={t} showActions={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    <DeleteConfirm
      isOpen={!!deleteId}
      title="Excluir lançamento?"
      description="O lançamento será removido permanentemente."
      onConfirm={() => { deleteId && deleteScheduledTransaction(deleteId); setDeleteId(null) }}
      onCancel={() => setDeleteId(null)}
    />
    </div>
  )
}
