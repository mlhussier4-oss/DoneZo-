-- Owner request 2026-11-13: a "Misc / other" service for odd jobs that don't fit a listed service.
-- Every provider receives misc jobs within their radius by default, and can turn it off (or any other service)
-- on their Marketplace profile. "On by default" services are added to each business automatically.
alter table public.service_categories add column default_on boolean not null default false;

insert into public.service_categories (slug, name, description, icon, sort_order, default_on)
values ('misc', 'Misc / other', 'Something else around the house? Describe it and local pros can bid.', 'wrench', 99, true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon,
  sort_order = excluded.sort_order, default_on = true, is_active = true;

-- Existing businesses get misc turned on.
insert into public.provider_categories (business_id, category_id)
select b.id, c.id from public.businesses b cross join public.service_categories c
where c.default_on and c.is_active
on conflict do nothing;

-- New businesses too.
create function public.businesses_default_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.provider_categories (business_id, category_id)
  select new.id, c.id from public.service_categories c where c.default_on and c.is_active
  on conflict do nothing;
  return null;
end;
$$;
create trigger businesses_default_categories after insert on public.businesses
  for each row execute function public.businesses_default_categories();
revoke all on function public.businesses_default_categories() from public, anon, authenticated;
