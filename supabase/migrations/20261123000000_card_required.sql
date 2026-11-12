-- Owner decision 2026-11-12: every provider accepts card through DoneZo. It can't be switched off;
-- cash, Venmo, Cash App and check stay optional.
update public.businesses set accepted_payment_methods = array['card'] || accepted_payment_methods
where not ('card' = any (accepted_payment_methods));
alter table public.businesses alter column accepted_payment_methods set default array['card']::text[];
alter table public.businesses add constraint businesses_card_required check ('card' = any (accepted_payment_methods));
