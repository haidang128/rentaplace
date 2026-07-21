-- Optional phone number so renters can call / WhatsApp a landlord directly.
-- The profiles table is world-readable (select using(true)), so a phone column
-- there would be scrapable by anyone with the anon key. Keep the number in a
-- table that only the owner/admin can read, and expose it to renters solely
-- through an RPC that requires the caller to be signed in.

create table landlord_contacts (
  landlord_id uuid primary key references profiles (id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);

create trigger landlord_contacts_touch before update on landlord_contacts
  for each row execute function touch_updated_at();

alter table landlord_contacts enable row level security;

-- Only the owner (and admins) can read/write the raw row. No public select.
create policy "own contact" on landlord_contacts for all
  using (landlord_id = auth.uid() or is_admin())
  with check (landlord_id = auth.uid() or is_admin());

-- Renter-facing reveal: any signed-in user gets the number; anon gets null.
-- SECURITY DEFINER bypasses the row policy above; auth.uid() still reflects the
-- caller's JWT, so the sign-in gate holds.
create or replace function get_landlord_phone(p_landlord_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then null
    else (select phone from landlord_contacts where landlord_id = p_landlord_id)
  end;
$$;

grant execute on function get_landlord_phone(uuid) to anon, authenticated;
