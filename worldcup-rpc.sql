-- ============================================================================
-- World Cup 2026 — prediction RPC (header-independent auth)
-- ----------------------------------------------------------------------------
-- Run this ONCE in the SQL editor (it does NOT drop anything).
--
-- Why: relying on a custom `x-player-hash` HTTP header for RLS proved fragile
-- (the publishable-key client path / PostgREST didn't surface it reliably).
-- Instead the browser calls this SECURITY DEFINER function, which verifies the
-- passcode hash against `players` and enforces the kickoff lock in its own body,
-- then performs the upsert. The function owner's privileges do the write, so it
-- no longer depends on per-row INSERT/UPDATE policies or request headers.
-- ============================================================================

create or replace function upsert_prediction(
  p_player_id uuid,
  p_match_id  uuid,
  p_hash      text,
  p_home      int,
  p_away      int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kickoff timestamptz;
begin
  -- 1. Verify the caller owns this player row (passcode hash must match).
  if not exists (
    select 1 from players
    where id = p_player_id and passcode_hash = p_hash
  ) then
    raise exception 'auth: passcode does not match this player';
  end if;

  -- 2. Enforce the per-match kickoff lock.
  select kickoff_at into v_kickoff from matches where id = p_match_id;
  if v_kickoff is null then
    raise exception 'no such match';
  end if;
  if v_kickoff <= now() then
    raise exception 'match has kicked off; predictions are locked';
  end if;

  -- 3. Validate score range.
  if p_home < 0 or p_home > 99 or p_away < 0 or p_away > 99 then
    raise exception 'score out of range';
  end if;

  -- 4. Upsert the prediction.
  insert into predictions (player_id, match_id, pred_home, pred_away, updated_at)
  values (p_player_id, p_match_id, p_home, p_away, now())
  on conflict (player_id, match_id)
  do update set pred_home = excluded.pred_home,
                pred_away = excluded.pred_away,
                updated_at = now();
end;
$$;

-- Allow the public roles to call it. The function body does the real auth.
grant execute on function upsert_prediction(uuid, uuid, text, int, int) to anon, authenticated;
