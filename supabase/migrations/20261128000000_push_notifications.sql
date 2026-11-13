-- Owner request 2026-11-13: push notifications (with the device's chime) when someone is off the site:
-- customers for new bids and messages, providers for new jobs nearby and accepted bids, and every other
-- in-app notification. Uses the browser's standard Web Push (free; no third-party account).
--
-- Flow: a row in public.notifications → this trigger asks the website (/api/push, with a shared secret) to send it
-- → the website encrypts it and sends it to each of that person's subscribed browsers/phones.
-- The website URL and secret are stored in Supabase Vault per environment (never in this file):
--   select vault.create_secret('https://donezo.org/api/push', 'push_webhook_url');
--   select vault.create_secret('<secret>', 'push_webhook_secret');
create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  user_agent  text check (char_length(user_agent) <= 300),
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: own" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

create function public.notifications_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then return null; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then return null; end if;
  -- Queued and sent after the transaction commits; a failure never blocks the notification itself.
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 8000);
  return null;
exception when others then
  return null;
end;
$$;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.notifications_push();
revoke all on function public.notifications_push() from public, anon, authenticated;

-- Register this device for the signed-in person. If the same browser was registered by another account
-- (e.g. a guest who later signed in as someone else), it moves to the current person: the endpoint is a secret
-- held only by that browser, so presenting it proves control of the device.
create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    user_agent = excluded.user_agent, created_at = now();
end;
$$;
revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
