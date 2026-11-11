-- Owner request 2026-11-12: add Turf installation as a marketplace service.
insert into public.service_categories (slug, name, description, icon, sort_order)
values ('turf-installation', 'Turf installation', 'Artificial turf for yards, pet areas and putting greens, including removal and base prep.', 'land-plot', 6)
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, is_active = true;
