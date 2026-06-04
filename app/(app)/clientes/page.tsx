"use client"

import { useConsultant } from "@/contexts/consultant-context"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Users, Mail, Copy, CheckCircle, Clock, XCircle, UserCheck, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ClientesPage() {
  const { isConsultant, clients, setActiveClient, refreshClients } = useConsultant()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState("")

  if (!isConsultant) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="text-muted-foreground text-sm">Esta página é exclusiva para consultores.</p>
        </div>
      </div>
    )
  }

  async function cancelInvite(token: string) {
    const supabase = (await import("@/lib/supabase/client")).createClient()
    await supabase.from("consultant_clients").delete().eq("invite_token", token)
    toast.success("Convite cancelado!")
    await refreshClients()
  }

  async function sendInvite() {
    if (!email) return
    setInviting(true)
    try {
      const res = await fetch("/api/consultant/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail: email }),
      })
      const data = await res.json()
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl)
        toast.success("Convite gerado!")
        setEmail("")
        await refreshClients()
      } else {
        toast.error(data.error || "Erro ao gerar convite")
      }
    } catch {
      toast.error("Erro ao enviar convite")
    }
    setInviting(false)
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl)
    toast.success("Link copiado!")
  }

  function openClient(clientId: string, clientName: string) {
    setActiveClient(clientId, clientName)
    router.push("/")
  }

  const activeClients = clients.filter(c => c.status === "active")
  const pendingClients = clients.filter(c => c.status === "pending")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Clientes</h1>
        <p className="text-muted-foreground">Gerencie seus clientes de consultoria</p>
      </div>

      {/* Convidar cliente */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold">Convidar novo cliente</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@cliente.com" type="email"
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              onKeyDown={e => e.key === "Enter" && sendInvite()}
            />
          </div>
          <button onClick={sendInvite} disabled={inviting || !email}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Convidar
          </button>
        </div>

        {inviteUrl && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 flex-1 truncate">{inviteUrl}</p>
            <button onClick={copyInvite} className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors">
              <Copy className="h-4 w-4 text-emerald-600" />
            </button>
          </div>
        )}
      </div>

      {/* Clientes ativos */}
      {activeClients.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Clientes ativos ({activeClients.length})</h2>
          {activeClients.map(client => (
            <div key={client.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{(client.name || client.email)[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" /> Ativo
                </span>
                <button onClick={() => openClient(client.id, client.name)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
                  Ver sistema <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convites pendentes */}
      {pendingClients.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Convites pendentes ({pendingClients.length})</h2>
          {pendingClients.map((client, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">{client.email}</p>
                  <p className="text-xs text-muted-foreground">Aguardando aceite</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Pendente
                </span>
                <button onClick={() => client.inviteToken && cancelInvite(client.inviteToken)}
                  className="text-xs text-red-500 px-2 py-1 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeClients.length === 0 && pendingClients.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum cliente ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Convide clientes pelo e-mail acima</p>
        </div>
      )}
    </div>
  )
}