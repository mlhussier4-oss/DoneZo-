-- Owner requests 2026-11-15: Save my home, reviews with photos, and a "Responds fast" badge.

-- 1. Save my home: the customer's ZIP and home answers (home type, size, rooms, yard size...) prefill the next post.
create table public.customer_homes (
  customer_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  zip         text check (zip ~ '^\d{5}$'),
  details     jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and pg_column_size(details) < 2000),
  updated_at  timestamptz not null default now()
);
alter table public.customer_homes enable row level security;
create policy "customer_homes: own" on public.customer_homes for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
grant select, insert, update, delete on public.customer_homes to authenticated;
grant all on public.customer_homes to service_role;

-- 2. Reviews with up to 3 photos of the finished job (public, like the review itself).
alter table public.reviews add column photo_paths text[] not null default '{}'
  check (cardinality(photo_paths) <= 3);
grant insert (photo_paths) on public.reviews to authenticated;
create function public.reviews_photos_own_folder()
returns trigger
language plpgsql
set search_path = ''
as $$
declare p text;
begin
  foreach p in array new.photo_paths loop
    if p !~ ('^' || new.customer_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
      raise exception 'Invalid review photo' using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;
create trigger reviews_photos_own_folder before insert on public.reviews
  for each row execute function public.reviews_photos_own_folder();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "review-photos: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Show review photos on the pro's public profile.
do $$
declare r record;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'get_provider_profile'
  loop
    execute replace(pg_get_functiondef(r.oid), '''comment'', rv.comment,', '''comment'', rv.comment, ''photos'', rv.photo_paths,');
  end loop;
end;
$$;

-- 3. "Responds fast": at least 3 confirmed marketplace jobs in the last 6 months, usually confirmed within 2 minutes.
create or replace function public.business_public_stats(p_business_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rating', (select round(avg(rating)::numeric, 1) from public.reviews where business_id = p_business_id),
    'review_count', (select count(*) from public.reviews where business_id = p_business_id),
    'completed_jobs', (select count(*) from public.bookings where business_id = p_business_id and status = 'completed'),
    'responds_fast', coalesce((
      select count(*) >= 3 and percentile_cont(0.5) within group (order by extract(epoch from confirmed_at - created_at)) <= 120
      from public.bookings
      where business_id = p_business_id and confirmed_at is not null and parent_booking_id is null
        and created_at > now() - interval '6 months'), false)
  );
$$;
revoke all on function public.reviews_photos_own_folder() from public, anon, authenticated;
