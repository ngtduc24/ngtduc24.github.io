-- Create table if it doesn't exist
create table if not exists public.ar_targets (
  id text primary key,
  name text not null,
  target_image_url text not null,
  content_type text not null default 'video',
  content_url text not null,
  scale numeric not null default 1,
  rotation numeric not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- In case the table already existed but was missing columns, add them (it will throw an error if they already exist, which is fine, or we can use a PL/pgSQL block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ar_targets' AND column_name='status') THEN
        ALTER TABLE public.ar_targets ADD COLUMN status text not null default 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ar_targets' AND column_name='scale') THEN
        ALTER TABLE public.ar_targets ADD COLUMN scale numeric not null default 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ar_targets' AND column_name='rotation') THEN
        ALTER TABLE public.ar_targets ADD COLUMN rotation numeric not null default 0;
    END IF;
END $$;

drop trigger if exists ar_targets_set_updated_at on public.ar_targets;
create trigger ar_targets_set_updated_at before update on public.ar_targets for each row execute function public.set_updated_at();

alter table public.ar_targets enable row level security;
drop policy if exists ar_targets_public_read on public.ar_targets;
create policy ar_targets_public_read on public.ar_targets for select to anon, authenticated using (true);
drop policy if exists ar_targets_app_write on public.ar_targets;
create policy ar_targets_app_write on public.ar_targets for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on table public.ar_targets to anon, authenticated;

-- Set up storage bucket for AR assets
insert into storage.buckets (id, name, public) 
values ('ar_assets', 'ar_assets', true) 
on conflict (id) do nothing;

-- Add RLS policies for the bucket (allow public read, allow anon/authenticated full access for simplicity)
drop policy if exists "AR Assets public read" on storage.objects;
create policy "AR Assets public read" on storage.objects for select using (bucket_id = 'ar_assets');

drop policy if exists "AR Assets app write" on storage.objects;
create policy "AR Assets app write" on storage.objects for all using (bucket_id = 'ar_assets') with check (bucket_id = 'ar_assets');
