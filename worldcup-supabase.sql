-- ============================================================================
-- World Cup 2026 Prediction Game — Supabase schema
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It creates the tables, the scoring logic, the public leaderboard view,
-- and Row Level Security (RLS) policies.
--
-- Security model (lightweight, for a trusted pool — lab/friends):
--   * Players identify with a display name + passcode. The passcode is hashed
--     in the browser (SHA-256) before it ever leaves the device; only the hash
--     is stored.  A player proves ownership of their row by presenting the same
--     hash, which is checked against `players.passcode_hash` inside the RLS
--     policy.  This is NOT strong auth — it stops casual tampering, not a
--     determined attacker who reads the public anon key + table.
--   * The Supabase ANON key is public and lives in the page. That is expected;
--     RLS below is what actually protects writes.
--   * Match RESULTS are entered by you directly in the Supabase table editor
--     (service role), so no policy grants the public UPDATE on results.
-- ============================================================================

-- Clean re-run support (safe to comment out if you have real data)
drop view   if exists leaderboard;
drop view   if exists prediction_points;
drop table  if exists predictions;
drop table  if exists matches;
drop table  if exists players;

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------
create table players (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null unique check (char_length(display_name) between 2 and 40),
  passcode_hash text not null,                 -- SHA-256 hex of the passcode, computed client-side
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Matches (group stage + knockout). Results filled in by admin (service role).
-- ---------------------------------------------------------------------------
create table matches (
  id          uuid primary key default gen_random_uuid(),
  stage       text not null check (stage in ('group','r32','r16','qf','sf','final','third')),
  group_label text,                            -- 'A'..'L' for group games, null otherwise
  slot        int,                             -- ordering / bracket position within a stage
  home_team   text not null,                   -- real team or placeholder ('Winner Group A', 'TBD')
  away_team   text not null,
  kickoff_at  timestamptz not null,            -- predictions lock at this moment
  home_goals  int,                             -- null until played
  away_goals  int,                             -- null until played
  played      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index matches_stage_slot_idx on matches (stage, slot);

-- ---------------------------------------------------------------------------
-- Predictions: one row per (player, match)
-- ---------------------------------------------------------------------------
create table predictions (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  match_id    uuid not null references matches(id) on delete cascade,
  pred_home   int  not null check (pred_home  between 0 and 99),
  pred_away   int  not null check (pred_away  between 0 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (player_id, match_id)
);
create index predictions_match_idx  on predictions (match_id);
create index predictions_player_idx on predictions (player_id);

-- ===========================================================================
-- Scoring
-- ---------------------------------------------------------------------------
-- Tiered — a prediction earns the single highest tier that applies:
--   exact score .................... 4
--   correct goal difference ........ 3   (same signed GD, not exact)
--   correct tendency (outcome) ..... 2   (right win/draw/loss only)
--   wrong outcome .................. 0
-- Only matches with played = true and non-null results contribute.
-- ===========================================================================
create or replace function wc_points(
  ph int, pa int,   -- predicted home / away
  ah int, aa int    -- actual home / away
) returns int
language sql immutable as $$
  select case
    when ph = ah and pa = aa then 4                              -- exact score
    when (ph - pa) = (ah - aa) then 3                            -- same goal difference (covers exact draws too,
                                                                 -- but exact is caught above first)
    when sign(ph - pa) = sign(ah - aa) then 2                    -- same tendency (both home win / both away win / both draw)
    else 0
  end;
$$;

create view prediction_points as
select
  p.id          as prediction_id,
  p.player_id,
  p.match_id,
  wc_points(p.pred_home, p.pred_away, m.home_goals, m.away_goals) as points
from predictions p
join matches m on m.id = p.match_id
where m.played = true
  and m.home_goals is not null
  and m.away_goals is not null;

-- Public leaderboard: total points + how many matches each player has scored on
create view leaderboard as
select
  pl.id           as player_id,
  pl.display_name,
  coalesce(sum(pp.points), 0)::int as total_points,
  count(pp.points)                  as scored_matches
from players pl
left join prediction_points pp on pp.player_id = pl.id
group by pl.id, pl.display_name
order by total_points desc, pl.display_name asc;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table players     enable row level security;
alter table matches     enable row level security;
alter table predictions enable row level security;

-- The browser sends the player's passcode hash via a request header / setting.
-- We read it with current_setting('request.header.x-player-hash', true).
-- Helper to fetch it (returns null if absent):
create or replace function wc_caller_hash() returns text
language sql stable as $$
  select nullif(current_setting('request.headers', true)::json ->> 'x-player-hash', '')
$$;

-- --- players ---------------------------------------------------------------
-- Anyone may read display names (needed for leaderboard joins / name checks).
create policy players_read on players for select using (true);
-- Anyone may create a new player (join).  Uniqueness on display_name prevents
-- silent takeover of an existing name.
create policy players_insert on players for insert with check (true);

-- --- matches ---------------------------------------------------------------
-- Public read-only. No public insert/update/delete (results entered by admin
-- via the service role, which bypasses RLS).
create policy matches_read on matches for select using (true);

-- --- predictions -----------------------------------------------------------
-- Read: predictions become public only after the match has kicked off, so
-- players can't copy each other's picks before lock. Your own picks are always
-- visible to you (matched by passcode hash).
create policy predictions_read on predictions for select using (
  exists (
    select 1 from matches m
    where m.id = predictions.match_id and m.kickoff_at <= now()
  )
  or exists (
    select 1 from players pl
    where pl.id = predictions.player_id and pl.passcode_hash = wc_caller_hash()
  )
);

-- Insert: only for your own player row, only before kickoff.
create policy predictions_insert on predictions for insert with check (
  exists (select 1 from players pl
          where pl.id = predictions.player_id and pl.passcode_hash = wc_caller_hash())
  and exists (select 1 from matches m
              where m.id = predictions.match_id and m.kickoff_at > now())
);

-- Update: only your own picks, only before kickoff.
create policy predictions_update on predictions for update using (
  exists (select 1 from players pl
          where pl.id = predictions.player_id and pl.passcode_hash = wc_caller_hash())
  and exists (select 1 from matches m
              where m.id = predictions.match_id and m.kickoff_at > now())
) with check (
  exists (select 1 from players pl
          where pl.id = predictions.player_id and pl.passcode_hash = wc_caller_hash())
  and exists (select 1 from matches m
              where m.id = predictions.match_id and m.kickoff_at > now())
);

-- ===========================================================================
-- Grants
-- ---------------------------------------------------------------------------
-- RLS filters ROWS, but the role still needs table-level privileges first.
-- Grant the minimum each table needs to the public (anon) + authenticated roles;
-- RLS policies above then restrict which rows are actually readable/writable.
-- ===========================================================================
grant select          on players     to anon, authenticated;  -- read names; insert below
grant insert          on players     to anon, authenticated;  -- join (create player)
grant select          on matches     to anon, authenticated;  -- read fixtures (read-only)
grant select, insert, update on predictions to anon, authenticated;  -- own picks (RLS-gated)

-- Views inherit RLS from their base tables; expose them to the anon role.
grant select on leaderboard       to anon, authenticated;
grant select on prediction_points to anon, authenticated;
