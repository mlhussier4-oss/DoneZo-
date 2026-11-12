-- Owner request 2026-11-12: remove Turf installation as a service and add Car detailing.
-- Turf is hidden rather than deleted so past jobs, bids and invoices that used it keep their history.
update public.service_categories set is_active = false where slug = 'turf-installation';
insert into public.service_categories (slug, name, description, icon, sort_order)
values ('car-detailing', 'Car detailing', 'Mobile detailing at your home: wash and wax, interior cleaning and full details.', 'car', 6)
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon,
  sort_order = excluded.sort_order, is_active = true;
