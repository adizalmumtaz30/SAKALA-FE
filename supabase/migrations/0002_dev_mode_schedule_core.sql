-- 0002 · Mode Pengembangan + inti jadwal. Idempoten, maju saja. Data uji saja selama Mode Pengembangan.
do $$ begin create type public.slot_type as enum ('TEACHING','BREAK','ACTIVITY'); exception when duplicate_object then null; end $$;
do $$ begin create type public.version_status as enum ('DRAFT','PREVIEW','ACTIVE','ARCHIVED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.entry_source as enum ('MANUAL','ENGINE','IMPORT','RESTORE'); exception when duplicate_object then null; end $$;

create table if not exists public.app_settings (
  key text primary key, value text not null, updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values ('data_mode', 'dev') on conflict (key) do nothing;

create table if not exists public.time_structures (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null, is_active boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists uq_time_structure_active on public.time_structures (academic_year_id) where is_active;

create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.time_structures(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  sequence_no integer not null check (sequence_no > 0),
  slot_type public.slot_type not null default 'TEACHING',
  label text, starts_at time not null, ends_at time not null,
  jam_ke integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((slot_type = 'TEACHING' and jam_ke is not null) or (slot_type <> 'TEACHING' and jam_ke is null)),
  unique (structure_id, day_of_week, sequence_no)
);
create index if not exists ix_time_slots_structure on public.time_slots (structure_id, day_of_week, sequence_no);

create or replace function public.set_jam_ke() returns trigger language plpgsql as $$
begin
  if new.slot_type = 'TEACHING' then
    select count(*) + 1 into new.jam_ke from public.time_slots
      where structure_id = new.structure_id and day_of_week = new.day_of_week
        and slot_type = 'TEACHING' and sequence_no < new.sequence_no and id <> new.id;
  else new.jam_ke := null; end if;
  return new;
end $$;
create or replace function public.renumber_jam_ke() returns trigger language plpgsql as $$
declare s uuid; d smallint;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  s := coalesce(new.structure_id, old.structure_id); d := coalesce(new.day_of_week, old.day_of_week);
  update public.time_slots t set jam_ke = r.rn
    from (select id, row_number() over (order by sequence_no)::int rn from public.time_slots
          where structure_id = s and day_of_week = d and slot_type = 'TEACHING') r
    where t.id = r.id and t.jam_ke is distinct from r.rn;
  return null;
end $$;
drop trigger if exists trg_time_slots_jam on public.time_slots;
create trigger trg_time_slots_jam before insert or update on public.time_slots for each row execute function public.set_jam_ke();
drop trigger if exists trg_time_slots_renumber on public.time_slots;
create trigger trg_time_slots_renumber after insert or update or delete on public.time_slots for each row execute function public.renumber_jam_ke();

create table if not exists public.teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  time_slot_id uuid not null references public.time_slots(id) on delete cascade,
  availability text not null check (availability in ('AVAILABLE','UNAVAILABLE','PREFER_NOT')),
  created_at timestamptz not null default now(),
  unique (teacher_id, time_slot_id)
);
create table if not exists public.scheduling_rules (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  rule_key text not null, rule_value jsonb not null default '{}'::jsonb, is_hard boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (academic_year_id, rule_key)
);

create table if not exists public.schedule_versions (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  version_no integer not null,
  status public.version_status not null default 'DRAFT',
  base_version_id uuid references public.schedule_versions(id),
  operation text, seed integer, note text,
  created_at timestamptz not null default now(), activated_at timestamptz,
  unique (academic_year_id, version_no)
);
create unique index if not exists uq_schedule_active on public.schedule_versions (academic_year_id) where status = 'ACTIVE';

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.schedule_versions(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id),
  class_id uuid not null references public.classes(id),
  time_slot_id uuid not null references public.time_slots(id),
  teaching_assignment_id uuid not null references public.teaching_assignments(id),
  teacher_id uuid references public.teachers(id),
  subject_id uuid references public.subjects(id),
  room_id uuid references public.rooms(id),
  is_locked boolean not null default false, is_protected boolean not null default false,
  source public.entry_source not null default 'MANUAL',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (version_id, class_id, time_slot_id)
);
-- Penjaga akhir bentrok (database adalah final guard):
create unique index if not exists uq_entry_teacher_slot on public.schedule_entries (version_id, teacher_id, time_slot_id);
create unique index if not exists uq_entry_room_slot on public.schedule_entries (version_id, room_id, time_slot_id) where room_id is not null;
create index if not exists ix_entries_version on public.schedule_entries (version_id);

create or replace function public.entry_guard() returns trigger language plpgsql as $$
declare ta record; sv record; sl record;
begin
  select * into sv from public.schedule_versions where id = new.version_id;
  select teacher_id, subject_id into ta from public.teaching_assignments where id = new.teaching_assignment_id;
  if ta.teacher_id is null then raise exception 'BEBAN_TIDAK_DITEMUKAN'; end if;
  if not exists (select 1 from public.teaching_assignment_classes where teaching_assignment_id = new.teaching_assignment_id and class_id = new.class_id)
    then raise exception 'KELAS_BUKAN_BEBAN_INI'; end if;
  select s.slot_type, st.is_active, st.academic_year_id into sl from public.time_slots s join public.time_structures st on st.id = s.structure_id where s.id = new.time_slot_id;
  if sl.slot_type is distinct from 'TEACHING' then raise exception 'SLOT_BUKAN_JAM_PELAJARAN'; end if;
  if not sl.is_active or sl.academic_year_id is distinct from sv.academic_year_id then raise exception 'SLOT_BUKAN_STRUKTUR_AKTIF'; end if;
  new.teacher_id := ta.teacher_id; new.subject_id := ta.subject_id; new.academic_year_id := sv.academic_year_id;
  return new;
end $$;
drop trigger if exists trg_entry_guard on public.schedule_entries;
create trigger trg_entry_guard before insert or update on public.schedule_entries for each row execute function public.entry_guard();

create table if not exists public.history_events (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  event_type text not null, summary text not null, details jsonb,
  version_id uuid references public.schedule_versions(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  record_date date not null,
  status text not null check (status in ('HADIR','SAKIT','IZIN','ALPHA','CUTI')),
  check_in time, check_out time,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (teacher_id, record_date),
  check (check_out is null or check_in is null or check_out > check_in)
);
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  source text not null, status text not null default 'PENDING',
  total_rows integer not null default 0, accepted_rows integer not null default 0, rejected_rows integer not null default 0,
  report jsonb, created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['time_structures','time_slots','scheduling_rules','schedule_entries','attendance_records','app_settings'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- RPC atomik: versi baru dibuat dari versi dasar, nomor versi dikunci per tahun ajaran.
create or replace function public.create_preview_version(p_year uuid, p_base uuid, p_operation text, p_seed integer default 0)
returns uuid language plpgsql as $$
declare nv uuid; nno integer;
begin
  perform 1 from public.academic_years where id = p_year for update;
  if not found then raise exception 'TAHUN_AJARAN_TIDAK_DITEMUKAN'; end if;
  select coalesce(max(version_no), 0) + 1 into nno from public.schedule_versions where academic_year_id = p_year;
  insert into public.schedule_versions (academic_year_id, version_no, status, base_version_id, operation, seed)
    values (p_year, nno, 'PREVIEW', p_base, p_operation, p_seed) returning id into nv;
  if p_base is not null then
    insert into public.schedule_entries (version_id, class_id, time_slot_id, teaching_assignment_id, room_id, is_locked, is_protected, source)
      select nv, class_id, time_slot_id, teaching_assignment_id, room_id, is_locked, is_protected, source from public.schedule_entries where version_id = p_base;
  end if;
  return nv;
end $$;

create or replace function public.apply_version(p_version uuid, p_expected_base uuid)
returns jsonb language plpgsql as $$
declare v public.schedule_versions; cur uuid;
begin
  select * into v from public.schedule_versions where id = p_version for update;
  if not found then raise exception 'VERSI_TIDAK_DITEMUKAN'; end if;
  if v.status not in ('DRAFT','PREVIEW') then raise exception 'VERSI_BUKAN_USULAN'; end if;
  select id into cur from public.schedule_versions where academic_year_id = v.academic_year_id and status = 'ACTIVE' for update;
  if cur is distinct from p_expected_base then raise exception 'VERSI_DASAR_BERUBAH' using errcode = '40001'; end if;
  if cur is not null then update public.schedule_versions set status = 'ARCHIVED' where id = cur; end if;
  update public.schedule_versions set status = 'ACTIVE', activated_at = now() where id = p_version;
  insert into public.history_events (academic_year_id, event_type, summary, version_id, details)
    values (v.academic_year_id, 'SCHEDULE_APPLIED', 'Jadwal versi ' || v.version_no || ' diterapkan.', p_version, jsonb_build_object('previous', cur));
  return jsonb_build_object('active', p_version, 'previous', cur, 'version_no', v.version_no);
end $$;

-- MODE PENGEMBANGAN: akses publik penuh (data uji saja). Kunci kembali di migrasi release_lockdown.
do $$ declare r record; begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('drop policy if exists %I on public.%I', 'dev_open_' || r.relname, r.relname);
    execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', 'dev_open_' || r.relname, r.relname);
  end loop;
end $$;
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
