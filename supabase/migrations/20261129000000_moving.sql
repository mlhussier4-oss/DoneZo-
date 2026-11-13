-- Owner request 2026-11-13: add Movers as a marketplace service.
insert into public.service_categories (slug, name, description, icon, sort_order)
values ('moving', 'Movers', 'Help moving furniture, boxes or a whole home: loading, hauling and unloading.', 'boxes', 7)
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon,
  sort_order = excluded.sort_order, is_active = true;
