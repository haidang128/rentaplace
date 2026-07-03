-- RentAPlace initial schema
-- Trust model: landlord attestation (tier 1) -> certificate reviewed (tier 2)
-- -> tenant-confirmed deposit (tier 3). Platform never verifies deposits itself.

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type user_role as enum ('renter', 'landlord', 'admin');
create type deposit_scheme as enum ('dps', 'mydeposits', 'tds');
create type verification_status as enum ('none', 'submitted', 'approved', 'rejected');
create type listing_status as enum ('draft', 'pending_review', 'live', 'let', 'archived');
create type room_type as enum ('single', 'double', 'ensuite', 'studio');
create type queue_type as enum ('identity', 'right_to_let', 'certificate', 'photos', 'contract_summary');
create type queue_status as enum ('open', 'approved', 'rejected');
create type tenancy_status as enum ('active', 'ended');
create type summary_status as enum ('ai_draft', 'approved', 'rejected');

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'renter',
  display_name text not null default '',
  lang text not null default 'vi' check (lang in ('vi', 'en')),
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ── Landlord verification (attestation, not deposit verification) ───────────
create table landlord_verifications (
  landlord_id uuid primary key references profiles (id) on delete cascade,
  identity_status verification_status not null default 'none',
  identity_file text,
  right_to_let_status verification_status not null default 'none',
  right_to_let_file text,
  deposit_scheme_declared deposit_scheme,
  certificate_status verification_status not null default 'none',
  certificate_file text,
  identity_verified_at timestamptz,
  right_to_let_verified_at timestamptz,
  certificate_reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── Listings ─────────────────────────────────────────────────────────────────
create table listings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references profiles (id) on delete cascade,
  status listing_status not null default 'draft',
  title text not null,
  city text not null,
  area text not null,
  room_type room_type not null default 'double',
  price_pcm integer not null check (price_pcm > 0),
  deposit_amount integer not null check (deposit_amount >= 0),
  bills_included boolean not null default false,
  vietnamese_flatmates integer not null default 0,
  near_university text,
  live_in_landlord boolean not null default false, -- lodger branch: deposit law does not apply
  available_from date,
  description text not null default '',
  photos_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_browse_idx on listings (status, city, price_pcm);

create table listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  path text not null,
  shot_by_team boolean not null default false,
  sort_order integer not null default 0
);

-- ── Admin review queue (one queue for every human check) ────────────────────
create table review_queue (
  id uuid primary key default gen_random_uuid(),
  type queue_type not null,
  subject_id uuid not null, -- landlord_id, listing_id, or contract_summaries.id depending on type
  status queue_status not null default 'open',
  reviewer_id uuid references profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index review_queue_open_idx on review_queue (status, created_at);

-- ── Chat ─────────────────────────────────────────────────────────────────────
create table conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  renter_id uuid not null references profiles (id) on delete cascade,
  landlord_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, renter_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  body text not null,
  reported boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

-- ── Tenancies + the day-30 deposit loop ──────────────────────────────────────
create table tenancies (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  renter_id uuid not null references profiles (id) on delete cascade,
  move_in_date date not null,
  deposit_amount integer not null check (deposit_amount >= 0),
  scheme deposit_scheme,
  is_lodger boolean not null default false,
  status tenancy_status not null default 'active',
  created_at timestamptz not null default now()
);

create table deposit_confirmations (
  tenancy_id uuid primary key references tenancies (id) on delete cascade,
  scheme deposit_scheme not null,
  confirmed_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies (id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  body text not null default '',
  deposit_returned_in_full boolean,
  created_at timestamptz not null default now(),
  unique (tenancy_id)
);

-- ── Saved listings, waitlist, contract summaries ─────────────────────────────
create table saved_listings (
  profile_id uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, listing_id)
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text,
  zalo text,
  lang text not null default 'vi',
  city text,
  created_at timestamptz not null default now(),
  check (email is not null or zalo is not null)
);

create table contract_summaries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  contract_file text not null,
  extracted jsonb not null default '{}'::jsonb, -- rent, deposit, notice, term, flags[]
  status summary_status not null default 'ai_draft',
  reviewed_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id)
);

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on profiles for each row execute function touch_updated_at();
create trigger landlord_verifications_touch before update on landlord_verifications for each row execute function touch_updated_at();
create trigger listings_touch before update on listings for each row execute function touch_updated_at();
create trigger contract_summaries_touch before update on contract_summaries for each row execute function touch_updated_at();

-- ── Trust ladder + landlord stats (the reputation flywheel) ──────────────────
-- Tier 3: a tenant has confirmed a protected deposit with this landlord.
-- Tier 2: certificate from a past tenancy reviewed by our team.
-- Tier 1: scheme declared. 0: nothing. Lodger listings: UI shows lodger guide instead.
create or replace function deposit_trust_tier(p_landlord_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case
    when exists (
      select 1 from deposit_confirmations dc
      join tenancies t on t.id = dc.tenancy_id
      join listings l on l.id = t.listing_id
      where l.landlord_id = p_landlord_id
    ) then 3
    when exists (
      select 1 from landlord_verifications lv
      where lv.landlord_id = p_landlord_id and lv.certificate_status = 'approved'
    ) then 2
    when exists (
      select 1 from landlord_verifications lv
      where lv.landlord_id = p_landlord_id and lv.deposit_scheme_declared is not null
    ) then 1
    else 0
  end;
$$;

create or replace function landlord_stats(p_landlord_id uuid)
returns table (
  completed_tenancies bigint,
  deposit_confirmations bigint,
  deposits_returned_pct numeric
)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where t.status = 'ended'),
    count(dc.tenancy_id),
    round(100.0 * count(*) filter (where r.deposit_returned_in_full)
      / nullif(count(*) filter (where r.deposit_returned_in_full is not null), 0))
  from tenancies t
  join listings l on l.id = t.listing_id and l.landlord_id = p_landlord_id
  left join deposit_confirmations dc on dc.tenancy_id = t.id
  left join reviews r on r.tenancy_id = t.id;
$$;

-- Public, safe subset of verification state (never exposes file paths).
create view landlord_public with (security_invoker = off) as
select
  lv.landlord_id,
  lv.identity_status = 'approved' as identity_verified,
  lv.right_to_let_status = 'approved' as right_to_let_verified,
  lv.deposit_scheme_declared,
  lv.certificate_status = 'approved' as certificate_reviewed,
  lv.identity_verified_at,
  lv.right_to_let_verified_at,
  lv.certificate_reviewed_at
from landlord_verifications lv;

-- ── Row level security ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table landlord_verifications enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table review_queue enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table tenancies enable row level security;
alter table deposit_confirmations enable row level security;
alter table reviews enable row level security;
alter table saved_listings enable row level security;
alter table waitlist enable row level security;
alter table contract_summaries enable row level security;

-- profiles: public display info, self-managed
create policy "profiles are viewable" on profiles for select using (true);
create policy "update own profile" on profiles for update using (id = auth.uid());

-- landlord_verifications: owner + admin only (public reads go via landlord_public view)
create policy "own verification" on landlord_verifications
  for all using (landlord_id = auth.uid() or is_admin());

-- listings: live listings public; owners and admins see everything of theirs
create policy "live listings viewable" on listings for select
  using (status = 'live' or landlord_id = auth.uid() or is_admin());
create policy "landlord inserts own listing" on listings for insert
  with check (landlord_id = auth.uid());
create policy "landlord updates own listing" on listings for update
  using (landlord_id = auth.uid() or is_admin());

-- listing_photos: follow the listing
create policy "photos follow listing" on listing_photos for select using (
  exists (
    select 1 from listings l where l.id = listing_id
      and (l.status = 'live' or l.landlord_id = auth.uid() or is_admin())
  )
);
create policy "landlord manages photos" on listing_photos for all using (
  exists (select 1 from listings l where l.id = listing_id and l.landlord_id = auth.uid())
  or is_admin()
);

-- review_queue: admin works it; subjects can watch their own items
create policy "admin reviews" on review_queue for all using (is_admin());
create policy "subject sees own queue items" on review_queue for select
  using (subject_id = auth.uid());

-- chat: participants only
create policy "participants see conversation" on conversations for select
  using (renter_id = auth.uid() or landlord_id = auth.uid() or is_admin());
create policy "renter starts conversation" on conversations for insert
  with check (renter_id = auth.uid());
create policy "participants see messages" on messages for select using (
  exists (
    select 1 from conversations c where c.id = conversation_id
      and (c.renter_id = auth.uid() or c.landlord_id = auth.uid() or is_admin())
  )
);
create policy "participants send messages" on messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from conversations c where c.id = conversation_id
      and (c.renter_id = auth.uid() or c.landlord_id = auth.uid())
  )
);

-- tenancies: renter, the landlord of the listing, admin
create policy "tenancy parties" on tenancies for select using (
  renter_id = auth.uid() or is_admin()
  or exists (select 1 from listings l where l.id = listing_id and l.landlord_id = auth.uid())
);
create policy "renter records tenancy" on tenancies for insert
  with check (renter_id = auth.uid());
create policy "renter updates own tenancy" on tenancies for update
  using (renter_id = auth.uid() or is_admin());

-- deposit confirmations: only the tenant on their own tenancy
create policy "tenant confirms deposit" on deposit_confirmations for insert with check (
  exists (select 1 from tenancies t where t.id = tenancy_id and t.renter_id = auth.uid())
);
create policy "confirmation visible to parties" on deposit_confirmations for select using (
  exists (
    select 1 from tenancies t
    join listings l on l.id = t.listing_id
    where t.id = tenancy_id
      and (t.renter_id = auth.uid() or l.landlord_id = auth.uid() or is_admin())
  )
);

-- reviews: public (they appear on landlord profiles); author writes once
create policy "reviews viewable" on reviews for select using (true);
create policy "tenant reviews own tenancy" on reviews for insert with check (
  exists (select 1 from tenancies t where t.id = tenancy_id and t.renter_id = auth.uid())
);

-- saved listings: private
create policy "own saved listings" on saved_listings for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- waitlist: anyone may join; only admin reads
create policy "anyone joins waitlist" on waitlist for insert with check (true);
create policy "admin reads waitlist" on waitlist for select using (is_admin());

-- contract summaries: approved ones public with the listing; landlord + admin manage
create policy "approved summaries viewable" on contract_summaries for select using (
  status = 'approved' or is_admin()
  or exists (select 1 from listings l where l.id = listing_id and l.landlord_id = auth.uid())
);
create policy "landlord submits contract" on contract_summaries for insert with check (
  exists (select 1 from listings l where l.id = listing_id and l.landlord_id = auth.uid())
);
create policy "admin updates summaries" on contract_summaries for update using (is_admin());

-- ── Storage buckets ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('listing-photos', 'listing-photos', true),
  ('certificates', 'certificates', false),
  ('contracts', 'contracts', false);

create policy "public reads listing photos" on storage.objects for select
  using (bucket_id = 'listing-photos');
create policy "landlord uploads listing photos" on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.uid() is not null);
create policy "owner or admin reads private docs" on storage.objects for select
  using (
    bucket_id in ('certificates', 'contracts')
    and (owner_id = auth.uid()::text or is_admin())
  );
create policy "landlord uploads private docs" on storage.objects for insert
  with check (bucket_id in ('certificates', 'contracts') and auth.uid() is not null);
