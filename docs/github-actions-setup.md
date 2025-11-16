# GitHub Actions CI/CD Setup

This document explains how to set up GitHub Actions for automated testing and deployment.

## Required GitHub Secrets

The CI/CD workflows require Supabase credentials to run tests and deploy migrations. You need to add these secrets to your GitHub repository.

### 1. Supabase Environment Variables

Go to: **GitHub Repository > Settings > Secrets and variables > Actions**

Add these secrets:

| Secret Name | Value | Used By |
|-------------|-------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Tests, Build |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Tests, Build |
| `SUPABASE_ACCESS_TOKEN` | Your Supabase access token | Migrations |
| `SUPABASE_PROJECT_REF` | Your Supabase project reference | Migrations |
| `SUPABASE_DB_PASSWORD` | Your database password | Migrations |

### 2. Finding Your Supabase Credentials

#### Project URL and Anon Key
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings > API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

#### Access Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it: "GitHub Actions"
4. Copy the token → `SUPABASE_ACCESS_TOKEN`

#### Project Reference
Found in your Supabase Dashboard URL:
```
https://supabase.com/dashboard/project/[PROJECT_REF]
                                         ^^^^^^^^^^^
```

Or via CLI:
```bash
supabase projects list
```

#### Database Password
1. Go to: Supabase Dashboard > Project Settings > Database
2. Under "Connection string", reset password if needed
3. Copy the password → `SUPABASE_DB_PASSWORD`

### 3. Adding Secrets to GitHub

**To add a secret:**
1. Click **"New repository secret"**
2. Enter the **Name** (exactly as shown in table above)
3. Enter the **Value** (your credential)
4. Click **"Add secret"**

Repeat for all 5 secrets.

## Workflows

### Test Workflow (`.github/workflows/test.yml`)

Runs on:
- Push to `main` branch
- Pull requests to `main`

Steps:
1. Checkout code
2. Install dependencies
3. Run linter
4. **Run tests** (requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
5. **Build application** (requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)

### Migration Workflow (`.github/workflows/deploy-migrations.yml`)

Runs on:
- Push to `main` when files in `supabase/migrations/**` change

Steps:
1. Checkout code
2. Install Supabase CLI
3. Link to Supabase project
4. Run `supabase db push`

Requires: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`

## Verification

### 1. Check Secrets Are Set

Go to: **GitHub Repository > Settings > Secrets and variables > Actions**

You should see all 5 secrets listed (values are hidden).

### 2. Test the Workflows

**Option A: Push to main**
```bash
git add .
git commit -m "test: verify CI setup"
git push origin main
```

**Option B: Create a Pull Request**
```bash
git checkout -b test-ci
git add .
git commit -m "test: verify CI setup"
git push origin test-ci
# Create PR via GitHub UI
```

**Option C: Manual Workflow Trigger**
1. Go to: **GitHub > Actions**
2. Select "Test" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

### 3. Check Workflow Results

1. Go to: **GitHub > Actions**
2. Click on the most recent workflow run
3. Verify all steps pass:
   - ✅ Checkout code
   - ✅ Install dependencies
   - ✅ Run linter
   - ✅ Run tests
   - ✅ Build application

If tests fail with "VITE_SUPABASE_URL is not set", the secrets are not configured correctly.

## Troubleshooting

### "VITE_SUPABASE_URL is not set"

**Cause**: GitHub secrets not configured or named incorrectly

**Fix**:
1. Go to GitHub Repository > Settings > Secrets
2. Verify `VITE_SUPABASE_URL` exists (exact spelling, case-sensitive)
3. Verify `VITE_SUPABASE_ANON_KEY` exists
4. Re-run the workflow

### Tests Pass Locally But Fail in CI

**Possible causes**:
1. Different environment variables in CI vs local
2. Database state differences
3. Network/timeout issues in CI

**Debug steps**:
1. Check the workflow logs for specific error messages
2. Verify secrets are set correctly
3. Ensure test database is accessible from GitHub Actions
4. Consider increasing test timeouts for CI environment

### Migration Workflow Doesn't Run

**Cause**: Workflow file was added in the same commit

**Solution**: Already on `main`, will run on next migration push

See `docs/automated-migrations-setup.md` for more details.

## Security Best Practices

1. **Never commit credentials** to git
2. **Use separate Supabase projects** for dev/staging/production
3. **Rotate access tokens** periodically
4. **Use least-privilege** tokens (only the permissions needed)
5. **Monitor usage** of your Supabase project for unexpected activity

## Related Documentation

- `docs/automated-migrations-setup.md` - Database migration automation
- `docs/environment-setup.md` - Local development setup
- `docs/production-deployment.md` - Deployment guide
