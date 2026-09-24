-- Thống kê băng thông và dung lượng cho trang Số liệu (chạy trong Supabase SQL Editor, Run without RLS)
create table if not exists public.usage_bandwidth (
  day date not null,
  host text not null,
  bytes bigint not null default 0,
  requests bigint not null default 0,
  primary key (day, host)
);

create or replace function public.log_bandwidth(p_host text, p_bytes bigint, p_requests integer)
returns void language sql security definer set search_path = public as $$
  insert into public.usage_bandwidth(day, host, bytes, requests)
  values (current_date, p_host, greatest(p_bytes, 0), greatest(p_requests, 0))
  on conflict (day, host) do update
    set bytes = public.usage_bandwidth.bytes + excluded.bytes,
        requests = public.usage_bandwidth.requests + excluded.requests;
$$;

create or replace function public.get_storage_stats()
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'tables', (select coalesce(json_agg(t), '[]'::json) from (
        select c.relname as name, pg_total_relation_size(c.oid) as bytes
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by 2 desc limit 15) t),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_files', (select count(*) from storage.objects)
  );
$$;

grant execute on function public.log_bandwidth(text, bigint, integer) to anon, authenticated;
grant execute on function public.get_storage_stats() to anon, authenticated;
grant select on public.usage_bandwidth to anon, authenticated;
