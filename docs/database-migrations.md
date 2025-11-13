# Database Migration Workflow

This guide documents the complete migration workflow for the Story Pointer application using Supabase CLI. It covers creating new migrations, applying them to different environments, rolling back changes, and checking migration status.

## Table of Contents

1. [Overview](#overview)
2. [Creating New Migrations](#creating-new-migrations)
3. [Applying Migrations](#applying-migrations)
4. [Rolling Back Migrations](#rolling-back-migrations)
5. [Checking Migration Status](#checking-migration-status)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

### Migration Strategy

Story Pointer uses Supabase CLI for all schema changes with migrations stored in `/supabase/migrations/`. This approach ensures:

- **Version Control**: All migrations are tracked in git
- **Reproducibility**: Schema changes can be applied consistently across environments
- **Auditability**: Complete history of database changes
- **Rollback Capability**: Ability to revert changes if needed

### Migration File Naming

Migrations use the format: `<timestamp>_<description>.sql`

Example: `20251109020336_initial_schema.sql`

### Current Migrations

The application currently has 5 migration files:

1. `20251109020336_initial_schema.sql` - Core tables (rooms, profiles, participants, stories, votes)
2. `20251109020411_functions_and_triggers.sql` - Database automation (room codes, leader promotion)
3. `20251109041328_rls_policies.sql` - Row Level Security policies for all tables
4. `20251109042817_fix_participants_rls.sql` - Fix for participants SELECT policy
5. `20251109043114_fix_rooms_select_anonymous.sql` - Fix for anonymous room access

## Creating New Migrations

### Step 1: Generate Migration File

Use the Supabase CLI to create a new migration file:

```bash
supabase migration new <description>
```

Example:

```bash
supabase migration new add_room_archives_table
```

This creates a new file: `/supabase/migrations/<timestamp>_add_room_archives_table.sql`

### Step 2: Write Migration SQL

Edit the generated file and add your SQL statements:

```sql
-- Add new column to existing table
ALTER TABLE rooms ADD COLUMN archived_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX idx_rooms_archived_at ON rooms(archived_at);

-- Add comment for documentation
COMMENT ON COLUMN rooms.archived_at IS 'Timestamp when room was archived (null = active)';
```

### Step 3: Make Migration Idempotent

Ensure your migration can be run multiple times safely:

```sql
-- Use IF NOT EXISTS for new objects
CREATE TABLE IF NOT EXISTS room_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use DROP IF EXISTS before creating functions/triggers
DROP TRIGGER IF EXISTS on_room_archive ON rooms;
DROP FUNCTION IF EXISTS handle_room_archive();

-- Now create the function
CREATE OR REPLACE FUNCTION handle_room_archive()
RETURNS TRIGGER AS $$
BEGIN
  -- Function logic here
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_room_archive
AFTER UPDATE ON rooms
FOR EACH ROW
WHEN (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL)
EXECUTE FUNCTION handle_room_archive();
```

### Step 4: Test Migration Locally

Apply the migration to your local dev environment first:

```bash
# Link to dev project (if not already linked)
supabase link --project-ref <dev-project-ref>

# Apply migration
supabase db push

# Verify changes
supabase db diff
```

If `supabase db diff` shows no differences, your migration was successful.

### Step 5: Commit Migration

Once tested, commit the migration file to git:

```bash
git add supabase/migrations/<timestamp>_<description>.sql
git commit -m "Add migration: <description>"
```

## Applying Migrations

### Development Environment

Development migrations are typically applied immediately after creation:

```bash
# Ensure you're linked to dev project
supabase link --project-ref <dev-project-ref>

# Apply all pending migrations
supabase db push

# Verify
supabase migration list
```

### Production Environment

Production migrations require more careful steps:

#### Pre-Migration Checklist

- [ ] Migration tested in dev environment
- [ ] Migration reviewed by team
- [ ] Migration documented in git commit message
- [ ] Database backup created (see below)
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan prepared

#### Step 1: Create Database Backup

**IMPORTANT**: Always backup before production migrations.

Via Supabase Dashboard:
1. Navigate to: Database > Backups
2. Click "Create backup"
3. Wait for backup to complete
4. Note the backup timestamp

Alternatively, use pg_dump:
```bash
# Get connection string from Supabase Dashboard (Database > Connection pooling)
pg_dump "postgresql://[user]:[password]@[host]:5432/postgres" > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Step 2: Link to Production Project

```bash
supabase link --project-ref <prod-project-ref>
```

You'll be prompted to authenticate with Supabase.

#### Step 3: Review Pending Migrations

Check which migrations will be applied:

```bash
supabase migration list
```

Look for migrations marked as "Local only" - these will be applied.

#### Step 4: Apply Migrations

```bash
# Apply all pending migrations
supabase db push

# Alternative: apply specific migration file
supabase db push --include-all --include-schema <migration-file>
```

#### Step 5: Verify Migration

Check that migration was applied successfully:

```bash
# Check migration status
supabase migration list

# Verify schema matches expectations
supabase db diff

# Test critical functionality
# (Use your application's health check endpoints or manual tests)
```

#### Step 6: Monitor for Issues

After deployment:
- Monitor application logs for errors
- Check database performance metrics
- Verify user-facing features work correctly
- Be prepared to rollback if issues arise

### Multi-Environment Deployment Order

When deploying to multiple environments, always follow this order:

1. **Development** - Test and iterate
2. **Production** - Deploy when stable

**Note**: Story Pointer uses only dev and production environments due to Supabase free tier limitations.

## Rolling Back Migrations

### Understanding Rollbacks

Supabase CLI does not have built-in "down" migrations. Rollbacks must be done manually by creating a new migration that reverts the changes.

### Rollback Process

#### Step 1: Create Rollback Migration

```bash
supabase migration new rollback_<original_description>
```

#### Step 2: Write Rollback SQL

Write SQL that reverses the original migration:

**Original Migration** (add column):
```sql
ALTER TABLE rooms ADD COLUMN archived_at TIMESTAMPTZ;
```

**Rollback Migration** (remove column):
```sql
ALTER TABLE rooms DROP COLUMN IF EXISTS archived_at;
```

**Original Migration** (create table):
```sql
CREATE TABLE room_archives (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id)
);
```

**Rollback Migration** (drop table):
```sql
DROP TABLE IF EXISTS room_archives CASCADE;
```

#### Step 3: Apply Rollback

```bash
# Test in dev first
supabase link --project-ref <dev-project-ref>
supabase db push

# If successful, apply to production
supabase link --project-ref <prod-project-ref>
supabase db push
```

### Emergency Rollback

If you need to immediately revert production:

#### Option 1: Restore from Backup

Via Supabase Dashboard:
1. Navigate to: Database > Backups
2. Find the backup from before the migration
3. Click "Restore"
4. Confirm restoration

**WARNING**: This will lose all data changes since the backup.

#### Option 2: Direct SQL Rollback

If you have the connection string, you can execute rollback SQL directly:

```bash
psql "postgresql://[user]:[password]@[host]:5432/postgres" -f rollback_migration.sql
```

Only use this in emergencies when Supabase CLI is unavailable.

## Checking Migration Status

### List All Migrations

```bash
supabase migration list
```

Output shows:
- **Local only**: Migration exists locally but not applied to database
- **Remote only**: Migration applied to database but not in local files
- **Both**: Migration exists locally and applied to database

Example output:
```
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
    20251109020336 │ 20251109020336 │ 2025-11-09 02:03:36
    20251109020411 │ 20251109020411 │ 2025-11-09 02:04:11
    20251109041328 │ 20251109041328 │ 2025-11-09 04:13:28
```

### Check for Schema Drift

Detect if database schema differs from migration files:

```bash
supabase db diff
```

If output is empty, database matches migration files.

If output shows SQL statements, there are unapplied changes or manual modifications.

### Inspect Database Schema

View current database structure:

```bash
# Show all tables
supabase db remote exec "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# Show table columns
supabase db remote exec "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rooms';"

# Show indexes
supabase db remote exec "SELECT indexname FROM pg_indexes WHERE tablename = 'rooms';"
```

## Best Practices

### 1. Always Test in Dev First

Never apply untested migrations directly to production.

```bash
# Development testing workflow
supabase link --project-ref <dev-project-ref>
supabase db push
# Test application functionality
# Fix any issues
# Commit migration to git
```

### 2. Keep Migrations Small and Focused

Each migration should represent a single logical change:

**Good**:
- `add_room_archives_table.sql` - Creates one table
- `add_room_archived_at_column.sql` - Adds one column
- `create_archive_trigger.sql` - Creates one trigger

**Bad**:
- `big_refactor.sql` - Changes multiple tables, adds features, modifies RLS

### 3. Document Complex Migrations

Add comments explaining the purpose and impact:

```sql
-- Migration: Add room archival feature
-- Purpose: Allow rooms to be archived instead of deleted
-- Impact: Adds new column, does not affect existing functionality
-- Rollback: Remove archived_at column (see rollback_add_room_archived_at_column.sql)

ALTER TABLE rooms ADD COLUMN archived_at TIMESTAMPTZ;
CREATE INDEX idx_rooms_archived_at ON rooms(archived_at) WHERE archived_at IS NOT NULL;

-- Update RLS policies to filter archived rooms
DROP POLICY IF EXISTS rooms_select ON rooms;
CREATE POLICY rooms_select ON rooms FOR SELECT
USING (
  archived_at IS NULL AND
  EXISTS (
    SELECT 1 FROM participants
    WHERE participants.room_id = rooms.id
    AND participants.user_id = auth.uid()
  )
);
```

### 4. Create Database Snapshots

Before major migrations, create a database snapshot:

```bash
# Via Supabase Dashboard: Database > Backups > Create backup
# Or via pg_dump (if you have direct database access)
```

### 5. Use Transactions for Related Changes

Group related operations in a transaction:

```sql
BEGIN;

-- Multiple related changes
ALTER TABLE rooms ADD COLUMN archived_at TIMESTAMPTZ;
CREATE INDEX idx_rooms_archived_at ON rooms(archived_at);
UPDATE rooms SET archived_at = NOW() WHERE is_active = false;

COMMIT;
```

### 6. Version Control Everything

All migrations must be committed to git:

```bash
git add supabase/migrations/*.sql
git commit -m "Add room archival migration"
git push origin main
```

### 7. Prepare Rollback Plans

For every migration, know how to rollback:

1. Document rollback steps in migration comments
2. Create rollback migration files for complex changes
3. Test rollback procedure in dev environment

### 8. Monitor After Deployment

After applying production migrations:
- Check application logs for database errors
- Monitor query performance (Supabase Dashboard > Database > Performance)
- Verify user-facing features work correctly
- Be prepared to execute rollback if issues arise

## Troubleshooting

### Issue: "Migration already applied"

**Symptom**: `supabase db push` says migration already applied, but `supabase migration list` shows it as "Local only"

**Solution**: The migration was partially applied. Check what was actually created:

```bash
supabase db diff
```

If output is empty, migration was fully applied. Update local tracking:

```bash
# This should not be necessary, but if tracking is broken:
supabase db push --no-verify
```

### Issue: Migration fails mid-execution

**Symptom**: Migration fails halfway through, database is in inconsistent state

**Solution**: Manually inspect and fix:

```bash
# Check what was created
supabase db remote exec "SELECT table_name FROM information_schema.tables WHERE table_name = 'your_new_table';"

# If table was created, drop it
supabase db remote exec "DROP TABLE IF EXISTS your_new_table CASCADE;"

# Fix migration file and reapply
supabase db push
```

### Issue: Schema drift detected

**Symptom**: `supabase db diff` shows unexpected SQL statements

**Solution**: Someone made manual changes via Supabase Dashboard or direct SQL.

Options:
1. **Reset local schema** (if remote is correct):
   ```bash
   supabase db pull
   ```

2. **Apply local schema** (if local is correct):
   ```bash
   supabase db push --no-verify
   ```

3. **Create migration from diff** (to track manual changes):
   ```bash
   supabase db diff > supabase/migrations/$(date +%Y%m%d%H%M%S)_manual_changes.sql
   supabase db push
   ```

### Issue: RLS policy blocks migration

**Symptom**: Migration fails with permission denied error

**Solution**: RLS policies can block even superuser operations. Temporarily disable RLS:

```sql
-- In your migration file, add at the top:
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Your migration changes here
ALTER TABLE your_table ADD COLUMN new_column TEXT;

-- Re-enable RLS at the end:
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### Issue: Foreign key constraint violation

**Symptom**: Migration fails with "violates foreign key constraint"

**Solution**: Existing data violates the new constraint. Fix data first:

```sql
-- Example: Adding foreign key constraint
-- First, fix orphaned records
DELETE FROM participants WHERE room_id NOT IN (SELECT id FROM rooms);

-- Now add the constraint
ALTER TABLE participants
ADD CONSTRAINT participants_room_id_fkey
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
```

### Issue: Timeout during migration

**Symptom**: Migration times out on large tables

**Solution**: Break migration into smaller steps or run during low-traffic periods:

```sql
-- Instead of one big operation:
-- ALTER TABLE large_table ADD COLUMN new_column TEXT DEFAULT 'value';

-- Do it in steps:
-- Step 1: Add nullable column
ALTER TABLE large_table ADD COLUMN new_column TEXT;

-- Step 2: Populate in batches (run multiple times)
UPDATE large_table SET new_column = 'value' WHERE new_column IS NULL LIMIT 1000;

-- Step 3: Set default and not null (after all rows populated)
ALTER TABLE large_table ALTER COLUMN new_column SET DEFAULT 'value';
ALTER TABLE large_table ALTER COLUMN new_column SET NOT NULL;
```

## Getting Help

If you encounter issues not covered here:

1. **Check Supabase Docs**: https://supabase.com/docs/guides/cli
2. **Check Migration Files**: Review `/supabase/migrations/` for examples
3. **Check Application Docs**: See `/docs/database-schema.md` for schema details
4. **Supabase Support**: https://supabase.com/support (for urgent production issues)

## Related Documentation

- [Environment Setup Guide](/docs/environment-setup.md) - Setting up dev environments
- [Database Schema Documentation](/docs/database-schema.md) - Complete schema reference
- [Database Operations Guide](/docs/database-operations.md) - Using database in application code
- [RLS Policies Documentation](/docs/rls-policies.md) - Security and access control
