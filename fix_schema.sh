#!/bin/bash
awk '
/^do \$\$/ {
  if (!inserted) {
    print "create table if not exists public.ar_targets ("
    print "  id text primary key,"
    print "  name text not null,"
    print "  target_image_url text not null,"
    print "  content_type text not null default '"'"'video'"'"',"
    print "  content_url text not null,"
    print "  scale numeric not null default 1,"
    print "  rotation numeric not null default 0,"
    print "  status text not null default '"'"'active'"'"',"
    print "  created_at timestamptz not null default timezone('"'"'utc'"'"', now()),"
    print "  updated_at timestamptz not null default timezone('"'"'utc'"'"', now())"
    print ");"
    print ""
    inserted = 1
  }
}
{ print }
' PORTFOLIO_SUPABASE_SCHEMA.sql > temp.sql
mv temp.sql PORTFOLIO_SUPABASE_SCHEMA.sql
# Remove the one appended at the end
sed -i '/create table if not exists public.ar_targets (/,$d' PORTFOLIO_SUPABASE_SCHEMA.sql
