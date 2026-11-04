-- =====================================================================
-- Plataforma de inglés — esquema inicial (Supabase / PostgreSQL)
-- Ejecutar UNA vez en: Supabase > SQL Editor > New query > Run
-- Después ejecutar 02_seed_aptis.sql (contenido del curso APTIS).
-- =====================================================================

-- ---------- Tipos ----------
create type public.user_role   as enum ('student', 'teacher', 'admin');
create type public.cefr_level  as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
create type public.exercise_type as enum ('multiple_choice', 'fill_blank', 'listening', 'writing');
create type public.enrollment_status as enum ('active', 'completed', 'dropped');

-- ---------- Tablas ----------
create table public.profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users (id) on delete cascade,
  nombre          text,
  email           text,
  rol             public.user_role not null default 'student',
  nivel_actual    public.cefr_level default 'A1',
  fecha_registro  timestamptz not null default now(),
  avatar_url      text
);

create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  level        public.cefr_level not null,
  image_url    text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.lessons (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  title        text not null,
  content      text,
  order_index  int not null default 0,
  video_url    text,
  created_at   timestamptz not null default now()
);

create table public.exercises (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  type            public.exercise_type not null,
  question        text not null,
  options         jsonb,
  correct_answer  text,
  points          int not null default 1 check (points >= 0)
);

create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  status       public.enrollment_status not null default 'active',
  unique (student_id, course_id)
);

create table public.student_progress (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  completed     boolean not null default false,
  score         numeric(5,2) default 0,
  completed_at  timestamptz,
  unique (student_id, lesson_id)
);

create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  answer        text,
  is_correct    boolean,
  submitted_at  timestamptz not null default now()
);

-- ---------- Índices ----------
create index on public.courses (level);
create index on public.lessons (course_id, order_index);
create index on public.exercises (lesson_id);
create index on public.enrollments (course_id);
create index on public.student_progress (lesson_id);
create index on public.submissions (student_id, submitted_at desc);
create index on public.submissions (exercise_id);

-- ---------- Funciones auxiliares ----------
-- id del perfil del usuario conectado
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid()
$$;

-- ¿el usuario conectado es profesor o admin?
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where user_id = auth.uid() and rol in ('teacher', 'admin'))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where user_id = auth.uid() and rol = 'admin')
$$;

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, nombre, email, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name'),
          new.email,
          new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un alumno no puede cambiarse el rol a sí mismo
create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and not public.is_admin() then
    raise exception 'Solo un admin puede cambiar roles';
  end if;
  return new;
end $$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

-- Corrige una respuesta, la guarda y actualiza el progreso de la lección
create or replace function public.submit_answer(p_exercise_id uuid, p_answer text)
returns table (is_correct boolean, correct_answer text, lesson_score numeric)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_student uuid := public.current_profile_id();
  v_ex      public.exercises;
  v_ok      boolean;
  v_total   int;
  v_right   int;
  v_done    int;
begin
  if v_student is null then raise exception 'No autenticado'; end if;
  select * into v_ex from public.exercises where id = p_exercise_id;
  if not found then raise exception 'Ejercicio no encontrado'; end if;

  v_ok := case when v_ex.type = 'writing' or v_ex.correct_answer is null then null
               else lower(trim(p_answer)) = lower(trim(v_ex.correct_answer)) end;

  insert into public.submissions (student_id, exercise_id, answer, is_correct)
  values (v_student, p_exercise_id, p_answer, v_ok);

  -- puntuación de la lección = % de ejercicios corregibles acertados (último intento)
  with last as (
    select distinct on (s.exercise_id) s.exercise_id, s.is_correct
    from public.submissions s join public.exercises e on e.id = s.exercise_id
    where s.student_id = v_student and e.lesson_id = v_ex.lesson_id
    order by s.exercise_id, s.submitted_at desc
  )
  select (select count(*) from public.exercises where lesson_id = v_ex.lesson_id and type <> 'writing' and correct_answer is not null),
         count(*) filter (where last.is_correct),
         count(*)
    into v_total, v_right, v_done
  from last;

  insert into public.student_progress (student_id, lesson_id, completed, score, completed_at)
  values (v_student, v_ex.lesson_id,
          v_done >= (select count(*) from public.exercises where lesson_id = v_ex.lesson_id),
          case when v_total > 0 then round(100.0 * v_right / v_total, 2) else 0 end,
          now())
  on conflict (student_id, lesson_id) do update
    set score = excluded.score,
        completed = excluded.completed,
        completed_at = case when excluded.completed then now() else public.student_progress.completed_at end;

  return query select v_ok, v_ex.correct_answer,
    (select sp.score from public.student_progress sp where sp.student_id = v_student and sp.lesson_id = v_ex.lesson_id);
end $$;

-- Estadísticas de un alumno (el propio alumno o staff)
create or replace function public.get_student_stats(p_student_id uuid)
returns table (total_submissions bigint, correct bigint, accuracy numeric,
               lessons_completed bigint, avg_score numeric, streak_days int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_day    date := (now() at time zone 'Europe/Madrid')::date;
  v_streak int := 0;
begin
  if p_student_id is distinct from public.current_profile_id() and not public.is_staff() then
    raise exception 'Sin permiso';
  end if;
  -- racha: días seguidos con actividad, contando desde hoy (o desde ayer si hoy aún no hay)
  if not exists (select 1 from public.submissions where student_id = p_student_id
                 and (submitted_at at time zone 'Europe/Madrid')::date = v_day) then
    v_day := v_day - 1;
  end if;
  while exists (select 1 from public.submissions where student_id = p_student_id
                and (submitted_at at time zone 'Europe/Madrid')::date = v_day) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;
  return query
  select
    (select count(*) from public.submissions where student_id = p_student_id),
    (select count(*) from public.submissions where student_id = p_student_id and is_correct),
    (select round(100.0 * count(*) filter (where is_correct) / nullif(count(*) filter (where is_correct is not null), 0), 2)
       from public.submissions where student_id = p_student_id),
    (select count(*) from public.student_progress where student_id = p_student_id and completed),
    (select round(avg(score), 2) from public.student_progress where student_id = p_student_id),
    v_streak;
end $$;

-- ---------- Row Level Security ----------
alter table public.profiles         enable row level security;
alter table public.courses          enable row level security;
alter table public.lessons          enable row level security;
alter table public.exercises        enable row level security;
alter table public.enrollments      enable row level security;
alter table public.student_progress enable row level security;
alter table public.submissions      enable row level security;

-- profiles
create policy "perfil: ver el propio o staff" on public.profiles
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "perfil: editar el propio o admin" on public.profiles
  for update to authenticated using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "perfil: borrar solo admin" on public.profiles
  for delete to authenticated using (public.is_admin());

-- contenido: lectura para cualquier usuario autenticado, escritura solo staff
create policy "cursos: lectura" on public.courses for select to authenticated using (true);
create policy "cursos: staff crea" on public.courses for insert to authenticated with check (public.is_staff());
create policy "cursos: staff edita" on public.courses for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "cursos: staff borra" on public.courses for delete to authenticated using (public.is_staff());

create policy "lecciones: lectura" on public.lessons for select to authenticated using (true);
create policy "lecciones: staff crea" on public.lessons for insert to authenticated with check (public.is_staff());
create policy "lecciones: staff edita" on public.lessons for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "lecciones: staff borra" on public.lessons for delete to authenticated using (public.is_staff());

create policy "ejercicios: lectura" on public.exercises for select to authenticated using (true);
create policy "ejercicios: staff crea" on public.exercises for insert to authenticated with check (public.is_staff());
create policy "ejercicios: staff edita" on public.exercises for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "ejercicios: staff borra" on public.exercises for delete to authenticated using (public.is_staff());

-- datos del alumno: cada uno los suyos; staff ve todo
create policy "matrículas: ver" on public.enrollments for select to authenticated
  using (student_id = public.current_profile_id() or public.is_staff());
create policy "matrículas: matricularse" on public.enrollments for insert to authenticated
  with check (student_id = public.current_profile_id());
create policy "matrículas: cambiar estado" on public.enrollments for update to authenticated
  using (student_id = public.current_profile_id() or public.is_staff())
  with check (student_id = public.current_profile_id() or public.is_staff());
create policy "matrículas: borrar" on public.enrollments for delete to authenticated
  using (student_id = public.current_profile_id() or public.is_staff());

-- progreso y envíos se escriben solo a través de submit_answer()
create policy "progreso: ver" on public.student_progress for select to authenticated
  using (student_id = public.current_profile_id() or public.is_staff());
create policy "envíos: ver" on public.submissions for select to authenticated
  using (student_id = public.current_profile_id() or public.is_staff());

-- funciones expuestas como RPC solo a usuarios autenticados
revoke execute on function public.submit_answer(uuid, text) from public, anon;
revoke execute on function public.get_student_stats(uuid) from public, anon;
grant  execute on function public.submit_answer(uuid, text) to authenticated;
grant  execute on function public.get_student_stats(uuid) to authenticated;
