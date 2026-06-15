-- Adiciona FK entre consultant_clients.consultant_id e public.profiles.id
-- Necessário para que o PostgREST resolva a relação usada em queries com hint de relacionamento.
-- Rodar no Supabase: SQL Editor → executar este arquivo.

ALTER TABLE public.consultant_clients
  ADD CONSTRAINT consultant_clients_consultant_id_fkey
  FOREIGN KEY (consultant_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
