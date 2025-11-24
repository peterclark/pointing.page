#!/bin/bash
# Switch to local Supabase for development
#
# Usage:
#   ./scripts/use-local-supabase.sh           # Switch to local
#   ./scripts/use-local-supabase.sh --reset   # Switch and reset database

RESET_DB=false

# Check for --reset flag
if [ "$1" = "--reset" ] || [ "$1" = "-r" ]; then
  RESET_DB=true
fi

echo "🔄 Switching to LOCAL Supabase..."

# Backup current .env.local
if [ -f .env.local ]; then
  cp .env.local .env.local.cloud.backup
  echo "✅ Backed up cloud config to .env.local.cloud.backup"
fi

# Copy local config to .env.local
if [ -f .env.local.development ]; then
  cp .env.local.development .env.local
  echo "✅ Using local Supabase configuration"
  echo ""

  # Check if database reset was requested
  if [ "$RESET_DB" = true ]; then
    echo "🔄 Resetting local database..."
    npx supabase db reset
    echo "✅ Database reset complete"
    echo ""
  fi

  echo "Local Supabase URL: http://127.0.0.1:54321"
  echo ""
  echo "📝 Make sure local Supabase is running:"
  echo "   npm run supabase:start"
  echo ""
  echo "🌐 Access Studio at: http://127.0.0.1:54323"
  echo ""
  echo "💡 First time or pulled new migrations? Run with --reset:"
  echo "   npm run supabase:use-local -- --reset"
else
  echo "❌ Error: .env.local.development not found"
  echo "Run 'supabase status' and update .env.local.development with your local credentials"
fi
