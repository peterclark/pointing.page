#!/bin/bash
# Switch to cloud Supabase for production testing

echo "🔄 Switching to CLOUD Supabase..."

if [ -f .env.local.cloud.backup ]; then
  cp .env.local.cloud.backup .env.local
  echo "✅ Using cloud Supabase configuration"
  echo ""
  echo "Cloud Supabase URL: https://wsfjyqojwohzqbububsz.supabase.co"
else
  echo "❌ Error: .env.local.cloud.backup not found"
  echo "Cloud configuration not backed up yet. Run use-local-supabase.sh first."
fi
