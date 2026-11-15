-- Owner decision 2026-11-15: before a Basic free month starts, place a temporary hold for the first charge on the card
-- (released immediately) to prove it's real and has funds. A declined hold cancels the free month at once.
alter table public.business_subscriptions
  add column trial_card_check text check (trial_card_check in ('passed', 'failed')),
  add column trial_card_checked_at timestamptz,
  add column trial_card_message text check (char_length(trial_card_message) <= 300);
