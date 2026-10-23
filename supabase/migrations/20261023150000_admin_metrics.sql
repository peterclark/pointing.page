-- Admin-only usage metrics for the /admin page.
--
-- Every read policy is scoped to the rooms a caller belongs to, so nobody can
-- count across rooms through the API. admin_metrics() is SECURITY DEFINER and
-- checks the caller against the admins table before it reads anything.
--
-- Admins are listed by auth user id, not by email: the id is what auth.uid()
-- returns, it never changes when a provider email does, and an anonymous guest
-- can never hold an id that is on the list.

-- ============================================================================
-- Who is an admin
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admins IS
  'Auth users who may call admin_metrics(). Edited by hand in the SQL editor.';

-- RLS with no policies: no client can read or change the list.
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admins FROM PUBLIC, anon, authenticated;

-- Peter's signed-in account in production. Elsewhere the id does not exist and
-- nothing is inserted.
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users
WHERE id = 'e174df7f-6f55-448e-8062-d060993e279c' AND NOT is_anonymous
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = (SELECT auth.uid()));
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'True when the caller is listed in admins. Lets the client show the admin page.';

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- The metrics
-- ============================================================================
--
-- Days and hours are bucketed in UTC; the page shifts hours to local time.
-- "Users" are the auth users that exist now: anonymous guests idle for 90 days
-- are purged nightly, so the guest count is a rolling one.

CREATE OR REPLACE FUNCTION public.admin_metrics(days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  days := LEAST(GREATEST(days, 1), 365);

  WITH
  room_sizes AS (
    SELECT r.id, r.created_at, r.point_scale, count(p.id) AS people
    FROM rooms r
    LEFT JOIN participants p ON p.room_id = r.id
    GROUP BY r.id
  ),
  room_stories AS (
    SELECT room_id, count(*) FILTER (WHERE revealed_at IS NOT NULL) AS revealed
    FROM stories
    GROUP BY room_id
  ),
  -- Anything a person did, for "active" counts and the hour-of-day chart.
  activity AS (
    SELECT room_id, joined_at AS at FROM participants
    UNION ALL
    SELECT room_id, created_at FROM stories
    UNION ALL
    SELECT s.room_id, v.created_at FROM votes v JOIN stories s ON s.id = v.story_id
  ),
  calendar AS (
    SELECT generate_series(
      date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => days - 1),
      date_trunc('day', now() AT TIME ZONE 'UTC'),
      INTERVAL '1 day'
    )::date AS day
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'users', (
      SELECT jsonb_build_object(
        'anonymous', count(*) FILTER (WHERE is_anonymous),
        'registered', count(*) FILTER (WHERE NOT is_anonymous),
        'new_7d', count(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
        -- Guests who joined two or more rooms.
        'returning', (
          SELECT count(*) FROM (
            SELECT user_id FROM participants
            WHERE user_id IS NOT NULL
            GROUP BY user_id HAVING count(*) > 1
          ) r
        )
      )
      FROM auth.users
    ),
    'rooms', (
      SELECT jsonb_build_object(
        'total', count(*),
        'last_7d', count(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
        'active_24h', (
          SELECT count(DISTINCT room_id) FROM activity
          WHERE at >= now() - INTERVAL '24 hours'
        ),
        -- Rooms that got as far as revealing a story.
        'pointed', (SELECT count(*) FROM room_stories WHERE revealed > 0),
        'avg_people', round(avg(people), 1),
        'solo', count(*) FILTER (WHERE people <= 1),
        'max_people', COALESCE(max(people), 0),
        'fibonacci', count(*) FILTER (WHERE point_scale = 'fibonacci'),
        't_shirt', count(*) FILTER (WHERE point_scale = 't-shirt')
      )
      FROM room_sizes
    ),
    'stories', (
      SELECT jsonb_build_object(
        'total', count(*),
        'revealed', count(*) FILTER (WHERE revealed_at IS NOT NULL),
        'votes', (SELECT count(*) FROM votes),
        'avg_votes', (
          SELECT round(avg(n), 1) FROM (
            SELECT count(v.id) AS n
            FROM stories s LEFT JOIN votes v ON v.story_id = s.id
            WHERE s.revealed_at IS NOT NULL
            GROUP BY s.id
          ) per_story
        )
      )
      FROM stories
    ),
    'daily', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', c.day,
        'rooms', (SELECT count(*) FROM rooms r
                  WHERE (r.created_at AT TIME ZONE 'UTC')::date = c.day),
        'stories', (SELECT count(*) FROM stories s
                    WHERE (s.revealed_at AT TIME ZONE 'UTC')::date = c.day),
        'people', (SELECT count(*) FROM participants p
                   WHERE (p.joined_at AT TIME ZONE 'UTC')::date = c.day)
      ) ORDER BY c.day)
      FROM calendar c
    ),
    'room_sizes', (
      SELECT jsonb_agg(jsonb_build_object('size', b.size, 'rooms', b.rooms) ORDER BY b.size)
      FROM (
        SELECT LEAST(people, 10) AS size, count(*) AS rooms
        FROM room_sizes GROUP BY 1
      ) b
    ),
    'hours', (
      SELECT jsonb_agg(jsonb_build_object('hour', h.hour, 'events', h.events) ORDER BY h.hour)
      FROM (
        SELECT g.hour, count(a.at) AS events
        FROM generate_series(0, 23) AS g(hour)
        LEFT JOIN activity a
          ON extract(hour FROM a.at AT TIME ZONE 'UTC') = g.hour
         AND a.at >= now() - make_interval(days => days)
        GROUP BY g.hour
      ) h
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.admin_metrics(INTEGER) IS
  'Usage metrics across every room for the admin page. Raises unless the '
  'caller is in admins. `days` sets the window for the daily and hourly charts.';

REVOKE EXECUTE ON FUNCTION public.admin_metrics(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_metrics(INTEGER) TO authenticated;
