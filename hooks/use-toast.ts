import { toast } from "sonner"

export function useAppToast() {
  return {
    success: (message: string) => toast.success(message, { duration: 3000 }),
    error: (message: string) => toast.error(message, { duration: 4000 }),
    loading: (message: string) => toast.loading(message),
    dismiss: (id?: string | number) => toast.dismiss(id),
    saved: () => toast.success("Salvo com sucesso!"),
    deleted: () => toast.success("Removido com sucesso!"),
    updated: () => toast.success("Atualizado com sucesso!"),
    networkError: () => toast.error("Erro de conexão. Verifique sua internet."),
    genericError: () => toast.error("Algo deu errado. Tente novamente."),
  }
}
