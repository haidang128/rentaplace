-- "Near university" was a dead filter.
--
-- near_university was declared text, meant to hold a university name, but the
-- listing form never had an input for it — it only ever echoed back whatever
-- was already on the row, so every listing created through the app stored
-- null. Browse filters on `!nearUniversity`, so turning the chip on hid every
-- listing, always. The value was never displayed anywhere either.
--
-- Landlords answer a yes/no question, so store a boolean. Any row that already
-- carried a university name counts as true; null becomes false.
--
-- Guarded on the current column type so this is safe to run twice. That matters:
-- the conversion is NOT idempotent on its own — once the column is boolean,
-- `near_university is not null` is true even for false, so a second run would
-- silently flip every false to true.

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'listings'
       and column_name = 'near_university'
       and data_type = 'text'
  ) then
    alter table listings alter column near_university drop default;

    alter table listings
      alter column near_university type boolean
        using (near_university is not null);

    alter table listings alter column near_university set default false;

    update listings set near_university = false where near_university is null;

    alter table listings alter column near_university set not null;
  end if;
end $$;

comment on column listings.near_university is
  'Landlord says the room is within easy reach of a university.';
