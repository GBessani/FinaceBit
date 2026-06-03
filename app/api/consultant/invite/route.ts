import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
  const { clientEmail } = await req.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "consultant") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const token = randomUUID()
  const { error } = await supabase.from("consultant_clients").insert({
    consultant_id: user.id,
    client_email: clientEmail,
    status: "pending",
    invite_token: token,
  })

  if (error) return NextResponse.json({ error: "Erro ao criar convite" }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://finace-bit.vercel.app"}/convite/${token}`
  return NextResponse.json({ success: true, inviteUrl, token })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  const supabase = await createClient()

  const { data } = await supabase
    .from("consultant_clients")
    .select("*, profiles!consultant_id(name, email)")
    .eq("invite_token", token)
    .single()

  if (!data) return NextResponse.json({ error: "Convite inválido" }, { status: 404 })
  return NextResponse.json(data)
}