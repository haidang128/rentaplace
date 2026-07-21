-- Bug fix: re-submitting a subject (e.g. adding photos one-at-a-time to a live
-- listing, or re-uploading a verification doc) filed a fresh review_queue item
-- each time, with no dedupe. The admin then saw the same subject several times
-- while the listing was already live. Collapse open duplicates and stop new
-- ones from being created.

-- Keep only the earliest open item per (type, subject_id); drop the rest.
delete from review_queue q
using review_queue keep
where q.status = 'open'
  and keep.status = 'open'
  and keep.type = q.type
  and keep.subject_id = q.subject_id
  and keep.created_at < q.created_at;

-- Backstop: at most one open item per subject+type. Client code checks first,
-- but this guarantees it even under a race.
create unique index review_queue_one_open on review_queue (type, subject_id)
  where status = 'open';
