import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { code } = await req.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  if (code !== process.env.CONSULTANT_ACCESS_CODE) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 })
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, role: "consultant", email: user.email, name: user.user_metadata?.full_name })

  if (error) return NextResponse.json({ error: "Erro ao ativar" }, { status: 500 })
  return NextResponse.json({ success: true })
}