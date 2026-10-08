-- 0003 · Kunci search_path fungsi (advisor: function_search_path_mutable).
alter function public.set_jam_ke() set search_path = public;
alter function public.renumber_jam_ke() set search_path = public;
alter function public.entry_guard() set search_path = public;
alter function public.create_preview_version(uuid, uuid, text, integer) set search_path = public;
alter function public.apply_version(uuid, uuid) set search_path = public;
