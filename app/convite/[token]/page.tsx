"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Wallet, CheckCircle, XCircle, Loader2, UserCheck } from "lucide-react"
import Link from "next/link"

export default function ConvitePage() {
  const { token } = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const res = await fetch(`/api/consultant/invite?token=${token}`)
      if (res.ok) setInvite(await res.json())
      setLoading(false)
    }
    load()
  }, [token])

  async function respond(accept: boolean) {
    setAccepting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    await supabase.from("consultant_clients")
      .update({
        status: accept ? "active" : "rejected",
        client_id: user.id,
        accepted_at: accept ? new Date().toISOString() : null,
      })
      .eq("invite_token", token)

    // Cria perfil se não existir
    await supabase.from("profiles").upsert({
      id: user.id, email: user.email, name: user.user_metadata?.full_name, role: "user"
    })

    setDone(accept ? "accepted" : "rejected")
    setAccepting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  if (!invite) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h1 className="text-xl font-bold">Convite inválido ou expirado</h1>
        <Link href="/login" className="text-primary hover:underline text-sm">Ir para o login</Link>
      </div>
    </div>
  )

  const consultantName = invite.consultorName || "Um consultor financeiro"

  if (done === "accepted") return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold">Convite aceito!</h1>
        <p className="text-muted-foreground">{consultantName} agora tem acesso ao seu FinaceBit para te ajudar.</p>
        <Link href="/" className="block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  )

  if (done === "rejected") return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <XCircle className="h-16 w-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold">Convite recusado</h1>
        <p className="text-muted-foreground">Você pode aceitar o convite depois se mudar de ideia.</p>
        <Link href="/" className="block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium">
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="p-3 bg-primary rounded-2xl inline-block mb-4">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">FinaceBit</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Convite de consultor</p>
              <p className="text-sm text-muted-foreground">{consultantName}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong>{consultantName}</strong> quer acesso ao seu FinaceBit para oferecer consultoria financeira personalizada.
            Se aceitar, ele poderá visualizar e editar seus dados financeiros.
          </p>

          {!user && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
              Você precisa estar logado para aceitar o convite.
              <Link href={`/login?redirect=/convite/${token}`} className="block mt-1 font-medium hover:underline">
                Fazer login →
              </Link>
            </div>
          )}

          {user && (
            <div className="flex gap-3">
              <button onClick={() => respond(false)} disabled={accepting}
                className="flex-1 px-4 py-3 border border-border rounded-xl font-medium hover:bg-secondary transition-colors">
                Recusar
              </button>
              <button onClick={() => respond(true)} disabled={accepting}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Aceitar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}