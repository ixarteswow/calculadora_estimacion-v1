-- Ejecutar en Supabase → SQL Editor (proyecto nuevo)
-- Tabla que espera la app: workers

create table if not exists public.workers (
  id text primary key,
  name text not null,
  role text not null,
  status text,
  avatar text,
  schedule jsonb not null,
  busy_until timestamptz
);

comment on column public.workers.schedule is
  'JSON: workDays (0=Dom..6=Sab), startHour, startMinute, endHour, endMinute, holidays ["YYYY-MM-DD"]';

-- Lectura pública para la clave anon (solo SELECT)
alter table public.workers enable row level security;

drop policy if exists "workers_select_anon" on public.workers;
create policy "workers_select_anon"
  on public.workers
  for select
  to anon, authenticated
  using (true);

-- Datos de ejemplo (opcional)
insert into public.workers (id, name, role, status, avatar, schedule, busy_until)
values
  (
    'A101',
    'Ana Martínez',
    'Desarrolladora Senior',
    'Activo',
    'https://ui-avatars.com/api/?name=Ana+Martinez&background=0D8ABC&color=fff',
    '{"workDays":[1,2,3,4,5],"startHour":9,"startMinute":0,"endHour":17,"endMinute":0,"holidays":["2024-12-25","2024-01-01","2024-05-01"]}'::jsonb,
    null
  ),
  (
    'B202',
    'Carlos Ruiz',
    'Soporte Técnico',
    'Ocupado',
    'https://ui-avatars.com/api/?name=Carlos+Ruiz&background=EB4D4B&color=fff',
    '{"workDays":[2,3,4,5,6],"startHour":14,"startMinute":0,"endHour":22,"endMinute":0,"holidays":["2024-12-25"]}'::jsonb,
    now() + interval '4 hours'
  )
on conflict (id) do nothing;
