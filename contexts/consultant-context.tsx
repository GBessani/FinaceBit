"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

interface ConsultantContextType {
  isConsultant: boolean
  activeClientId: string | null
  activeClientName: string | null
  setActiveClient: (id: string | null, name: string | null) => void
  clients: { id: string; name: string; email: string; status: string }[]
  role: "user" | "consultant"
  myConsultant: { name: string; email: string } | null
  revokeConsultant: () => Promise<void>
  refreshClients: () => Promise<void>
}

const ConsultantContext = createContext<ConsultantContextType>({
  isConsultant: false,
  activeClientId: null,
  activeClientName: null,
  setActiveClient: () => {},
  clients: [],
  role: "user",
  myConsultant: null,
  revokeConsultant: async () => {},
  refreshClients: async () => {},
})

export function ConsultantProvider({ children, user }: { children: React.ReactNode; user: User | null }) {
  const [role, setRole] = useState<"user" | "consultant">("user")
  const [clients, setClients] = useState<any[]>([])
  const [myConsultant, setMyConsultant] = useState<any>(null)
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
  const [activeClientName, setActiveClientName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user) loadProfile()
  }, [user])

  async function loadProfile() {
    if (!user) return

    // Busca perfil
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    const userRole = profile?.role || "user"
    setRole(userRole)

    if (userRole === "consultant") {
      await loadClients()
    } else {
      await loadMyConsultant()
    }
  }

  async function loadClients() {
    const { data } = await supabase
      .from("consultant_clients")
      .select("id, client_id, client_email, status")
      .eq("consultant_id", user!.id)

    setClients((data || []).map((d: any) => ({
      id: d.client_id || d.id,
      name: d.client_email || "Cliente",
      email: d.client_email || "",
      status: d.status,
    })))
  }

  async function loadMyConsultant() {
    const { data } = await supabase
      .from("consultant_clients")
      .select("status, profiles!consultant_id(name, email)")
      .eq("client_id", user!.id)
      .eq("status", "active")
      .single()

    if (data) {
      const profile: any = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
      if (profile) setMyConsultant({ name: profile.name, email: profile.email })
    }
  }

  async function revokeConsultant() {
    await supabase
      .from("consultant_clients")
      .update({ status: "revoked" })
      .eq("client_id", user!.id)
      .eq("status", "active")
    setMyConsultant(null)
  }

  function setActiveClient(id: string | null, name: string | null) {
    setActiveClientId(id)
    setActiveClientName(name)
  }

  return (
    <ConsultantContext.Provider value={{
      isConsultant: role === "consultant",
      activeClientId, activeClientName, setActiveClient,
      clients, role, myConsultant, revokeConsultant,
      refreshClients: loadClients,
    }}>
      {children}
    </ConsultantContext.Provider>
  )
}

export const useConsultant = () => useContext(ConsultantContext)