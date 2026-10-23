create table if not exists public.rooms (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  capacity smallint not null check (capacity between 2 and 8),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  token_hash text not null,
  last_seen timestamptz not null default now(),
  unique (room_code, token_hash)
);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
