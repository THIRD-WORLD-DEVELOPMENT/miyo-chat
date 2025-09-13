create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key,
  email text unique,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table rooms (
  id text primary key default uuid_generate_v4()::text,
  type text not null,
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
  joined_at timestamptz default now(),
  unique(room_id,user_id)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  room_id text references rooms(id) on delete cascade,
  sender_id uuid references users(id) on delete cascade,
  content text,
  type text default 'text',
  group_title text,
  created_at timestamptz default now()
);

create view messages_view as
select m.id, m.room_id, m.sender_id, u.username as sender_username, m.content, m.type, m.group_title, m.created_at
from messages m left join users u on m.sender_id = u.id;

create or replace function get_user_rooms(uid uuid)
returns table(id text, type text, title text, avatar_url text, last_text text) as $$
  select r.id, r.type, r.title, r.avatar_url, r.last_text
  from rooms r
  join room_members rm on rm.room_id = r.id
  where rm.user_id = uid
  order by r.updated_at desc;
$$ language sql stable;
