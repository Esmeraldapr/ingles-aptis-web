-- Ajustes tras la primera carga
-- 1) Permite cambiar roles desde el SQL Editor (allí no hay usuario conectado: auth.uid() es NULL).
--    Desde la web sigue haciendo falta ser admin.
create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un admin puede cambiar roles';
  end if;
  return new;
end $$;

-- 2) La portada muestra los cursos a visitantes sin cuenta (solo el catálogo, no lecciones ni ejercicios).
create policy "cursos: lectura pública" on public.courses for select to anon using (true);

-- 3) Certificados: registro de cursos terminados
create table if not exists public.certificates (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  issued_at   timestamptz not null default now(),
  unique (student_id, course_id)
);
alter table public.certificates enable row level security;
create policy "certificados: ver" on public.certificates for select to authenticated
  using (student_id = public.current_profile_id() or public.is_staff());
-- solo la Edge Function (service role) los crea
