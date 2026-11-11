-- Owner decision 2026-11-12: live booking. New states (in their own migration: Postgres can't use
-- new enum values in the same transaction that adds them).
alter type public.booking_status add value if not exists 'pending' before 'active';  -- customer picked a bid; provider must confirm
alter type public.booking_status add value if not exists 'lapsed';                    -- provider didn't confirm in time, or was dropped
alter type public.request_status add value if not exists 'pending' before 'booked';  -- waiting for the chosen provider to confirm
alter type public.bid_status add value if not exists 'lapsed';
