-- Migration 11 added `not null` to near_university while an older client was
-- still live: iOS build 2 (submitted 2026-07-13, ASC 6790340348) predates the
-- toggle and inserts an explicit null, so creating a listing from the App Store
-- build now fails on the constraint.
--
-- Drop the constraint and keep the default. Old clients send null and it is
-- stored as null; new clients send true/false. Both read back correctly, since
-- Browse tests `!nearUniversity` and null is falsy exactly like false.
--
-- The lesson is the ordinary expand/contract one: a not-null column can only be
-- tightened once every client that writes it has been retired. Re-add it later
-- if that ever becomes true.

alter table listings
  alter column near_university drop not null;

comment on column listings.near_university is
  'Landlord says the room is within easy reach of a university. '
  'Nullable: pre-toggle clients (iOS build 2) write null, which reads as false.';
