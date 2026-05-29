"use client"

import { createClient } from "@/lib/supabase/client"
import { Wallet } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import Link from "next/link"

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [accepted, setAccepted] = useState(false)
  const [showError, setShowError] = useState(false)

  async function handleGoogleLogin() {
    if (!accepted) {
      setShowError(true)
      return
    }
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-primary rounded-2xl mb-4">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">FinaceBit</h1>
          <p className="text-muted-foreground mt-1 text-center">
            Gestão financeira pessoal
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Bem-vindo!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Faça login para acessar suas finanças de qualquer dispositivo.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              Ocorreu um erro ao fazer login. Tente novamente.
            </div>
          )}

          {/* Aceite dos termos */}
          <div
            className={`mb-5 p-3 rounded-xl border transition-colors cursor-pointer ${
              accepted
                ? "bg-primary/5 border-primary/30"
                : showError
                ? "bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700"
                : "bg-secondary/50 border-border"
            }`}
            onClick={() => { setAccepted(!accepted); setShowError(false) }}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${
                accepted ? "bg-primary border-primary" : "border-muted-foreground"
              }`}>
                {accepted && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm leading-relaxed select-none">
                Li e concordo com os{" "}
                <Link
                  href="/FinaceBit_Termos_de_Uso.pdf" target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-primary hover:underline font-medium"
                >
                  Termos de Uso
                </Link>
                {" "}e a{" "}
                <Link
                  href="/FinaceBit_Politica_de_Privacidade.pdf" target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-primary hover:underline font-medium"
                >
                  Política de Privacidade
                </Link>
                , incluindo o tratamento dos meus dados conforme a LGPD.
              </span>
            </label>
          </div>

          {showError && !accepted && (
            <p className="text-xs text-red-500 mb-4 -mt-3">
              Você precisa aceitar os termos para continuar.
            </p>
          )}

          <button
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-xl font-medium transition-colors shadow-sm ${
              accepted
                ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                : "bg-white/50 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill={accepted ? "#4285F4" : "#9CA3AF"}/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={accepted ? "#34A853" : "#9CA3AF"}/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill={accepted ? "#FBBC05" : "#9CA3AF"}/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill={accepted ? "#EA4335" : "#9CA3AF"}/>
            </svg>
            Continuar com Google
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Seus dados ficam salvos com segurança na nuvem.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}