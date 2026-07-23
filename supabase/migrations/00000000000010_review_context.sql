-- Two gaps in the review loop, both about context the queue never carried.
--
-- 1. opened_reason: a listing review is always type 'photos', so the admin
--    queue announced "Photos + listing" and "re-reviewing new photos" even when
--    the landlord had only changed the price. Record why the item was filed.
--    'both' is what a photos item becomes when a landlord adds photos AND edits
--    details before an admin gets to it. Null on rows opened before this.
--
-- 2. resolution_note: rejecting told the landlord to change something without
--    ever saying what. The admin now leaves a reason, and the landlord reads it.

alter table review_queue
  add column opened_reason text check (opened_reason in ('new', 'photos', 'edit', 'both')),
  add column resolution_note text;

comment on column review_queue.opened_reason is
  'Why this item was filed: new listing, new photos, edited details, or both.';
comment on column review_queue.resolution_note is
  'Admin''s reason, shown to the subject. Set when rejecting.';

-- Existing photos items predate the column. A listing that has never been
-- approved was filed on creation; anything else was a re-review of a live ad,
-- which at the time could only be triggered by adding photos.
update review_queue q
   set opened_reason = case
                         when l.photos_checked_at is null then 'new'
                         else 'photos'
                       end
  from listings l
 where l.id = q.subject_id
   and q.type = 'photos'
   and q.opened_reason is null;
