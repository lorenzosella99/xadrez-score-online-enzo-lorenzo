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