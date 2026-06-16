"use client"

import { createClient } from "@/lib/supabase/client"
import { Wallet, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ password: "", confirm: "" })
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null)

  // Ao chegar pelo link de recuperação, o Supabase cria uma sessão temporária
  // (evento PASSWORD_RECOVERY). Só permitimos redefinir se essa sessão existir.
  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidSession(true)
        setChecking(false)
      }
    })

    // Fallback: se a sessão já foi estabelecida antes do listener montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) setValidSession(true)
      setChecking(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    if (form.password.length < 6) {
      setFeedback({ type: "error", message: "A senha deve ter no mínimo 6 caracteres." })
      return
    }
    if (form.password !== form.confirm) {
      setFeedback({ type: "error", message: "As senhas não coincidem." })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    if (error) {
      setFeedback({ type: "error", message: error.message })
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    // Pequena pausa para o usuário ler a confirmação, depois manda pro app
    setTimeout(() => router.push("/"), 2000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary rounded-2xl mb-4">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">FinaceBit</h1>
          <p className="text-muted-foreground mt-1 text-center">Gestão financeira pessoal</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Nova senha</h2>
          <p className="text-sm text-muted-foreground mb-6">Defina uma nova senha para sua conta.</p>

          {checking ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Validando link...
            </div>
          ) : done ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-medium">Senha redefinida!</p>
              <p className="text-sm text-muted-foreground">Redirecionando para o app...</p>
            </div>
          ) : !validSession ? (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                Link inválido ou expirado. Solicite um novo link de recuperação.
              </div>
              <button onClick={() => router.push("/login")}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors">
                Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {feedback && (
                <div className={`p-3 rounded-lg text-sm ${feedback.type === "error" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"}`}>
                  {feedback.message}
                </div>
              )}

              {/* Nova senha */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nova senha</label>
                <div className="relative">
                  <input value={form.password} onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setFeedback(null) }}
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres" required
                    className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirmar nova senha</label>
                <div className="relative">
                  <input value={form.confirm} onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); setFeedback(null) }}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a senha" required
                    className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
