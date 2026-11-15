-- HomeHire app (owner request 2026-11-15): phones running the iPhone/Android app register a native push token.
-- Sending to these tokens is switched on once the Apple (APNs) / Firebase keys exist; web push is unchanged.
alter table public.push_subscriptions
  add column platform text not null default 'web' check (platform in ('web', 'ios', 'android')),
  add column native_token text unique check (char_length(native_token) <= 400),
  alter column endpoint drop not null,
  alter column p256dh drop not null,
  alter column auth drop not null,
  add constraint push_subscriptions_kind check (
    (platform = 'web' and endpoint is not null and p256dh is not null and auth is not null and native_token is null)
    or (platform <> 'web' and native_token is not null and endpoint is null));

create function public.register_native_push(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_platform not in ('ios', 'android') or p_token is null or char_length(p_token) not between 20 and 400 then
    raise exception 'Invalid device' using errcode = 'P0001';
  end if;
  insert into public.push_subscriptions (user_id, platform, native_token)
  values (auth.uid(), p_platform, p_token)
  on conflict (native_token) do update set user_id = excluded.user_id, created_at = now();
end;
$$;
revoke all on function public.register_native_push(text, text) from public, anon;
grant execute on function public.register_native_push(text, text) to authenticated;
