-- Account deletion (GDPR right to erasure).
-- The app first best-effort deletes the user's storage files via the storage
-- API (real blob removal, needs the delete policy below), then calls
-- delete_account() which cleans up everything the FK cascades don't cover and
-- finally deletes the auth.users row — profiles, listings, photos,
-- conversations, messages, tenancies, saved listings, verifications and
-- contract summaries all cascade from there.

-- Users may delete storage objects they uploaded (photos, certificates, contracts).
create policy "owner deletes own storage objects" on storage.objects for delete
  using (owner_id = auth.uid()::text);

create or replace function delete_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  -- The founder/admin account runs the review queue; deleting it would brick
  -- moderation. Admins must be demoted before they can be deleted.
  if exists (select 1 from profiles where id = uid and role = 'admin') then
    raise exception 'admin accounts cannot self-delete';
  end if;

  -- review_queue.subject_id has no FK (it points at a landlord, listing or
  -- contract summary depending on type) — remove the user's items explicitly.
  delete from review_queue
   where subject_id = uid
      or subject_id in (select id from listings where landlord_id = uid)
      or subject_id in (
        select cs.id from contract_summaries cs
        join listings l on l.id = cs.listing_id
        where l.landlord_id = uid
      );
  update review_queue set reviewer_id = null where reviewer_id = uid;
  update contract_summaries set reviewed_by = null where reviewed_by = uid;

  -- Fallback for files the client failed to remove: deleting the metadata row
  -- makes the file unreachable (404) even in the public bucket.
  delete from storage.objects
   where owner_id = uid::text
      or (
        bucket_id in ('listing-photos', 'contracts')
        and (storage.foldername(name))[1] in
          (select id::text from listings where landlord_id = uid)
      );

  -- Cascades take care of the rest (profiles.id references auth.users on
  -- delete cascade, and every user-owned table cascades from profiles).
  delete from auth.users where id = uid;
end $$;

revoke execute on function delete_account() from anon;
