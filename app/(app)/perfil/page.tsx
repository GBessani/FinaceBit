"use client"

import { useFinance } from "@/contexts/finance-context"
import { useRouter } from "next/navigation"
import {
  User, Mail, Calendar, LogOut, Shield, Trash2,
  ChevronRight, ExternalLink,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

export default function PerfilPage() {
  const { user, data, signOut } = useFinance()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const supabase = createClient()

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—"

  const totalTransactions = data.transactions.length
  const totalIncome = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpenses = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

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
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">Suas informações pessoais</p>
      </div>

      {/* Avatar + Info */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-5">
          {user.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="h-20 w-20 rounded-full ring-4 ring-primary/20"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground ring-4 ring-primary/20">
              {(user.user_metadata?.full_name ?? user.email ?? "U")[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">
              {user.user_metadata?.full_name ?? "Usuário"}
            </h2>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
              <Shield className="h-3 w-3" />
              Google OAuth
            </span>
          </div>
        </div>
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
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="font-medium">{user.email}</p>
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
          <div className="p-4 text-center">
            <p className="text-2xl font-bold">{totalTransactions}</p>
            <p className="text-xs text-muted-foreground mt-1">Transações</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Receitas</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Despesas</p>
          </div>
        </div>
      </div>

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
              <p className="text-xs text-muted-foreground">Altere foto e nome pelo Google</p>
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
