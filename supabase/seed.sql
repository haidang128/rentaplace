-- Demo data for local development (supabase db reset applies this after migrations).
-- Creates demo users directly in auth.users (local/dev only — never run in prod).

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hung@example.com',    crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Hùng Trần"}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lan@example.com',     crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Cô Lan"}', now(), now()),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mai@example.com',     crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Mai Phạm"}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@rentaplace.uk', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RentAPlace Admin"}', now(), now());

update profiles set role = 'landlord', city = 'Manchester' where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
update profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000004';
update profiles set city = 'Manchester' where id = '00000000-0000-4000-8000-000000000003';

-- Chú Hùng: fully verified, tier 2 (certificate reviewed), 3 past tenancies
insert into landlord_verifications (landlord_id, identity_status, right_to_let_status, deposit_scheme_declared, certificate_status, identity_verified_at, right_to_let_verified_at, certificate_reviewed_at)
values ('00000000-0000-4000-8000-000000000001', 'approved', 'approved', 'dps', 'approved', '2023-05-10', '2023-05-10', '2023-06-02');

-- Cô Lan: identity approved, scheme declared only (tier 1), one lodger listing
insert into landlord_verifications (landlord_id, identity_status, right_to_let_status, deposit_scheme_declared, certificate_status, identity_verified_at)
values ('00000000-0000-4000-8000-000000000002', 'approved', 'approved', 'tds', 'none', '2024-02-14');

insert into listings (id, landlord_id, status, title, city, area, room_type, price_pcm, deposit_amount, bills_included, vietnamese_flatmates, near_university, live_in_landlord, available_from, description, photos_checked_at) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'live', 'Phòng đôi Fallowfield', 'Manchester', 'Fallowfield', 'double', 520, 600, true, 2, 'University of Manchester', false, '2026-08-01', 'Phòng đôi sáng, nhà 4 phòng, 15 phút đến ĐH Manchester.', '2026-06-12'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'live', 'Phòng đơn Rusholme', 'Manchester', 'Rusholme', 'single', 480, 550, true, 1, null, false, '2026-07-15', 'Phòng đơn gần chợ Á, tiện nấu ăn.', '2026-06-10'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'live', 'Phòng ensuite Withington', 'Manchester', 'Withington', 'ensuite', 620, 715, true, 0, null, false, '2026-09-01', 'Ensuite mới sửa, yên tĩnh.', '2026-06-20'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'live', 'Phòng trong nhà chủ ở cùng — Levenshulme', 'Manchester', 'Levenshulme', 'double', 450, 450, true, 0, null, true, '2026-07-10', 'Phòng trong nhà cô Lan đang ở — phù hợp người đi làm.', '2026-06-18'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', 'live', 'Phòng đôi Longsight', 'Manchester', 'Longsight', 'double', 495, 570, false, 1, null, false, '2026-08-15', 'Gần trạm bus, khu người Việt.', '2026-06-22'),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'pending_review', 'Phòng đơn Moss Side', 'Manchester', 'Moss Side', 'single', 430, 495, true, 0, null, false, '2026-08-01', 'Đang chờ đội RentAPlace chụp ảnh.', null);

-- Past tenancy for Chú Hùng with a confirmed deposit (drives tier 3 + flywheel once ended)
insert into tenancies (id, listing_id, renter_id, move_in_date, deposit_amount, scheme, status)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '2025-06-01', 550, 'dps', 'ended');

insert into deposit_confirmations (tenancy_id, scheme, confirmed_at)
values ('20000000-0000-4000-8000-000000000001', 'dps', '2025-06-20');

insert into reviews (tenancy_id, stars, body, deposit_returned_in_full)
values ('20000000-0000-4000-8000-000000000001', 5, 'Chú Hùng trả cọc đầy đủ ngay tuần em dọn ra. Có gì hỏng sửa rất nhanh.', true);

insert into review_queue (type, subject_id, status)
values ('photos', '10000000-0000-4000-8000-000000000006', 'open');
