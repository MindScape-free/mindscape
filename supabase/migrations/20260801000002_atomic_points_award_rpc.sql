-- ─── Atomic Points Award & Profile Increment RPCs ────────────────────
-- Protects user_points ledger against race conditions via row locks.
-- Adds function-level authorization checks to increment_user_profile.

create or replace function award_user_points_atomic(
  p_user_id uuid,
  p_event_type text,
  p_base_points int,
  p_cap int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today text := to_char(now(), 'YYYY-MM-DD');
  v_row record;
  v_used int := 0;
  v_new_total int;
  v_ledger jsonb;
  v_daily_caps jsonb;
begin
  -- P0: only service_role may award points for another user; anon is blocked
  -- (anon also has auth.uid() = NULL, so auth.role() is the discriminator).
  if auth.role() <> 'service_role' and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'Not authorized to award points for another user';
  end if;

  -- Lock user_points row to prevent concurrent lost updates
  select * into v_row from user_points where user_id = p_user_id for update;

  if not found then
    v_ledger := '{"totalPoints": 0, "level": 1, "rank": "Spark"}'::jsonb;
    v_daily_caps := jsonb_build_object('date', v_today, 'caps', jsonb_build_object(p_event_type, p_base_points));
    v_new_total := p_base_points;

    insert into user_points (user_id, ledger, daily_caps, updated_at)
    values (p_user_id, jsonb_set(v_ledger, '{totalPoints}', to_jsonb(p_base_points)), v_daily_caps, now());
  else
    v_daily_caps := v_row.daily_caps;
    if v_daily_caps->>'date' = v_today then
      v_used := coalesce((v_daily_caps->'caps'->>p_event_type)::int, 0);
    else
      v_daily_caps := jsonb_build_object('date', v_today, 'caps', '{}'::jsonb);
      v_used := 0;
    end if;

    if p_cap > 0 and v_used >= p_cap then
      return jsonb_build_object('awarded', false, 'reason', 'cap_exceeded');
    end if;

    v_used := v_used + p_base_points;
    v_daily_caps := jsonb_set(v_daily_caps, ARRAY['caps', p_event_type], to_jsonb(v_used));
    v_new_total := coalesce((v_row.ledger->>'totalPoints')::int, 0) + p_base_points;
    v_ledger := jsonb_set(v_row.ledger, '{totalPoints}', to_jsonb(v_new_total));

    update user_points
    set ledger = v_ledger, daily_caps = v_daily_caps, updated_at = now()
    where user_id = p_user_id;
  end if;

  return jsonb_build_object('awarded', true, 'totalPoints', v_new_total);
end;
$$;

create or replace function increment_user_profile(
  p_user_id uuid,
  p_field text,
  p_amount int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Enforce function-level ownership check unless called by service_role.
  -- NOTE: must also block anon (auth.uid() is NULL for anon AND service_role),
  -- hence the explicit `auth.uid() is null` clause.
  if auth.role() <> 'service_role' and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'Unauthorized profile modification for user %', p_user_id;
  end if;

  execute format('
    insert into user_profiles (user_id, %I, updated_at)
    values ($1, $2, now())
    on conflict (user_id) do update
    set %I = coalesce(user_profiles.%I, 0) + $2,
        updated_at = now()', p_field, p_field, p_field)
  using p_user_id, p_amount;
end;
$$;

-- ─── Close the PostgREST RPC surface ───────────────────────────────
-- Neither award_user_points_atomic nor the (p_field, p_amount) overload of
-- increment_user_profile has ANY first-party caller (src + migrations). They
-- were PUBLIC-executable via PostgREST, and the guard only blocks cross-user
-- calls — allowing authenticated self-award of arbitrary points (p_cap = 0
-- disables the cap). Restrict both to service_role only. REVOKE is placed
-- AFTER the creates (REVOKE has no IF EXISTS clause).
revoke execute on function public.award_user_points_atomic(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.award_user_points_atomic(uuid, text, int, int) to service_role;

revoke execute on function public.increment_user_profile(uuid, text, int) from public, anon, authenticated;
grant execute on function public.increment_user_profile(uuid, text, int) to service_role;
