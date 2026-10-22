# Security Model

Every visitor holds a Supabase session (anonymous, or upgraded in place by
OAuth), so `auth.uid()` is always available. The database enforces who can
read and write what. The client's own checks (`filterVisibleVotes()`, hiding
leader buttons) are presentation only.

The migrations in `supabase/migrations/` are the source of truth. The SQL
suites in `supabase/tests/` exercise every rule below.

## Who can read what

A **member** of a room is anyone with a participant row in it, active or not.

| Table | Readable by |
| --- | --- |
| `rooms` | Members. Others find one room by its code through `get_room_by_code()`; rooms cannot be listed. |
| `participants` | Members of that room |
| `stories` | Members of that room |
| `votes` | Your own vote always. Others' votes only once revealed, and only to members of the room. |
| `vote_receipts` | Members of the story's room. Says who has voted, never what. |
| `profiles` | Only your own |

## Who can write what

Clients hold no INSERT privilege on `rooms` or `participants`, and UPDATE is
limited by column privileges. RLS grants per row; column privileges are what
stop a client rewriting a column of a row it is allowed to touch.

| Action | How |
| --- | --- |
| Create a room | `create_room(room_name, scale, display_name)`. The creator becomes leader in the same transaction. |
| Join or rejoin | `join_room(room_id, display_name)`. Leadership is granted only if the room has no usable leader, under a lock. |
| Rename yourself, leave | UPDATE on your own `participants` row: `name`, `is_active`, `joined_at` only |
| Rename the room, change scale | Leader only: UPDATE `rooms.name`, `rooms.point_scale` |
| Add or edit stories | Leader only |
| Switch the active story | Leader only: `set_active_story(story_id)` |
| Vote | Your own vote only, a value on the room's scale, until the story is revealed |
| Reveal | Leader only: `reveal_votes(story_id)`. Sets `stories.revealed_at` and `final_average`. |
| Vote again | Leader only: `revote_story(story_id)` copies the story into a fresh round |

`is_leader`, `room_id`, `user_id` and `rooms.leader_id` are never writable by a
client. When the leader leaves (`is_active` set to false), a trigger hands
leadership to the longest-present active participant.

## Abuse limits

- Anonymous sign-ins are rate limited per IP by Supabase Auth. Cloudflare
  Turnstile can be required on top: set `VITE_TURNSTILE_SITE_KEY` and enable
  CAPTCHA protection in the Supabase dashboard together.
- `purge_stale_anonymous_users()` runs nightly via `pg_cron` and removes
  anonymous users with no session activity for 90 days.
- Names, titles and descriptions have length limits matching
  `src/lib/schemas.ts`.

## Running the SQL suites

Against a local stack (`npm run supabase:start`):

```bash
DB_URL=$(npx supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')
for f in supabase/tests/*_test.sql; do psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Each suite runs in a transaction, rolls back, and prints a "passed" line.
