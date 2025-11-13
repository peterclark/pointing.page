# Production Deployment Guide

Complete guide for deploying Story Pointer database schema to production environment.

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Production Environment Setup](#production-environment-setup)
4. [Database Migration Deployment](#database-migration-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Overview

Story Pointer uses a two-environment setup:
- **Development**: For feature development and testing
- **Production**: For live application usage

**Note**: Staging environment is skipped due to Supabase free tier limitations.

### Deployment Strategy

- All schema changes tested in dev environment first
- Manual approval required for production deployments
- Database backups created before each production migration
- Rollback plan prepared for all deployments

## Pre-Deployment Checklist

Before deploying to production, ensure all items are complete:

### Development Testing

- [ ] All migrations tested in dev environment
- [ ] Migration files version controlled in git
- [ ] `supabase migration list` shows all migrations applied locally
- [ ] `supabase db diff` shows no schema drift
- [ ] All integration tests passing (see `/src/tests/`)
- [ ] Real-time subscriptions tested manually

### Code Review

- [ ] Migration SQL reviewed by team member
- [ ] RLS policies reviewed for security implications
- [ ] Indexes reviewed for performance impact
- [ ] Breaking changes documented (if any)

### Documentation

- [ ] Migration documented in git commit message
- [ ] Breaking changes documented in CHANGELOG (if applicable)
- [ ] Team notified of upcoming deployment
- [ ] Rollback plan documented

### Production Readiness

- [ ] Production Supabase project created
- [ ] Environment variables configured (`.env.production`)
- [ ] CORS settings configured for production domain
- [ ] Database backup strategy confirmed
- [ ] Monitoring dashboard access verified

## Production Environment Setup

### Step 1: Create Production Supabase Project

If not already created:

1. Go to https://app.supabase.com/
2. Click "New project"
3. Fill in details:
   - **Name**: `story-pointer-prod`
   - **Database Password**: Use strong generated password (save in password manager)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier (can upgrade later)
4. Wait for project to provision (~2 minutes)

### Step 2: Configure Environment Variables

Create `.env.production`:

```bash
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
```

Get values from Supabase Dashboard:
1. Navigate to: Settings > API
2. Copy "Project URL" → `VITE_SUPABASE_URL`
3. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

**IMPORTANT**: Never commit `.env.production` to git. Add to `.gitignore`.

### Step 3: Configure CORS Settings

Configure allowed origins for production:

1. Navigate to: Authentication > URL Configuration
2. Add Site URL: `https://your-production-domain.com`
3. Add Redirect URLs:
   - `https://your-production-domain.com/*`
   - `https://your-production-domain.com/auth/callback`

**Note**: If production domain is not yet configured, use localhost for initial testing, then update after domain is live.

### Step 4: Link Supabase CLI to Production

```bash
# Link to production project
supabase link --project-ref <prod-project-ref>

# Verify connection
supabase projects list
```

Get `<prod-project-ref>` from:
- Supabase Dashboard: Settings > General > Reference ID
- Or from project URL: `https://<project-ref>.supabase.co`

## Database Migration Deployment

### Step 1: Create Database Backup

**CRITICAL**: Always backup before production migrations.

#### Option A: Via Supabase Dashboard (Recommended)

1. Navigate to: Database > Backups
2. Click "Create backup"
3. Add description: "Pre-migration backup for [migration name]"
4. Wait for backup to complete
5. Note the backup timestamp

#### Option B: Via pg_dump (Manual)

```bash
# Get connection string from Dashboard (Database > Connection pooling)
pg_dump "postgresql://[user]:[password]@[host]:5432/postgres" \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh backup_*.sql
```

### Step 2: Review Migration Files

Review all pending migrations one final time:

```bash
# Check which migrations will be applied
supabase migration list

# Review migration content
cat supabase/migrations/20251109020336_initial_schema.sql
cat supabase/migrations/20251109020411_functions_and_triggers.sql
cat supabase/migrations/20251109041328_rls_policies.sql
cat supabase/migrations/20251109042817_fix_participants_rls.sql
cat supabase/migrations/20251109043114_fix_rooms_select_anonymous.sql
```

### Step 3: Apply Migrations

```bash
# Ensure linked to production
supabase link --project-ref <prod-project-ref>

# Apply all pending migrations
supabase db push

# Expected output:
# Applying migration 20251109020336_initial_schema.sql...
# Applying migration 20251109020411_functions_and_triggers.sql...
# Applying migration 20251109041328_rls_policies.sql...
# Applying migration 20251109042817_fix_participants_rls.sql...
# Applying migration 20251109043114_fix_rooms_select_anonymous.sql...
# ✓ All migrations applied successfully
```

### Step 4: Verify Migration Status

```bash
# Check that all migrations are now marked as applied
supabase migration list

# Expected output:
#        LOCAL      │     REMOTE     │     TIME (UTC)
#  ─────────────────┼────────────────┼──────────────────────
#    20251109020336 │ 20251109020336 │ 2025-11-09 02:03:36
#    20251109020411 │ 20251109020411 │ 2025-11-09 02:04:11
#    20251109041328 │ 20251109041328 │ 2025-11-09 04:13:28
#    20251109042817 │ 20251109042817 │ 2025-11-09 04:28:17
#    20251109043114 │ 20251109043114 │ 2025-11-09 04:31:14

# Verify no schema drift
supabase db diff

# Expected output: (empty - no differences)
```

## Post-Deployment Verification

### Step 1: Smoke Tests via SQL

Run basic queries to verify schema:

```bash
# Check all tables exist
supabase db remote exec "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
"

# Expected output: participants, profiles, rooms, stories, votes

# Check RLS is enabled
supabase db remote exec "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
"

# Expected output: All tables should have rowsecurity = true

# Check functions exist
supabase db remote exec "
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
"

# Expected output: generate_room_code, handle_new_user, promote_new_leader, etc.
```

### Step 2: Test Room Creation

Use the Supabase Dashboard SQL editor:

```sql
-- Test room code generation
SELECT generate_room_code();
-- Should return 8-character code like 'A7B9C2D5'

-- Test room creation
INSERT INTO rooms (name, point_scale, room_code)
VALUES ('Test Room', 'fibonacci', generate_room_code())
RETURNING *;
-- Should return new room with auto-generated room_code

-- Clean up test data
DELETE FROM rooms WHERE name = 'Test Room';
```

### Step 3: Test Authentication Flow

1. Navigate to: Authentication > Users
2. Click "Add user"
3. Enter test email
4. Check that profile was auto-created:

```sql
SELECT p.*
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'test@example.com';
```

### Step 4: Test RLS Policies

Via Supabase Dashboard SQL editor:

```sql
-- Test anonymous room creation (should succeed)
INSERT INTO rooms (name, point_scale, room_code)
VALUES ('RLS Test', 'fibonacci', generate_room_code());

-- Test anonymous participant creation (should succeed)
INSERT INTO participants (room_id, user_id, name)
SELECT id, NULL, 'Test User'
FROM rooms WHERE name = 'RLS Test';

-- Clean up
DELETE FROM rooms WHERE name = 'RLS Test';
```

### Step 5: Test Real-time Subscriptions

Via Supabase Dashboard:

1. Navigate to: Database > Replication
2. Verify replication enabled for:
   - rooms
   - profiles
   - participants
   - stories
   - votes
3. Verify event types selected: INSERT, UPDATE, DELETE

### Step 6: Monitor for Errors

Check logs immediately after deployment:

1. Navigate to: Logs > Explorer
2. Filter by level: "error" and "warning"
3. Look for:
   - RLS policy violations
   - Foreign key constraint errors
   - Function execution errors
   - Connection errors

### Step 7: Test Application Integration

If frontend is deployed:

1. Open production application
2. Test critical flows:
   - Create room
   - Join room
   - Submit vote
   - Reveal votes
3. Check browser console for errors
4. Verify real-time updates work

## Rollback Procedures

### When to Rollback

Rollback if you observe:
- Migration failed mid-execution
- Application errors related to database schema
- Performance degradation
- Data integrity issues

### Rollback Options

#### Option 1: Restore from Backup (Nuclear Option)

**WARNING**: This will lose all data changes since the backup.

Via Supabase Dashboard:
1. Navigate to: Database > Backups
2. Find the backup from before the migration
3. Click "Restore"
4. Confirm restoration
5. Wait for restore to complete (~5-10 minutes)

#### Option 2: Rollback Migration (Preferred)

Create and apply a rollback migration:

```bash
# Create rollback migration
supabase migration new rollback_<description>

# Edit migration file to reverse changes
# Example: If migration added a column, rollback removes it
```

Example rollback for adding a column:

**Original Migration**:
```sql
ALTER TABLE rooms ADD COLUMN archived_at TIMESTAMPTZ;
```

**Rollback Migration**:
```sql
ALTER TABLE rooms DROP COLUMN IF EXISTS archived_at;
```

Apply rollback:
```bash
supabase db push
```

#### Option 3: Manual SQL Rollback (Emergency)

If Supabase CLI is unavailable:

1. Navigate to: SQL Editor in Supabase Dashboard
2. Write and execute rollback SQL
3. Example:

```sql
-- Remove column
ALTER TABLE rooms DROP COLUMN IF EXISTS archived_at;

-- Drop table
DROP TABLE IF EXISTS room_archives CASCADE;

-- Disable RLS
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Drop function
DROP FUNCTION IF EXISTS my_function() CASCADE;
```

### Post-Rollback Steps

1. Verify rollback successful:
   ```bash
   supabase migration list
   supabase db diff
   ```

2. Test application functionality

3. Document rollback in incident report

4. Fix migration issues in dev environment

5. Re-test before attempting deployment again

## Monitoring and Maintenance

### Daily Monitoring

Monitor these metrics in Supabase Dashboard:

1. **Database Performance** (Database > Performance)
   - Query execution time
   - Slow queries (> 1 second)
   - Connection pool usage

2. **Error Logs** (Logs > Explorer)
   - Filter by level: "error"
   - Look for RLS violations
   - Check for constraint violations

3. **Real-time Connections** (Database > Realtime)
   - Active subscriptions count
   - Connection errors

### Weekly Maintenance

1. **Review Backups** (Database > Backups)
   - Verify automatic backups are running
   - Test restore procedure (in dev)

2. **Database Statistics** (Database > Reports)
   - Table sizes
   - Index usage
   - Query performance

3. **Unused Indexes**
   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0 AND idx_tup_read = 0;
   ```

### Monthly Maintenance

1. **Vacuum and Analyze**
   ```sql
   VACUUM ANALYZE;
   ```

2. **Review RLS Policies**
   - Check for overly permissive policies
   - Review security incidents

3. **Database Growth Analysis**
   ```sql
   SELECT
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

### Alerts to Configure

Set up alerts in Supabase Dashboard (if available on your plan):

- Database CPU usage > 80%
- Database disk usage > 80%
- Error rate > 10 per minute
- Real-time connection failures

## Troubleshooting

### Issue: Migration Fails with Permission Error

**Symptom**:
```
Error: permission denied for table rooms
```

**Solution**: RLS policies may be blocking the migration.

```sql
-- Temporarily disable RLS
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Run migration
-- (via supabase db push or manual SQL)

-- Re-enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
```

### Issue: Migration Fails with Foreign Key Violation

**Symptom**:
```
Error: insert or update on table "votes" violates foreign key constraint
```

**Solution**: Clean up orphaned records before applying migration.

```sql
-- Find orphaned records
SELECT * FROM votes
WHERE participant_id NOT IN (SELECT id FROM participants);

-- Option A: Delete orphaned records
DELETE FROM votes
WHERE participant_id NOT IN (SELECT id FROM participants);

-- Option B: Create placeholder participants
INSERT INTO participants (id, room_id, user_id, name)
SELECT DISTINCT votes.participant_id, NULL, NULL, 'Placeholder'
FROM votes
WHERE participant_id NOT IN (SELECT id FROM participants);
```

### Issue: Schema Drift Detected

**Symptom**: `supabase db diff` shows unexpected differences

**Solution**: Someone made manual changes via Supabase Dashboard.

```bash
# Capture manual changes in a migration
supabase db diff > supabase/migrations/$(date +%Y%m%d%H%M%S)_manual_changes.sql

# Review and apply
cat supabase/migrations/*_manual_changes.sql
supabase db push
```

### Issue: Real-time Not Working After Migration

**Symptom**: Subscriptions not receiving events

**Solution**: Re-enable replication for affected tables.

1. Navigate to: Database > Replication
2. Check that replication is enabled for all tables
3. Verify event types are selected (INSERT, UPDATE, DELETE)
4. Click "Save" to apply changes

### Issue: Authentication Trigger Not Firing

**Symptom**: Profiles not being auto-created on signup

**Solution**: Check trigger exists and is enabled.

```sql
-- Check trigger exists
SELECT * FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- If missing, recreate trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

### Issue: Room Code Collisions

**Symptom**: `generate_room_code()` fails with "Failed to generate unique room code"

**Solution**: Room code space is saturated (unlikely with 36^8 combinations).

```sql
-- Check how many rooms exist
SELECT COUNT(*) FROM rooms;

-- If really needed, increase code length in generate_room_code()
-- Edit migration and redeploy
```

### Issue: Application Can't Connect to Database

**Symptom**: "Connection refused" or "Invalid JWT token"

**Solution**: Verify environment variables.

```bash
# Check environment variables are set
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Verify they match Supabase Dashboard values
# Settings > API
```

## Related Documentation

- [Database Migrations Guide](/docs/database-migrations.md) - Migration workflow
- [Database Schema Documentation](/docs/database-schema.md) - Complete schema reference
- [Environment Setup Guide](/docs/environment-setup.md) - Setting up environments
- [Database Operations Guide](/docs/database-operations.md) - Using database in application

## Support

For production issues:
- **Urgent**: Contact Supabase Support (https://supabase.com/support)
- **Non-urgent**: Create issue in project repository
- **Questions**: Check Supabase documentation (https://supabase.com/docs)
