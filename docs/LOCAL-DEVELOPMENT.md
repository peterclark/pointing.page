# Local Supabase Development Guide

## Overview

This project supports running Supabase locally using OrbStack/Docker for fast, offline development with zero cloud costs.

## ✨ Benefits of Local Development

### Speed & Performance
- ⚡ **Instant database operations** - No network latency
- 🚀 **Fast iteration** - Make changes and test immediately
- 🔄 **Quick resets** - Reset entire database in seconds with `npm run supabase:reset`

### Cost & Safety
- 💰 **Zero API costs** - No usage charges during development
- 🔒 **Safe testing** - Test destructive operations without fear
- 🧪 **Isolated environment** - Each developer has their own database

### Development Workflow
- ✈️ **Offline development** - Work without internet
- 🎯 **Consistent environments** - Same setup for entire team
- 🐛 **Better debugging** - Access to full logs and database internals

### Feature Parity
- ✅ **All features supported** including:
  - Real-time subscriptions (WebSockets)
  - Authentication with magic links
  - Row-Level Security (RLS)
  - Storage
  - Edge Functions
  - Database triggers and functions

## 🚀 Quick Start

### 1. Start Local Supabase
```bash
npm run supabase:start
```

This starts:
- PostgreSQL database on port 54322
- PostgREST API on port 54321
- Supabase Studio on port 54323
- Mailpit (email testing) on port 54324

### 2. Switch to Local Environment
```bash
npm run supabase:use-local
```

This updates your `.env.local` to point to the local instance.

### 3. Start Development Server
```bash
npm run dev
# or use the shortcut that does both:
npm run dev:local
```

### 4. Access Tools
- **App**: http://localhost:5173
- **Studio**: http://127.0.0.1:54323 (database admin)
- **Mailpit**: http://127.0.0.1:54324 (test emails)

## 📋 Commands Reference

### Supabase Management
```bash
# Start local Supabase
npm run supabase:start

# Stop local Supabase
npm run supabase:stop

# Check status and credentials
npm run supabase:status

# Open Studio (database admin UI)
npm run supabase:studio

# Reset database (destructive!)
npm run supabase:reset
```

### Environment Switching
```bash
# Switch to local development
npm run supabase:use-local

# Switch to local AND reset database (first time or after pulling migrations)
npm run supabase:use-local-fresh

# Switch back to cloud
npm run supabase:use-cloud

# Start dev server with local Supabase
npm run dev:local
```

## 🔧 Configuration Files

### .env.local.development (Local Config)
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

### .env.local (Active Config)
This file is automatically updated when you run:
- `npm run supabase:use-local` - Points to local
- `npm run supabase:use-cloud` - Points to cloud

### .env.local.cloud.backup (Cloud Config Backup)
Automatically created when switching to local. Contains your cloud credentials for easy switching back.

## 🧪 Testing with Local Supabase

### Run Integration Tests
```bash
# Your 16 integration tests will hit local database
npm test
```

**Benefits:**
- Tests run against real database (not mocks)
- Instant test execution (no network delay)
- Can reset database between test runs
- No risk of polluting production data

### Test Magic Link Emails
1. Create an account in your app
2. Open Mailpit: http://127.0.0.1:54324
3. Click the magic link in the test email
4. Verify account creation worked

No need to check your actual email!

## 🔄 Common Workflows

### Daily Development
```bash
# Start your day
npm run supabase:start
npm run dev:local

# When done
npm run supabase:stop
```

### Testing a New Migration
```bash
# 1. Create migration
npx supabase migration new add_feature

# 2. Edit migration file in supabase/migrations/

# 3. Apply to local DB
npm run supabase:reset

# 4. Test in app
npm run dev:local

# 5. Verify in Studio
npm run supabase:studio
```

### Before Deploying to Cloud
```bash
# 1. Push migrations to cloud
npx supabase db push

# 2. Test with cloud briefly
npm run supabase:use-cloud
npm run dev

# 3. Switch back to local
npm run supabase:use-local
```

## ⚡ Real-time Features

### All Real-time Features Work Locally

**Example: Room Subscriptions**
```typescript
// This works identically on local and cloud
const { participants, stories, votes } = useRoomSubscription(roomId);
```

**Local Real-time Benefits:**
- Instant updates (no WAN latency)
- Can monitor WebSocket traffic in browser DevTools
- Full access to PostgREST logs
- Test concurrent users easily (open multiple browser windows)

## 🎯 Best Practices

### Do's ✅
- **Always develop locally** - Fast and safe
- **Reset database liberally** - `npm run supabase:reset`
- **Use Studio** - Great for inspecting data
- **Test migrations locally first** - Before cloud deploy
- **Keep migrations in git** - Team stays in sync

### Don'ts ❌
- **Don't commit .env.local** - Already in .gitignore
- **Don't test payments locally** - Use cloud for that
- **Don't skip migrations** - Always create migration files
- **Don't mix cloud and local data** - Keep environments separate

## 🐛 Troubleshooting

### Can't connect to local Supabase
```bash
# Check if it's running
npm run supabase:status

# Restart if needed
npm run supabase:stop
npm run supabase:start
```

### Migrations not applied
```bash
# Reset database (applies all migrations)
npm run supabase:reset
```

### Port conflicts
Check `supabase/config.toml` for port settings if you have conflicts with other services.

### Real-time not working
1. Check browser console for WebSocket errors
2. Verify PostgREST is running: http://127.0.0.1:54321
3. Check Studio for table replication settings

## 📚 Additional Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/cli/local-development)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Database Migrations Guide](https://supabase.com/docs/guides/cli/managing-environments)

## 🎉 Summary

**You're all set!** Local Supabase development gives you:
- ⚡ **10x faster** development cycle
- 💰 **$0** API costs during development
- 🔒 **100% safe** to test anything
- ✅ **Full feature parity** with cloud (including real-time!)

Happy coding! 🚀
