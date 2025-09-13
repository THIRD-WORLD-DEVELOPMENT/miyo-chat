-- Enable RLS on all tables
alter table users enable row level security;
alter table friend_requests enable row level security;
alter table friendships enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table messages enable row level security;
alter table user_room_settings enable row level security;
alter table user_preferences enable row level security;

-- Users policies
create policy "users_insert_self" on users for insert with check (auth.uid() = id);
create policy "users_select_self" on users for select using (auth.uid() = id);
create policy "users_update_self" on users for update using (auth.uid() = id);
create policy "users_select_friends" on users for select using (
  auth.uid() = id or
  exists (
    select 1 from friendships f
    where (f.user1_id = auth.uid() and f.user2_id = users.id) or
          (f.user2_id = auth.uid() and f.user1_id = users.id)
  )
);

-- Friend requests policies
create policy "friend_requests_select_self" on friend_requests for select using (
  sender_id = auth.uid() or receiver_id = auth.uid()
);
create policy "friend_requests_insert_self" on friend_requests for insert with check (
  sender_id = auth.uid()
);
create policy "friend_requests_update_receiver" on friend_requests for update using (
  receiver_id = auth.uid()
);

-- Friendships policies
create policy "friendships_select_self" on friendships for select using (
  user1_id = auth.uid() or user2_id = auth.uid()
);
create policy "friendships_insert_self" on friendships for insert with check (
  user1_id = auth.uid() or user2_id = auth.uid()
);

-- Rooms policies
create policy "rooms_select_members" on rooms for select using (
  exists (
    select 1 from room_members rm
    where rm.room_id = rooms.id
    and rm.user_id = auth.uid()
  )
);
create policy "rooms_insert_auth" on rooms for insert with check (auth.role() = 'authenticated');
create policy "rooms_update_owner" on rooms for update using (
  created_by = auth.uid() or
  exists (
    select 1 from room_members rm
    where rm.room_id = rooms.id
    and rm.user_id = auth.uid()
    and rm.role in ('owner', 'admin')
  )
);

-- Room members policies
create policy "room_members_select_members" on room_members for select using (
  user_id = auth.uid() or
  exists (
    select 1 from room_members rm
    where rm.room_id = room_members.room_id
    and rm.user_id = auth.uid()
  )
);
create policy "room_members_insert_self" on room_members for insert with check (
  user_id = auth.uid()
);
create policy "room_members_insert_admin" on room_members for insert with check (
  exists (
    select 1 from room_members rm
    where rm.room_id = room_members.room_id
    and rm.user_id = auth.uid()
    and rm.role in ('owner', 'admin')
  )
);
create policy "room_members_delete_self" on room_members for delete using (
  user_id = auth.uid()
);
create policy "room_members_delete_admin" on room_members for delete using (
  exists (
    select 1 from room_members rm
    where rm.room_id = room_members.room_id
    and rm.user_id = auth.uid()
    and rm.role in ('owner', 'admin')
  )
);

-- Messages policies
create policy "messages_select_members" on messages for select using (
  exists (
    select 1 from room_members rm
    where rm.room_id = messages.room_id
    and rm.user_id = auth.uid()
  )
);
create policy "messages_insert_members" on messages for insert with check (
  sender_id = auth.uid() and
  exists (
    select 1 from room_members rm 
    where rm.room_id = messages.room_id 
    and rm.user_id = auth.uid()
  )
);

-- User room settings policies
create policy "user_room_settings_select_self" on user_room_settings for select using (
  user_id = auth.uid()
);
create policy "user_room_settings_insert_self" on user_room_settings for insert with check (
  user_id = auth.uid()
);
create policy "user_room_settings_update_self" on user_room_settings for update using (
  user_id = auth.uid()
);

-- User preferences policies
create policy "user_preferences_select_self" on user_preferences for select using (
  user_id = auth.uid()
);
create policy "user_preferences_insert_self" on user_preferences for insert with check (
  user_id = auth.uid()
);
create policy "user_preferences_update_self" on user_preferences for update using (
  user_id = auth.uid()
);
