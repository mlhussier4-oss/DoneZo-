-- Owner request 2026-11-28: providers can list a website link on their profile for customers to see.
-- Optional; must be a plain http(s) link. Only the business itself can set it (column grant), and it shows on the
-- public profile customers open from a bid.

alter table public.businesses add column website text
  check (website is null or (website ~* '^https?://[^\s<>"]+$' and length(website) <= 200));
grant update (website) on public.businesses to authenticated;

-- Public profile: include the website.
create or replace function public.get_provider_profile(p_business_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'description', b.description, 'years_experience', b.years_experience,
    'home_zip', b.home_zip, 'service_radius_miles', b.service_radius_miles,
    'accepted_payment_methods', b.accepted_payment_methods, 'logo_path', b.logo_path,
    'verified', b.verified_at is not null, 'insured', b.insured, 'website', b.website,
    'categories', coalesce((select jsonb_agg(c.name order by c.sort_order) from public.provider_categories pc
                            join public.service_categories c on c.id = pc.category_id where pc.business_id = b.id), '[]'::jsonb),
    'portfolio', coalesce((select jsonb_agg(jsonb_build_object('path', p.storage_path, 'caption', p.caption) order by p.created_at desc)
                           from public.portfolio_photos p where p.business_id = b.id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('rating', rv.rating, 'comment', rv.comment, 'photos', rv.photo_paths, 'created_at', rv.created_at,
                                  'author', split_part(coalesce(pr.full_name, 'Customer'), ' ', 1)) order by rv.created_at desc)
                         from (select * from public.reviews where business_id = b.id order by created_at desc limit 20) rv
                         left join public.profiles pr on pr.id = rv.customer_id), '[]'::jsonb),
    'stats', public.business_public_stats(b.id)
  )
  from public.businesses b
  where b.id = p_business_id and b.marketplace_enabled and not b.is_suspended;
$function$;
