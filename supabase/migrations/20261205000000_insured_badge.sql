-- Owner request 2026-11-14: providers tick "Insured" at sign-up (or later on their Marketplace profile) and get an
-- "Insured" badge on their bids and public profile. It is the provider's own statement (self-reported), not checked
-- by HomeHire; the separate "Verified" badge is for documents an admin has actually checked.
alter table public.businesses
  add column insured boolean not null default false,
  add column insured_updated_at timestamptz;
grant update (insured) on public.businesses to authenticated;

create function public.businesses_insured_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.insured is distinct from old.insured then new.insured_updated_at := now(); end if;
  return new;
end;
$$;
create trigger businesses_insured_stamp before insert or update of insured on public.businesses
  for each row execute function public.businesses_insured_stamp();

-- Sign-up: the "Insured" tick travels in user metadata.
create function public.record_signup_insured()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    select coalesce((u.raw_user_meta_data ->> 'insured')::boolean, false) into new.insured from auth.users u where u.id = new.created_by;
  end if;
  new.insured := coalesce(new.insured, false);
  return new;
end;
$$;
create trigger businesses_signup_insured before insert on public.businesses
  for each row execute function public.record_signup_insured();
revoke all on function public.record_signup_insured(), public.businesses_insured_stamp() from public, anon, authenticated;

create or replace function public.get_provider_profile(p_business_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'description', b.description, 'years_experience', b.years_experience,
    'home_zip', b.home_zip, 'service_radius_miles', b.service_radius_miles,
    'accepted_payment_methods', b.accepted_payment_methods, 'logo_path', b.logo_path,
    'verified', b.verified_at is not null, 'insured', b.insured,
    'categories', coalesce((select jsonb_agg(c.name order by c.sort_order) from public.provider_categories pc
                            join public.service_categories c on c.id = pc.category_id where pc.business_id = b.id), '[]'::jsonb),
    'portfolio', coalesce((select jsonb_agg(jsonb_build_object('path', p.storage_path, 'caption', p.caption) order by p.created_at desc)
                           from public.portfolio_photos p where p.business_id = b.id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('rating', rv.rating, 'comment', rv.comment, 'created_at', rv.created_at,
                                  'author', split_part(coalesce(pr.full_name, 'Customer'), ' ', 1)) order by rv.created_at desc)
                         from (select * from public.reviews where business_id = b.id order by created_at desc limit 20) rv
                         left join public.profiles pr on pr.id = rv.customer_id), '[]'::jsonb),
    'stats', public.business_public_stats(b.id)
  )
  from public.businesses b
  where b.id = p_business_id and b.marketplace_enabled and not b.is_suspended;
$$;


create or replace function public.request_bids(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id, 'status', x.status, 'price_cents', x.price_cents, 'included', x.included,
    'availability', x.availability, 'exclusions', x.exclusions, 'additional_charges', x.additional_charges,
    'message', x.message, 'created_at', x.created_at,
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_path', b.logo_path, 'years_experience', b.years_experience,
      'verified', b.verified_at is not null, 'insured', b.insured, 'accepted_payment_methods', b.accepted_payment_methods,
      'portfolio', coalesce((select jsonb_agg(p.storage_path) from (select storage_path from public.portfolio_photos
                             where business_id = b.id order by created_at desc limit 3) p), '[]'::jsonb),
      'stats', public.business_public_stats(b.id))
  ) order by x.price_cents), '[]'::jsonb)
  from public.bids x
  join public.businesses b on b.id = x.business_id
  join public.service_requests r on r.id = x.request_id
  where x.request_id = p_request_id and r.customer_id = (select auth.uid()) and x.status in ('submitted', 'accepted');
$$;

