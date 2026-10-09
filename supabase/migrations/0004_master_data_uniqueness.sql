-- Keunikan data master (tanpa membedakan huruf besar/kecil). Kode opsional: hanya unik bila diisi.
create unique index if not exists uq_classes_year_name on public.classes (academic_year_id, lower(name));
create unique index if not exists uq_subjects_school_name on public.subjects (school_id, lower(name));
create unique index if not exists uq_subjects_school_code on public.subjects (school_id, lower(code)) where code is not null and code <> '';
create unique index if not exists uq_teachers_school_code on public.teachers (school_id, lower(code)) where code is not null and code <> '';
