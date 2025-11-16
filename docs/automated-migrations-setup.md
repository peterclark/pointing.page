# Automated Database Migrations Setup

This document explains how to set up automated Supabase migrations that run when PRs are merged to `main`.

## How It Works

When you merge a PR to `main` that includes new migration files in `supabase/migrations/`, GitHub Actions will automatically:
1. Link to your Supabase production project
2. Run `supabase db push` to apply new migrations
3. Notify success or failure

## Setup Instructions

### 1. Get Supabase Project Reference

Your project reference is in the Supabase Dashboard URL:
```
https://supabase.com/dashboard/project/[PROJECT_REF]
                                         ^^^^^^^^^^^
```

Or get it via CLI:
```bash
supabase projects list
```

### 2. Generate Supabase Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it: "GitHub Actions - Migrations"
4. Copy the token (you won't see it again!)

### 3. Get Database Password

1. Go to: Supabase Dashboard > Project Settings > Database
2. Under "Connection string", click "Reset database password" if needed
3. Copy the password

### 4. Add GitHub Secrets

Go to: GitHub Repository > Settings > Secrets and variables > Actions

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SUPABASE_ACCESS_TOKEN` | `sbp_xxx...` | Personal access token from step 2 |
| `SUPABASE_PROJECT_REF` | `abcdefghijk` | Project reference from step 1 |
| `SUPABASE_DB_PASSWORD` | `your-password` | Database password from step 3 |

**To add a secret:**
1. Click "New repository secret"
2. Enter name and value
3. Click "Add secret"

### 5. Verify Setup

After setting up secrets:

1. **Test the workflow:**
   - Create a test migration:
     ```bash
     npx supabase migration new test_workflow
     ```
   - Add simple SQL to the file:
     ```sql
     -- Test migration for GitHub Actions
     SELECT 1;
     ```
   - Commit and push to a branch
   - Create and merge a PR to `main`
   - Go to: GitHub > Actions tab
   - Watch the "Deploy Database Migrations" workflow run

2. **Check Supabase:**
   - Verify the migration was applied
   - Check migration history:
     ```sql
     SELECT * FROM supabase_migrations.schema_migrations
     ORDER BY version DESC;
     ```

## Workflow Behavior

### When It Runs
- Only on push to `main` branch
- Only when files in `supabase/migrations/` are changed
- Skips if no migration files changed

### What It Does
1. Checks out the code
2. Sets up Node.js and Supabase CLI
3. Links to production Supabase project
4. Runs all new migrations
5. Reports success or failure

### Error Handling
If migrations fail:
- GitHub Actions will show a red ❌
- Check the logs for SQL errors
- Fix the issue and merge another PR with corrections
- Never edit migrations that have been applied - create new ones

## Best Practices

### Migration Files
- Always use `npx supabase migration new <name>` to create migrations
- Migrations should be **idempotent** (safe to run multiple times)
- Use `IF NOT EXISTS` clauses where appropriate
- Test migrations locally first:
  ```bash
  npx supabase db reset
  ```

### Security
- Never commit database passwords to git
- Rotate access tokens periodically
- Use least-privilege access tokens

### Rollback Strategy
If a migration breaks production:
1. Create a rollback migration that undoes the changes
2. Merge it to `main` quickly
3. Or manually connect and fix via SQL Editor

## Troubleshooting

### "Authentication failed"
- Check `SUPABASE_ACCESS_TOKEN` is correct
- Token may have expired - generate a new one

### "Project not found"
- Check `SUPABASE_PROJECT_REF` matches your project
- Ensure token has access to this project

### "Permission denied"
- Check `SUPABASE_DB_PASSWORD` is correct
- Ensure database user has required permissions

### Migration fails locally but CI succeeds
- Your local and production databases may be out of sync
- Run `npx supabase db pull` to sync local with production

### Migration succeeds but changes not visible
- Clear browser cache
- Check if RLS policies are blocking access
- Verify in Supabase Dashboard > Table Editor

## Manual Migration (Backup Method)

If automated migrations fail, you can manually apply:

1. Go to: Supabase Dashboard > SQL Editor
2. Copy migration file contents
3. Paste and click "Run"

## Future Enhancements

Consider adding:
- Slack/Discord notifications on migration success/failure
- Run migrations in a transaction
- Automatic rollback on failure
- Dry-run mode to preview changes
- Deploy to staging environment first

## Related Files

- `.github/workflows/deploy-migrations.yml` - GitHub Actions workflow
- `supabase/migrations/` - Migration files directory
- `supabase/config.toml` - Supabase project configuration
