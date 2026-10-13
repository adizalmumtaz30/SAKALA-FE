-- Satu beban per guru + mapel per tahun ajaran; kelas dan JP ada di teaching_assignment_classes.
create unique index if not exists uq_assignment_year_teacher_subject on public.teaching_assignments (academic_year_id, teacher_id, subject_id);
