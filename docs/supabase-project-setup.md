# Supabase Project Setup Guide

This document provides step-by-step instructions for creating and configuring the three Supabase projects (dev, staging, production) required for the Story Pointer application.

## Overview

Story Pointer uses separate Supabase projects for each environment to ensure:
- **Isolation**: Changes in development don't affect production
- **Security**: Different API keys and database passwords for each environment
- **Testing**: Staging environment for pre-production testing
- **Data Integrity**: Production data remains separate and protected

## Project Naming Convention

Use these exact project names for consistency:

| Environment | Project Name | Purpose |
|-------------|--------------|---------|
| Development | `story-pointer-dev` | Local development and testing |
| Staging | `story-pointer-staging` | Pre-production testing and QA |
| Production | `story-pointer-prod` | Live application serving end users |

## Step-by-Step Setup

### 1. Create Development Project

#### 1.1 Navigate to Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Sign in or create a Supabase account if you don't have one

#### 1.2 Create New Project

1. Click the **"New Project"** button
2. Select your organization (or create one if this is your first project)

#### 1.3 Configure Project Settings

Fill in the following details:

**Project Name**: `story-pointer-dev`

**Database Password**:
- Click "Generate a password" for a strong password
- **IMPORTANT**: Copy and save this password securely (you'll need it later)
- Store it in a password manager (1Password, LastPass, etc.)

**Region**:
- Select the region closest to your primary development location
- Recommended: `us-east-1` (US East) or `eu-central-1` (Europe) for lower latency

**Pricing Plan**:
- Select **"Free"** plan (sufficient for development)
- Can upgrade later if needed

#### 1.4 Create Project

1. Click **"Create new project"**
2. Wait 2-3 minutes for project provisioning
3. You'll see a progress indicator while the database is being set up

#### 1.5 Document Project Details

Once created, document the following (you'll need these later):

1. Navigate to: **Settings** → **General**
   - **Project Reference ID**: Found in the URL or under "Reference ID"
   - Example: `abcdefghijklmnop`

2. Navigate to: **Settings** → **API**
   - **Project URL**: `https://[project-ref].supabase.co`
   - **API Keys** → **anon/public**: Copy this key (it's safe to use in frontend)
   - **DO NOT copy the service_role key** for frontend use

3. Create a secure document (not in version control) with:
   ```
   Development Environment
   Project Name: story-pointer-dev
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   Project Ref: xxxxxxxxxxxxx
   Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Database Password: [stored in password manager]
   Region: us-east-1
   ```

### 2. Create Staging Project

Repeat the process from Step 1 with these changes:

**Project Name**: `story-pointer-staging`

**Database Password**:
- Generate a NEW password (different from dev)
- Save securely in password manager

**Region**:
- Use the SAME region as dev for consistency

**Pricing Plan**:
- Free plan is fine for staging
- Consider Pro plan if you need more concurrent real-time connections

Document all credentials as you did for development.

### 3. Create Production Project

Repeat the process from Step 1 with these changes:

**Project Name**: `story-pointer-prod`

**Database Password**:
- Generate a NEW password (different from dev and staging)
- Save securely in password manager
- Use maximum security for production

**Region**:
- Select region closest to your primary user base
- Consider using same region as dev/staging for consistency

**Pricing Plan**:
- Start with Free plan
- Plan to upgrade to Pro when approaching limits (see Monitoring section)

Document all credentials as you did for development and staging.

## Post-Creation Configuration

### Configure Authentication Settings

For each project (dev, staging, prod), configure authentication:

1. Navigate to: **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure settings:
   - **Enable Email Signup**: ON
   - **Email Confirmations**: OFF (for MVP - users can participate immediately)
   - **Secure Password Change**: ON

### Configure URL Settings

Configure CORS and redirect URLs for each environment:

#### Development Project

1. Navigate to: **Authentication** → **URL Configuration**
2. Set the following:
   - **Site URL**: `http://localhost:5173`
   - **Additional Redirect URLs**:
     ```
     http://localhost:5173/auth/callback
     http://127.0.0.1:5173/auth/callback
     ```
3. Click **"Save"**

#### Staging Project

1. Navigate to: **Authentication** → **URL Configuration**
2. Set the following:
   - **Site URL**: `https://staging.yourdomain.com` (your staging domain)
   - **Additional Redirect URLs**:
     ```
     https://staging.yourdomain.com/auth/callback
     ```
3. Click **"Save"**

#### Production Project

1. Navigate to: **Authentication** → **URL Configuration**
2. Set the following:
   - **Site URL**: `https://yourdomain.com` (your production domain)
   - **Additional Redirect URLs**:
     ```
     https://yourdomain.com/auth/callback
     https://www.yourdomain.com/auth/callback
     ```
3. Click **"Save"**

### Enable Realtime

For each project, enable realtime for database tables:

1. Navigate to: **Database** → **Replication**
2. Wait until you've created the database schema (covered in database-migrations.md)
3. Then enable replication for: `rooms`, `profiles`, `participants`, `stories`, `votes`
4. Select all events: INSERT, UPDATE, DELETE

## Linking Local Development

### Link Supabase CLI to Development Project

1. Open terminal in your project root
2. Authenticate with Supabase:
   ```bash
   npx supabase login
   ```
3. Link to your dev project:
   ```bash
   npx supabase link --project-ref YOUR_DEV_PROJECT_REF
   ```
4. When prompted, enter the database password you saved earlier

5. Verify the link:
   ```bash
   npx supabase status
   ```

You should see output showing your project details and services.

## Security Checklist

After creating all three projects, verify:

- [ ] All three projects created (dev, staging, prod)
- [ ] Different database passwords for each environment
- [ ] All passwords stored securely in password manager
- [ ] Project URLs and API keys documented (not in git)
- [ ] Anon keys copied (service_role keys NOT exposed)
- [ ] CORS URLs configured for each environment
- [ ] Email provider enabled for authentication
- [ ] Local repository linked to dev project
- [ ] `.env.local` created with dev credentials
- [ ] `.env.local` confirmed in `.gitignore`

## Monitoring and Limits

### Free Tier Limits

Each Supabase free tier project includes:

| Resource | Limit | Monitor |
|----------|-------|---------|
| Database Storage | 500 MB | Settings → Usage |
| Bandwidth | 2 GB/month | Settings → Usage |
| Realtime Connections | 2 concurrent | Settings → Usage |
| Monthly Active Users | 50,000 | Auth → Users |
| Edge Functions | 500,000 invocations | Settings → Usage |

### When to Upgrade

Consider upgrading to Pro plan ($25/month) when:
- Approaching 80% of database storage
- Need more than 2 concurrent realtime connections
- Expecting production traffic over 2GB/month
- Need better performance and SLA guarantees

### Monitoring Best Practices

1. **Set up alerts** in Supabase dashboard (Settings → Usage)
2. **Review usage weekly** during development
3. **Monitor before launches** to ensure capacity
4. **Track real-time connections** as this is often the first bottleneck

## Troubleshooting

### "Organization not found"

**Problem**: You don't have a Supabase organization yet.

**Solution**: Create an organization first from the dashboard before creating projects.

### "Project creation failed"

**Problem**: Temporary issue with Supabase infrastructure.

**Solution**:
1. Wait 5 minutes and try again
2. Try a different region
3. Contact Supabase support if issue persists

### "Cannot link to project"

**Problem**: Incorrect project ref or authentication issue.

**Solution**:
1. Verify project ref is correct (found in Settings → General)
2. Re-authenticate: `npx supabase login`
3. Ensure you have access to the project (check organization membership)

### "Database password not working"

**Problem**: Incorrect password or password wasn't saved correctly.

**Solution**:
1. Reset database password in Supabase dashboard (Settings → Database)
2. Update password in local CLI: `npx supabase db reset --db-url <new-connection-string>`

## Next Steps

After completing project setup:

1. **Configure Local Environment**: Follow [Environment Setup Guide](./environment-setup.md)
2. **Apply Database Migrations**: See [Database Migrations Guide](./database-migrations.md)
3. **Test Connection**: Verify Supabase client can connect
4. **Review Schema**: See [Database Schema Documentation](./database-schema.md)

## Additional Resources

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Pricing](https://supabase.com/pricing)
