-- Reporting and blocking, required before the app can ship on the App Store.
--
-- App Store Guideline 1.2 asks apps carrying user-generated content for three
-- things: a way to report offensive content, a way to block an abusive user,
-- and published contact details. Listings already pass through the admin queue
-- before anyone sees them, but chat messages and landlord reviews do not, and
-- until now there was no way to report or block anything at all.

create table content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  -- What is being reported. 'user' covers harassment that is not tied to one
  -- message; 'conversation' reports a whole thread so an admin can read it.
  target_type text not null check (target_type in ('listing', 'conversation', 'review', 'user')),
  target_id uuid not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles (id)
);

create index content_reports_open_idx on content_reports (created_at) where resolved_at is null;

alter table content_reports enable row level security;

-- Anyone signed in can report; you can only file as yourself, and you can only
-- read your own reports back. Admins see everything so the queue is workable.
create policy "file own report" on content_reports for insert
  with check (reporter_id = auth.uid());
create policy "see own reports" on content_reports for select
  using (reporter_id = auth.uid() or is_admin());
create policy "admin resolves reports" on content_reports for update
  using (is_admin()) with check (is_admin());

create table user_blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

alter table user_blocks enable row level security;

-- Your block list is yours: you manage it and nobody else can read it. The
-- person you blocked must not be able to tell, so there is no policy letting
-- blocked_id select their own row.
create policy "manage own blocks" on user_blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

/**
 * True when either party has blocked the other. Security definer so the check
 * can see rows the caller's own RLS policy would hide — the blocked user must
 * not be able to read the block, but the database still has to enforce it.
 */
create or replace function blocked_between(a uuid, b uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from user_blocks
     where (blocker_id = a and blocked_id = b)
        or (blocker_id = b and blocked_id = a)
  );
$$;

grant execute on function blocked_between(uuid, uuid) to authenticated;

-- Blocking has to hold in the database, not just in the UI: hiding a thread on
-- one device while the writes still succeed is not blocking. Replace the insert
-- policy so a message between a blocked pair is rejected outright.
drop policy if exists "participants send messages" on messages;
create policy "participants send messages" on messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from conversations c where c.id = conversation_id
      and (c.renter_id = auth.uid() or c.landlord_id = auth.uid())
      and not blocked_between(c.renter_id, c.landlord_id)
  )
);
