-- Role management for production:
-- 1. Bootstrap the founding admin account by email (works whether the account
--    already exists or signs up later).
-- 2. Lock the role column so users can't self-escalate via the profiles UPDATE
--    policy, and expose a safe renter -> landlord self-serve function.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when new.email = 'dangngochai@gmail.com' then 'admin'::user_role else 'renter'::user_role end
  );
  return new;
end $$;

-- If the founder already signed up before this migration ran:
update profiles set role = 'admin'
where id in (select id from auth.users where email = 'dangngochai@gmail.com');

-- Column-level lock: authenticated users may update their profile, but not role.
revoke update on table profiles from authenticated;
grant update (display_name, lang, city) on table profiles to authenticated;

-- Safe self-serve upgrade: renter -> landlord only (never admin).
create or replace function become_landlord() returns void
language sql security definer set search_path = public as $$
  update profiles set role = 'landlord' where id = auth.uid() and role = 'renter';
$$;
