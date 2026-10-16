create table if not exists public.xadrez_salas (
  sala text primary key,
  estado jsonb not null,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

alter table public.xadrez_salas enable row level security;

grant select, insert, update, delete on public.xadrez_salas to anon, authenticated;

drop policy if exists "xadrez salas leitura" on public.xadrez_salas;
create policy "xadrez salas leitura"
on public.xadrez_salas
for select
to anon, authenticated
using (true);

drop policy if exists "xadrez salas criacao" on public.xadrez_salas;
create policy "xadrez salas criacao"
on public.xadrez_salas
for insert
to anon, authenticated
with check (true);

drop policy if exists "xadrez salas atualizacao" on public.xadrez_salas;
create policy "xadrez salas atualizacao"
on public.xadrez_salas
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "xadrez salas exclusao" on public.xadrez_salas;
create policy "xadrez salas exclusao"
on public.xadrez_salas
for delete
to anon, authenticated
using (true);

do $$
begin
  alter publication supabase_realtime add table public.xadrez_salas;
exception
  when duplicate_object then null;
end $$;

-- Perfis vinculados à conta autenticada do Supabase Auth.
create table if not exists public.xadrez_perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome_jogador text not null unique check (char_length(trim(nome_jogador)) between 1 and 30),
  criado_em timestamptz not null default now()
);

alter table public.xadrez_perfis enable row level security;
revoke all on public.xadrez_perfis from anon;
grant select, insert, update, delete on public.xadrez_perfis to authenticated;

drop policy if exists "Jogador lê o próprio perfil" on public.xadrez_perfis;
create policy "Jogador lê o próprio perfil" on public.xadrez_perfis
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Jogador cria o próprio perfil" on public.xadrez_perfis;
create policy "Jogador cria o próprio perfil" on public.xadrez_perfis
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Jogador atualiza o próprio perfil" on public.xadrez_perfis;
create policy "Jogador atualiza o próprio perfil" on public.xadrez_perfis
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Jogador remove o próprio perfil" on public.xadrez_perfis;
create policy "Jogador remove o próprio perfil" on public.xadrez_perfis
for delete to authenticated using ((select auth.uid()) = user_id);
