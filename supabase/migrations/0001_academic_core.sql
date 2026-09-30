-- 0001: tabel akademik inti (spek Rev.2 bagian 6.2). RLS aktif; policy publik hanya SELECT dulu.

create type public.academic_year_status as enum ('DRAFT','ACTIVE','ARCHIVED');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null, code text, address text, phone text, email text, logo_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  status public.academic_year_status not null default 'DRAFT',
  starts_on date, ends_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index academic_years_one_active on public.academic_years(school_id) where status = 'ACTIVE';

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text, name text not null, short_name text, email text, phone text, photo_url text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text, name text not null, short_name text,
  color_token text check (color_token is null or color_token ~ '^subject-(0[1-9]|1[0-9]|2[0-4])$'),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null, grade text, code text,
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null, code text,
  capacity integer check (capacity is null or capacity > 0),
  room_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  subject_id uuid not null references public.subjects(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.teaching_assignment_classes (
  id uuid primary key default gen_random_uuid(),
  teaching_assignment_id uuid not null references public.teaching_assignments(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  jp_per_week integer not null check (jp_per_week > 0),
  created_at timestamptz not null default now(),
  unique (teaching_assignment_id, class_id)
);

-- Trigger validasi: kelas dan assignment harus berada di tahun ajaran yang sama.
create or replace function public.check_tac_same_year()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  a_year uuid;
  c_year uuid;
begin
  select academic_year_id into a_year from public.teaching_assignments where id = new.teaching_assignment_id;
  select academic_year_id into c_year from public.classes where id = new.class_id;
  if a_year is distinct from c_year then
    raise exception 'Kelas dan beban mengajar harus berada di tahun ajaran yang sama';
  end if;
  return new;
end;
$$;

create trigger tac_same_year
  before insert or update on public.teaching_assignment_classes
  for each row execute function public.check_tac_same_year();

-- updated_at otomatis
create trigger trg_schools_updated before update on public.schools for each row execute function public.set_updated_at();
create trigger trg_academic_years_updated before update on public.academic_years for each row execute function public.set_updated_at();
create trigger trg_teachers_updated before update on public.teachers for each row execute function public.set_updated_at();
create trigger trg_subjects_updated before update on public.subjects for each row execute function public.set_updated_at();
create trigger trg_classes_updated before update on public.classes for each row execute function public.set_updated_at();
create trigger trg_rooms_updated before update on public.rooms for each row execute function public.set_updated_at();
create trigger trg_teaching_assignments_updated before update on public.teaching_assignments for each row execute function public.set_updated_at();

-- Indeks untuk foreign key dan kueri konteks aktif
create index teachers_school_idx on public.teachers(school_id);
create index subjects_school_idx on public.subjects(school_id);
create index classes_year_idx on public.classes(academic_year_id);
create index classes_school_idx on public.classes(school_id);
create index rooms_school_idx on public.rooms(school_id);
create index academic_years_school_idx on public.academic_years(school_id);
create index ta_year_idx on public.teaching_assignments(academic_year_id);
create index ta_teacher_idx on public.teaching_assignments(teacher_id);
create index ta_subject_idx on public.teaching_assignments(subject_id);
create index tac_assignment_idx on public.teaching_assignment_classes(teaching_assignment_id);
create index tac_class_idx on public.teaching_assignment_classes(class_id);

-- RLS aktif di semua tabel
alter table public.schools enable row level security;
alter table public.academic_years enable row level security;
alter table public.teachers enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.rooms enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.teaching_assignment_classes enable row level security;

-- Policy publik minimal: baca saja (UI modul butuh membaca). Policy tulis ditambah per modul saat dibangun dan dites.
create policy "publik baca schools" on public.schools for select to anon, authenticated using (true);
create policy "publik baca academic_years" on public.academic_years for select to anon, authenticated using (true);
create policy "publik baca teachers" on public.teachers for select to anon, authenticated using (true);
create policy "publik baca subjects" on public.subjects for select to anon, authenticated using (true);
create policy "publik baca classes" on public.classes for select to anon, authenticated using (true);
create policy "publik baca rooms" on public.rooms for select to anon, authenticated using (true);
create policy "publik baca teaching_assignments" on public.teaching_assignments for select to anon, authenticated using (true);
create policy "publik baca teaching_assignment_classes" on public.teaching_assignment_classes for select to anon, authenticated using (true);
