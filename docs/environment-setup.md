# Environment Setup Guide

This guide will help you set up your development environment for the Story Pointer application, including Supabase project configuration, local development setup, and environment variable management.

## Prerequisites

- Node.js v18+ installed
- npm or yarn package manager
- Git installed and configured
- A Supabase account (free tier is sufficient)

## Step 1: Install Supabase CLI

The Supabase CLI is already included as a devDependency in this project. Verify installation:

```bash
npx supabase --version
```

You should see version `2.54.11` or higher.

Alternatively, install globally for easier access:

```bash
npm install -g supabase
```

## Step 2: Create Supabase Projects

You need to create three separate Supabase projects for different environments. Visit the [Supabase Dashboard](https://supabase.com/dashboard) and create:

### Development Project

1. Navigate to: https://supabase.com/dashboard
2. Click "New Project"
3. **Organization**: Select your organization or create one
4. **Project Name**: `story-pointer-dev`
5. **Database Password**: Generate a strong password (save this securely)
6. **Region**: Select closest to your location
7. **Pricing Plan**: Free tier is sufficient
8. Click "Create new project"
9. Wait for provisioning (2-3 minutes)

### Staging Project

Repeat the above steps with:
- **Project Name**: `story-pointer-staging`
- Use a different database password

### Production Project

Repeat the above steps with:
- **Project Name**: `story-pointer-prod`
- Use a different database password

## Step 3: Obtain API Credentials

For each project (dev, staging, prod), you need to obtain:

1. Navigate to your project in the Supabase dashboard
2. Go to: **Settings** → **API**
3. Copy the following values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project API keys** → **anon/public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Project Reference ID** (from URL): This is the subdomain before `.supabase.co`

**Important**: Never commit the `service_role` key to version control. Only use the `anon` key in your frontend application.

## Step 4: Configure Local Development Environment

1. Copy the example environment file:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and replace with your **development** project credentials:

```env
VITE_SUPABASE_URL=https://your-dev-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key-here
```

3. Verify the file is properly ignored by git:

```bash
git status
# .env.local should NOT appear in the output
```

## Step 5: Link Local Repository to Supabase Project

Link your local Supabase CLI to the development project:

```bash
npx supabase link --project-ref YOUR_DEV_PROJECT_REF
```

You'll be prompted to:
1. **Authenticate**: Opens browser to log in to Supabase
2. **Select Database Password**: Enter the database password you created for the dev project

Verify the link:

```bash
npx supabase status
```

You should see your project details and services running.

## Step 6: Configure CORS Settings

Configure CORS (Cross-Origin Resource Sharing) for each environment to allow your frontend application to communicate with Supabase.

### Development Environment

1. Navigate to your dev project in Supabase dashboard
2. Go to: **Authentication** → **URL Configuration**
3. Configure the following:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: Add `http://localhost:5173/auth/callback`
4. Click "Save"

### Staging Environment

Repeat the above steps for your staging project:
- **Site URL**: `https://your-staging-domain.com`
- **Redirect URLs**: `https://your-staging-domain.com/auth/callback`

### Production Environment

Repeat the above steps for your production project:
- **Site URL**: `https://your-production-domain.com`
- **Redirect URLs**: `https://your-production-domain.com/auth/callback`

## Step 7: Configure Deployment Environments

### Netlify Configuration (Recommended)

1. Log in to your Netlify dashboard
2. Select your site
3. Go to: **Site settings** → **Environment variables**

#### For Staging Deployment:
- Add variable: `VITE_SUPABASE_URL` = `https://your-staging-project-ref.supabase.co`
- Add variable: `VITE_SUPABASE_ANON_KEY` = `your-staging-anon-key`

#### For Production Deployment:
- Add variable: `VITE_SUPABASE_URL` = `https://your-production-project-ref.supabase.co`
- Add variable: `VITE_SUPABASE_ANON_KEY` = `your-production-anon-key`

### Alternative Hosting Platforms

If using Vercel, Render, or other platforms, configure environment variables similarly through their respective dashboards.

## Step 8: Verify Setup

Start the development server:

```bash
npm run dev
```

The application should start at `http://localhost:5173` without any Supabase connection errors.

## Troubleshooting

### "Could not resolve project ref"

**Problem**: Supabase CLI cannot find your project.

**Solution**:
1. Verify you're using the correct project ref (found in project settings)
2. Re-authenticate: `npx supabase login`
3. Try linking again with the full project ref

### "Invalid API key"

**Problem**: Environment variables are incorrect or not loaded.

**Solution**:
1. Verify `.env.local` exists in project root
2. Check that `VITE_` prefix is present (required by Vite)
3. Restart the dev server after changing environment variables
4. Verify you're using the `anon` key, not the `service_role` key

### "CORS error" when calling Supabase

**Problem**: CORS not configured correctly.

**Solution**:
1. Verify Site URL and Redirect URLs in Supabase dashboard
2. Ensure URLs match exactly (including protocol: http/https)
3. Check for trailing slashes (should not have trailing slash)
4. Wait 1-2 minutes after saving CORS settings for propagation

### "Database not connected"

**Problem**: Local Supabase is not running or linked incorrectly.

**Solution**:
1. Check status: `npx supabase status`
2. Restart local Supabase: `npx supabase stop && npx supabase start`
3. Verify link: `npx supabase link --project-ref YOUR_PROJECT_REF`

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public/anonymous key for client-side operations | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

**Never use these variables in production config**:
- `SUPABASE_SERVICE_ROLE_KEY` - Backend only, never expose to frontend
- `SUPABASE_DB_PASSWORD` - Database password, backend only

## Next Steps

After completing environment setup:

1. **Run Database Migrations**: See [Database Migrations Guide](./database-migrations.md)
2. **Test Authentication**: See [Environment Setup Verification](./environment-setup.md#verification)
3. **Review Database Schema**: See [Database Schema Documentation](./database-schema.md)

## Security Best Practices

1. **Never commit `.env.local`** - Already configured in `.gitignore`
2. **Use different passwords** for dev, staging, and production databases
3. **Rotate API keys regularly** - Especially after any security incident
4. **Use environment-specific keys** - Never use production keys in development
5. **Limit access** - Only share credentials with team members who need them
6. **Monitor usage** - Check Supabase dashboard for unusual activity

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
