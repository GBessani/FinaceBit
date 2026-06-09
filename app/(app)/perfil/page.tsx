"use client"

import { useConsultant } from "@/contexts/consultant-context"
import { useFinance } from "@/contexts/finance-context"
import { useRouter } from "next/navigation"
import {
  User, Mail, Calendar, LogOut, Shield, Trash2,
  ChevronRight, ExternalLink, Camera, Loader2, Wallet, Pencil, Check, X as XIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

export default function PerfilPage() {
  const { user, data, signOut, initialBalance, setInitialBalance } = useFinance()
  const { isConsultant, myConsultant, revokeConsultant } = useConsultant()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [consultantCode, setConsultantCode] = useState("")
  const [activatingCode, setActivatingCode] = useState(false)
  const [codeActivated, setCodeActivated] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState("")
  const [customAvatar, setCustomAvatar] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Carrega avatar customizado do perfil
  useEffect(() => {
    if (!user) return
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setCustomAvatar(data.avatar_url)
      })
  }, [user, supabase])

  const avatarUrl = customAvatar || user?.user_metadata?.avatar_url || null

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—"

  const totalTransactions = data.transactions.length
  const totalIncome = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpenses = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

  async function activateConsultantCode() {
    if (!consultantCode) return
    setActivatingCode(true)
    try {
      const res = await fetch("/api/consultant/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: consultantCode }),
      })
      const data = await res.json()
      if (data.success) {
        setCodeActivated(true)
        toast.success("Você agora é um consultor! Recarregue a página.")
      } else {
        toast.error(data.error || "Código inválido")
      }
    } catch { toast.error("Erro ao ativar código") }
    setActivatingCode(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Valida tamanho (max 2MB) e tipo
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida")
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split(".").pop()
      const path = `${user.id}/avatar.${ext}`

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      // Pega a URL pública
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path)

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Salva no profile
      await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: publicUrl,
      })

      setCustomAvatar(publicUrl)
      toast.success("Foto atualizada!")
    } catch (err) {
      console.error("Avatar upload error:", err)
      toast.error("Erro ao fazer upload. Tente novamente.")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return
    setUploading(true)
    try {
      await supabase.from("profiles").upsert({ id: user.id, avatar_url: null })
      setCustomAvatar(null)
      toast.success("Foto removida!")
    } catch {
      toast.error("Erro ao remover foto.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  async function handleDeleteAccount() {
    toast.error("Para excluir sua conta, entre em contato: suporte@finacebit.com")
    setShowDeleteConfirm(false)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">Suas informações pessoais</p>
      </div>

      {/* Avatar + Info */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-5">
          {/* Avatar com botão de upload */}
          <div className="relative shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-20 w-20 rounded-full ring-4 ring-primary/20 object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground ring-4 ring-primary/20">
                {(user.user_metadata?.full_name ?? user.email ?? "U")[0].toUpperCase()}
              </div>
            )}

            {/* Botão câmera */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">
              {user.user_metadata?.full_name ?? "Usuário"}
            </h2>
            <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
              <Shield className="h-3 w-3" />
              Google OAuth
            </span>
          </div>
        </div>

        {/* Opções de foto */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {customAvatar ? "Trocar foto" : "Adicionar foto"}
          </button>
          {customAvatar && (
            <button
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="px-3 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm disabled:opacity-50"
            >
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">JPG, PNG ou GIF — máximo 2MB</p>
      </div>

      {/* Informações */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</p>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{user.user_metadata?.full_name ?? "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="font-medium truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Membro desde</p>
              <p className="font-medium">{createdAt}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resumo da conta</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="p-3 text-center">
            <p className="text-xl font-bold">{totalTransactions}</p>
            <p className="text-xs text-muted-foreground mt-1">Transações</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate px-1">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Receitas</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-sm font-bold text-red-600 dark:text-red-400 truncate px-1">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Despesas</p>
          </div>
        </div>
      </div>

      {/* Saldo Inicial */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saldo Inicial</p>
          {!editingBalance && (
            <button
              onClick={() => { setBalanceInput(initialBalance.toString()); setEditingBalance(true) }}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {editingBalance ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Valor em R$</label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceInput}
                  onChange={e => setBalanceInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={async () => {
                    await setInitialBalance(parseFloat(balanceInput) || 0)
                    setEditingBalance(false)
                    toast.success("Saldo inicial salvo!")
                  }}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingBalance(false)}
                  className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo antes de usar o FinaceBit</p>
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(initialBalance)}
                </p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Este valor é somado ao seu saldo total no dashboard, representando o dinheiro que você já tinha antes de começar a usar o FinaceBit.
          </p>
        </div>
      </div>

      {/* Consultor vinculado */}
      {myConsultant && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold">Consultor vinculado</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{myConsultant.name || myConsultant.email}</p>
              <p className="text-sm text-muted-foreground">{myConsultant.email}</p>
            </div>
            <button onClick={revokeConsultant}
              className="px-3 py-1.5 text-sm text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Revogar acesso
            </button>
          </div>
        </div>
      )}

      {!isConsultant && !codeActivated && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold">Código de consultor</h2>
          <p className="text-sm text-muted-foreground">Possui um código de acesso de consultor? Insira abaixo para ativar.</p>
          <div className="flex gap-3">
            <input value={consultantCode} onChange={e => setConsultantCode(e.target.value)}
              placeholder="Código de acesso"
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={activateConsultantCode} disabled={activatingCode || !consultantCode}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm">
              {activatingCode ? "Ativando..." : "Ativar"}
            </button>
          </div>
        </div>
      )}

      {isConsultant && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
          <p className="text-emerald-700 dark:text-emerald-400 font-medium">✅ Você é um consultor financeiro</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">Acesse "Meus Clientes" no menu para gerenciar seus clientes.</p>
        </div>
      )}

      {/* Ações */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conta</p>
        </div>
        <div className="divide-y divide-border">
          <a
            href="https://myaccount.google.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="p-2 bg-secondary rounded-lg">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Gerenciar conta Google</p>
              <p className="text-xs text-muted-foreground">Altere nome pelo Google</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="p-2 bg-secondary rounded-lg">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Sair da conta</p>
              <p className="text-xs text-muted-foreground">Encerrar sessão atual</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-red-600 dark:text-red-400">Excluir conta</p>
              <p className="text-xs text-muted-foreground">Remover todos os dados permanentemente</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Modal confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Excluir conta?</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}