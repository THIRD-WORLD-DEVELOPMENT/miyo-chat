-- Recommended Row Level Security (RLS) policies for production
-- Enable RLS
alter table users enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table messages enable row level security;

-- Allow authenticated users to insert their own user row (signup)
create policy "users_insert_auth" on users for insert using (auth.role() = 'authenticated') with check (auth.uid() = id::text::uuid);

-- Allow users to select their own user row
create policy "users_select_self" on users for select using (auth.uid() = id::text::uuid);

-- Rooms: allow read for members
create policy "rooms_select_members" on rooms for select using (exists (select 1 from room_members rm where rm.room_id = rooms.id and rm.user_id = auth.uid()::uuid));

-- Rooms: allow insert for authenticated users (creation)
create policy "rooms_insert_auth" on rooms for insert using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- room_members: allow members to insert themselves or owners to add members
create policy "room_members_insert" on room_members for insert using (auth.role() = 'authenticated') with check (auth.uid()::uuid = user_id::text::uuid);

-- messages: allow members of a room to insert and select
create policy "messages_select_members" on messages for select using (exists (select 1 from room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid()::uuid));
create policy "messages_insert_members" on messages for insert using (exists (select 1 from room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid()::uuid)) with check (sender_id = auth.uid()::uuid);

-- For DM invites that are stored as messages to target user (room_id = target user id), allow sending invites to users by sender only if authenticated
create policy "messages_insert_invite_target" on messages for insert using (auth.role() = 'authenticated') with check (sender_id = auth.uid()::uuid);

-- Note: Review and adapt policies to your security requirements.
