-- Kept in its own migration: a new enum value can't be used in the same transaction that adds it.
alter type public.invoice_status add value if not exists 'refunded';
