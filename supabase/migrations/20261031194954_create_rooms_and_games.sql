-- rooms players join with a code, who's sitting where, and each room's game

create table public.rooms (
  code       text primary key,
  status     text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  host_id    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table public.room_players (
  room_code    text not null references public.rooms on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  seat         int  not null check (seat >= 0), -- turn order
  display_name text not null check (char_length(display_name) between 1 and 20),
  joined_at    timestamptz not null default now(),
  primary key (room_code, user_id),
  unique (room_code, seat)
);

-- the whole GameState, every hand and the deck included, so browsers must never read it directly
create table public.games (
  room_code  text primary key references public.rooms on delete cascade,
  state      jsonb not null,
  version    int  not null default 0, -- goes up by 1 on every move, see the version check in the plan
  updated_at timestamptz not null default now()
);

-- no policies yet: browsers can't read or write any of these, only server code using the secret key
alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;
alter table public.games        enable row level security;
