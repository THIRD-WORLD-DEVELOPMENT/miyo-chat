alter table users enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table messages enable row level security;

create policy "users_insert_self" on users for insert with check (auth.uid() = id);
create policy "users_select_self" on users for select using (auth.uid() = id);

create policy "rooms_select_members" on rooms for select using (
  exists (
    select 1 from room_members rm
    where rm.room_id = rooms.id
    and rm.user_id = auth.uid()
  )
);
create policy "rooms_insert_auth" on rooms for insert with check (auth.role() = 'authenticated');

create policy "room_members_insert_self" on room_members for insert with check (user_id = auth.uid());
create policy "room_members_select_self" on room_members for select using (user_id = auth.uid());

create policy "messages_select_members" on messages for select using (
  exists (
    select 1 from room_members rm
    where rm.room_id = messages.room_id
    and rm.user_id = auth.uid()
  )
);
create policy "messages_insert_members" on messages for insert with check (
  sender_id = auth.uid() and
  exists (select 1 from room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid())
);
