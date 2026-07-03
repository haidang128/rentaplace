-- When an admin resolves a review_queue item, reflect the decision onto the
-- subject row (verification statuses / listing goes live), mirroring demo mode.

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
      set status = case when new.status = 'approved' then 'live'::listing_status else 'draft'::listing_status end,
          photos_checked_at = case when new.status = 'approved' then now() end
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

create trigger review_queue_reflect
  before update on review_queue
  for each row execute function reflect_review_resolution();
