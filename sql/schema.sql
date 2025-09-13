create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key,
  email text unique,
  username text unique,
  display_name text,
  avatar_url text,
  status text default 'offline' check (status in ('online', 'away', 'busy', 'offline')),
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

create table friend_requests (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references users(id) on delete cascade,
  receiver_id uuid references users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sender_id, receiver_id)
);

create table friendships (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid references users(id) on delete cascade,
  user2_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user1_id, user2_id),
  check (user1_id < user2_id)
);

create table rooms (
  id text primary key default uuid_generate_v4()::text,
  type text not null check (type in ('dm', 'group')),
  title text,
  avatar_url text,
  last_text text,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table room_members (
  id uuid primary key default uuid_generate_v4(),
  room_id text references rooms(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique(room_id,user_id)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  room_id text,
  sender_id uuid references users(id) on delete cascade,
  content text,
  type text default 'text' check (type in ('text', 'file', 'invite', 'system')),
  group_title text,
  group_id text,
  reply_to uuid references messages(id),
  created_at timestamptz default now()
);

create view messages_view as
select m.id, m.room_id, m.sender_id, u.username as sender_username, u.display_name as sender_display_name, m.content, m.type, m.group_title, m.group_id, m.reply_to, m.created_at
from messages m left join users u on m.sender_id = u.id;

create or replace function get_user_rooms(uid uuid)
returns table(id text, type text, title text, avatar_url text, last_text text, unread_count bigint) as $$
  select r.id, r.type, r.title, r.avatar_url, r.last_text, 
         coalesce(unread.count, 0) as unread_count
  from rooms r
  join room_members rm on rm.room_id = r.id
  left join (
    select room_id, count(*) as count
    from messages
    where created_at > (
      select last_read_at from user_room_settings 
      where user_id = uid and room_id = messages.room_id
    )
    group by room_id
  ) unread on unread.room_id = r.id
  where rm.user_id = uid
  order by r.updated_at desc;
$$ language sql stable;

create or replace function get_user_friends(uid uuid)
returns table(id uuid, username text, display_name text, avatar_url text, status text, last_seen timestamptz) as $$
  select u.id, u.username, u.display_name, u.avatar_url, u.status, u.last_seen
  from users u
  where u.id in (
    select case 
      when user1_id = uid then user2_id 
      else user1_id 
    end
    from friendships 
    where user1_id = uid or user2_id = uid
  )
  order by u.status, u.last_seen desc;
$$ language sql stable;

create or replace function get_pending_friend_requests(uid uuid)
returns table(id uuid, sender_id uuid, sender_username text, sender_display_name text, sender_avatar_url text, created_at timestamptz) as $$
  select fr.id, fr.sender_id, u.username, u.display_name, u.avatar_url, fr.created_at
  from friend_requests fr
  join users u on u.id = fr.sender_id
  where fr.receiver_id = uid and fr.status = 'pending'
  order by fr.created_at desc;
$$ language sql stable;

create table user_room_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  room_id text references rooms(id) on delete cascade,
  last_read_at timestamptz default now(),
  notifications_enabled boolean default true,
  unique(user_id, room_id)
);

create table user_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique,
  theme text default 'dark' check (theme in ('light', 'dark', 'auto')),
  language text default 'en',
  notifications_enabled boolean default true,
  sound_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
