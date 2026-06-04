import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 })

  const admin = getAdmin()

  const { data, error } = await admin
    .from("consultant_clients")
    .select("id, status, client_email, consultant_id")
    .eq("invite_token", token)
    .single()

  if (error || !data) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 })
  if (data.status !== "pending") return NextResponse.json({ error: "Este convite já foi utilizado" }, { status: 410 })

  const { data: consultorProfile } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", data.consultant_id)
    .single()

  return NextResponse.json({
    ...data,
    consultorName: consultorProfile?.name || consultorProfile?.email || "Consultor",
    consultorEmail: consultorProfile?.email || "",
  })
}

export async function PATCH(req: Request) {
  const { token, accept, userId, userEmail, userName } = await req.json()
  if (!token || !userId) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const admin = getAdmin()

  // Verifica se o convite existe e está pendente
  const { data: invite } = await admin
    .from("consultant_clients")
    .select("id, status, client_email")
    .eq("invite_token", token)
    .single()

  if (!invite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
  if (invite.status !== "pending") return NextResponse.json({ error: "Convite já utilizado" }, { status: 410 })

  // Atualiza o convite
  await admin.from("consultant_clients").update({
    status: accept ? "active" : "rejected",
    client_id: userId,
    accepted_at: accept ? new Date().toISOString() : null,
  }).eq("invite_token", token)

  // Cria/atualiza perfil do cliente
  await admin.from("profiles").upsert({
    id: userId,
    email: userEmail,
    name: userName,
    role: "user",
  }, { onConflict: "id" })

  return NextResponse.json({ success: true })
}