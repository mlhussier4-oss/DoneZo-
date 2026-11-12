-- Owner decision 2026-11-12: a provider who places fake bids loses access to the marketplace (Provider terms).
-- Admins can remove (and restore) a business's marketplace access. Removal withdraws its open bids so customers
-- can't pick them. Business tools (CRM) are unaffected. businesses.is_suspended already blocks seeing jobs and bidding.
alter table public.businesses add column marketplace_removed_reason text;

create function public.admin_set_marketplace_removed(p_business_id uuid, p_removed boolean, p_reason text)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.businesses;
  v_withdrawn int := 0;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.businesses
  set is_suspended = p_removed,
      marketplace_removed_reason = case when p_removed then left(nullif(trim(p_reason), ''), 500) end
  where id = p_business_id returning * into v;
  if v.id is null then raise exception 'Business not found'; end if;
  if p_removed then
    update public.bids set status = 'withdrawn', updated_at = now()
    where business_id = v.id and status = 'submitted';
    get diagnostics v_withdrawn = row_count;
  end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_removed then 'business.marketplace_remove' else 'business.marketplace_restore' end,
          'business', v.id::text, jsonb_build_object('reason', v.marketplace_removed_reason, 'bids_withdrawn', v_withdrawn));
  perform public.notify_business(v.id,
    case when p_removed then 'marketplace_removed' else 'marketplace_restored' end,
    case when p_removed then 'Marketplace access removed' else 'Marketplace access restored' end,
    case when p_removed then 'Your marketplace access was removed under the Provider terms. Your business tools still work. Contact support with questions.'
         else 'You can see and bid on jobs again.' end,
    '/provider/marketplace');
  return v;
end;
$$;
revoke all on function public.admin_set_marketplace_removed(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_marketplace_removed(uuid, boolean, text) to authenticated;
