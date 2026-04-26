-- La landing (Vite) inserta eventos con la anon key. Sin esta política, RLS bloquea el INSERT.
drop policy if exists "landing_interactions_insert_anon" on public.landing_interactions;

create policy "landing_interactions_insert_anon"
  on public.landing_interactions
  for insert
  to anon
  with check (true);
