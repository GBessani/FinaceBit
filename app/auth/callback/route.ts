import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"
  // O Supabase envia ?type=recovery no link de redefinição de senha.
  const type = searchParams.get("type")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Fluxo de recuperação de senha: a sessão criada é temporária e serve
      // apenas para o usuário definir a nova senha. Mandamos para a página
      // dedicada em vez de entrar direto no app.
      if (type === "recovery" || next === "/redefinir-senha") {
        return NextResponse.redirect(`${origin}/redefinir-senha`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Erro → volta pro login com mensagem
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}