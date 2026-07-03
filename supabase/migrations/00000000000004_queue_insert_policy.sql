-- Bug fix: review_queue had no INSERT policy for non-admins, so queue rows
-- created client-side on submission were silently rejected by RLS.
-- Allow users to open review items for their own submissions, and backfill
-- items that were lost.

create policy "users submit own review items" on review_queue for insert with check (
  (
    type in ('identity', 'right_to_let', 'certificate')
    and subject_id = auth.uid()
  )
  or (
    type = 'photos'
    and exists (select 1 from listings l where l.id = subject_id and l.landlord_id = auth.uid())
  )
  or (
    type = 'contract_summary'
    and exists (
      select 1 from contract_summaries cs
      join listings l on l.id = cs.listing_id
      where cs.id = subject_id and l.landlord_id = auth.uid()
    )
  )
);

-- Backfill: listings stuck in pending_review with no open queue item
insert into review_queue (type, subject_id)
select 'photos', l.id from listings l
where l.status = 'pending_review'
  and not exists (
    select 1 from review_queue q
    where q.type = 'photos' and q.subject_id = l.id and q.status = 'open'
  );

-- Backfill: verification docs submitted with no open queue item
insert into review_queue (type, subject_id)
select v.kind::queue_type, v.landlord_id from (
  select landlord_id, 'identity' as kind from landlord_verifications where identity_status = 'submitted'
  union all
  select landlord_id, 'right_to_let' from landlord_verifications where right_to_let_status = 'submitted'
  union all
  select landlord_id, 'certificate' from landlord_verifications where certificate_status = 'submitted'
) v
where not exists (
  select 1 from review_queue q
  where q.type = v.kind::queue_type and q.subject_id = v.landlord_id and q.status = 'open'
);

-- Backfill: contract drafts with no open queue item
insert into review_queue (type, subject_id)
select 'contract_summary', cs.id from contract_summaries cs
where cs.status = 'ai_draft'
  and not exists (
    select 1 from review_queue q
    where q.type = 'contract_summary' and q.subject_id = cs.id and q.status = 'open'
  );
