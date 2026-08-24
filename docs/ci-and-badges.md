# CI and Status Badges

## Workflows

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **CI** | `.github/workflows/ci.yml` | push to `main`, every PR, manual | Lint + typecheck, tests with coverage, production build, advisory dependency audit |
| **Badges** | `.github/workflows/badges.yml` | after CI completes on `main` | Publishes shields.io badge JSON to the orphan `badges` branch |
| **Deploy Database Migrations** | `.github/workflows/deploy-migrations.yml` | push to `main` touching `supabase/migrations/**`, manual | Links the Supabase project and runs `supabase db push` |

### CI jobs

The four CI jobs run in parallel; each installs dependencies with `npm ci`
against the `actions/setup-node` npm cache.

- **quality** — `npm run lint` and `npm run typecheck`.
- **test** — `npm run test:coverage`. Writes a coverage table to the run
  summary and uploads the full `coverage/` directory as an artifact (14-day
  retention). Needs no secrets: every Supabase call in these suites is mocked
  at the module boundary.
- **build** — `npm run build`, uploading `dist/` as an artifact. Vite inlines
  `VITE_SUPABASE_*` at build time; the workflow falls back to obviously-fake
  placeholders so the job is green before the secrets are configured.
- **audit** — `npm audit --audit-level=high`, advisory only
  (`continue-on-error: true`). A new upstream advisory should not block an
  unrelated PR, so read the job summary rather than the red X.

Live-database suites (`src/tests/db/`) deliberately do **not** run in CI. They
need a reachable Supabase instance, and their cleanup helper deletes every room
whose name starts with `Test`. Run them locally against a disposable instance:

```bash
npm run supabase:start
npm run supabase:use-local
npm run test:db
```

## Required secrets

| Secret | Used by | Required? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | CI → build | Optional. Falls back to a placeholder. |
| `VITE_SUPABASE_ANON_KEY` | CI → build | Optional. Falls back to a placeholder. |
| `SUPABASE_ACCESS_TOKEN` | deploy-migrations | Yes |
| `SUPABASE_PROJECT_REF` | deploy-migrations | Yes |
| `SUPABASE_DB_PASSWORD` | deploy-migrations | Yes |

`GITHUB_TOKEN` is provided automatically; the badges workflow needs nothing else.

## How the badges work

There is no third-party coverage service in the loop. After CI finishes on
`main`, the Badges workflow:

1. Downloads the `coverage` artifact from the CI run that triggered it.
2. Runs `scripts/coverage-badge.mjs`, which turns `coverage-summary.json` into
   [shields.io endpoint JSON](https://shields.io/badges/endpoint-badge) with a
   colour picked from the line-coverage percentage.
3. Writes a matching `build.json` from that CI run's conclusion.
4. Commits both to the orphan `badges` branch.

shields.io then renders the badge by reading those files' raw URLs.

To regenerate the coverage badge locally:

```bash
npm run test:coverage
node scripts/coverage-badge.mjs   # writes badges/coverage.json
```

## ⚠️ This repository is private

shields.io and GitHub's own badge endpoint fetch badge data **anonymously**.
While `peterclark/pointing.page` is private, both `raw.githubusercontent.com`
and the workflow badge SVG return 404 to anyone who is not signed in as you —
so a badge pasted into a résumé will render as broken or "inaccessible" for
every recruiter who sees it.

Two ways to fix that:

### Option A — make the repository public

Nothing else changes; every badge URL below starts working immediately. Before
flipping visibility, note that the repository currently contains a committed
Supabase project URL and anon key (`.env.local.cloud.backup`,
`verify-rls-policies.html`) guarding a database whose RLS policies are all
`USING (true)`. Rotate those and tighten the policies first — see the review
notes for detail.

### Option B — stay private, publish badge data to a public gist

Badge JSON is not sensitive, so it can live in a public gist even when the code
does not.

1. Create a **public** gist containing `coverage.json` and `build.json`
   (any placeholder content).
2. Add two repository secrets: `GIST_ID` (the gist's hash) and `GIST_TOKEN`
   (a fine-grained PAT with **Gists: read and write**).
3. Add a step to `.github/workflows/badges.yml` that PATCHes the gist:

   ```yaml
   - name: Publish badge data to gist
     if: env.GIST_TOKEN != ''
     env:
       GIST_TOKEN: ${{ secrets.GIST_TOKEN }}
       GIST_ID: ${{ secrets.GIST_ID }}
     run: |
       payload=$(node -e '
         const fs = require("fs");
         const files = {};
         for (const f of ["coverage.json", "build.json"]) {
           files[f] = { content: fs.readFileSync("badges/" + f, "utf8") };
         }
         process.stdout.write(JSON.stringify({ files }));
       ')
       curl -sSf -X PATCH \
         -H "Authorization: Bearer $GIST_TOKEN" \
         -H "Accept: application/vnd.github+json" \
         -d "$payload" \
         "https://api.github.com/gists/$GIST_ID" > /dev/null
   ```

4. Point the badge URLs at
   `https://gist.githubusercontent.com/peterclark/$GIST_ID/raw/coverage.json`.

## Badge markdown

Once the repository is public (Option A):

```markdown
[![CI](https://github.com/peterclark/pointing.page/actions/workflows/ci.yml/badge.svg)](https://github.com/peterclark/pointing.page/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpeterclark%2Fpointing.page%2Fbadges%2Fcoverage.json)](https://github.com/peterclark/pointing.page/actions/workflows/ci.yml)
```

The URL passed to shields.io must be percent-encoded, which is why the
`raw.githubusercontent.com` address appears escaped above.
