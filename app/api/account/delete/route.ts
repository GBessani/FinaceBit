import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: "Exclusão automática não disponível. Contate: suporte@finacebit.com" },
      { status: 503 }
    )
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: "Erro ao excluir conta. Tente novamente." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
