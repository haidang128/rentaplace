-- Bug fix: rejecting a re-review unpublished a listing that was already approved.
--
-- The reflection trigger set 'draft' on every rejection, so when an admin turned
-- down an edit to a live listing the whole ad vanished for renters — including
-- the version they had already approved. It also cleared photos_checked_at on
-- rejection (the CASE had no ELSE), destroying the "photos checked on <date>"
-- trust signal and the only record that the listing had ever passed review.
--
-- Now: approval goes live and stamps the date; rejection sends a never-approved
-- listing back to draft but leaves an already-approved one live and its stamp
-- intact. The landlord is told it was rejected and re-submits by saving an edit.

create or replace function reflect_review_resolution() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status or new.status = 'open' then
    return new;
  end if;

  if new.type = 'identity' then
    update landlord_verifications
      set identity_status = new.status::text::verification_status,
          identity_verified_at = case when new.status = 'approved' then now() end
      where landlord_id = new.subject_id;
  elsif new.type = 'right_to_let' then
    update landlord_verifications
      set right_to_let_status = new.status::text::verification_status,
          right_to_let_verified_at = case when new.status = 'approved' then now() end
      where landlord_id = new.subject_id;
  elsif new.type = 'certificate' then
    update landlord_verifications
      set certificate_status = new.status::text::verification_status,
          certificate_reviewed_at = case when new.status = 'approved' then now() end
      where landlord_id = new.subject_id;
  elsif new.type = 'photos' then
    update listings
      set status = case
                     when new.status = 'approved' then 'live'::listing_status
                     -- Approved once before: the live ad stays up while the
                     -- landlord fixes whatever was rejected.
                     when photos_checked_at is not null then status
                     else 'draft'::listing_status
                   end,
          photos_checked_at = case
                                when new.status = 'approved' then now()
                                else photos_checked_at
                              end
      where id = new.subject_id;
  elsif new.type = 'contract_summary' then
    update contract_summaries
      set status = case when new.status = 'approved' then 'approved'::summary_status else 'rejected'::summary_status end,
          reviewed_by = new.reviewer_id
      where id = new.subject_id;
  end if;

  new.resolved_at = coalesce(new.resolved_at, now());
  return new;
end $$;

-- Landlords could file photos review items (migration 4) but never read them
-- back: the only SELECT policy matches subject_id = auth.uid(), which holds for
-- verification items but not for photos items, whose subject is the listing.
-- Without this the landlord has no way to learn a review was rejected.
create policy "landlord sees own listing queue items" on review_queue for select using (
  type = 'photos'
  and exists (select 1 from listings l where l.id = subject_id and l.landlord_id = auth.uid())
);
