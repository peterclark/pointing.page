# Setup Instructions for Phase 1: Environment Setup

This document guides you through the manual steps required to complete Phase 1 of the Database Schema & Supabase Setup feature. Some tasks have been automated, while others require manual configuration through the Supabase dashboard.

## Status Overview

### Completed Automatically
- [x] 1.1 Install Supabase CLI globally (already installed as devDependency v2.54.11)
- [x] 1.3 Initialize Supabase in project repository (already initialized)
- [x] 1.5 Configure environment variable templates (`.env.local.example`, `.env.staging.example`, `.env.production.example` created)
- [x] Documentation created (README updated, setup guides created)

### Manual Steps Required
You need to complete the following tasks manually:

## Task 1.2: Create Three Separate Supabase Projects

Follow the detailed guide in: [docs/supabase-project-setup.md](./docs/supabase-project-setup.md)

### Quick Steps:

1. **Navigate to Supabase Dashboard**: https://supabase.com/dashboard

2. **Create Development Project**:
   - Click "New Project"
   - Project Name: `story-pointer-dev`
   - Generate and save database password securely
   - Select region (recommend: us-east-1 or closest to you)
   - Click "Create new project"
   - Wait 2-3 minutes for provisioning

3. **Create Staging Project**:
   - Repeat above with Project Name: `story-pointer-staging`
   - Use a different database password

4. **Create Production Project**:
   - Repeat above with Project Name: `story-pointer-prod`
   - Use a different database password

### Document Your Project Details

For each project, navigate to **Settings → API** and record:

**Development Project**:
```
Project URL: https://xxxxx.supabase.co
Project Ref: xxxxx
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Staging Project**:
```
Project URL: https://xxxxx.supabase.co
Project Ref: xxxxx
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Production Project**:
```
Project URL: https://xxxxx.supabase.co
Project Ref: xxxxx
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Task 1.4: Link Local Development to Dev Supabase Project

After creating the development project:

1. **Authenticate with Supabase**:
   ```bash
   npx supabase login
   ```
   This will open your browser for authentication.

2. **Link to your dev project**:
   ```bash
   npx supabase link --project-ref YOUR_DEV_PROJECT_REF
   ```
   Replace `YOUR_DEV_PROJECT_REF` with the project ref from Task 1.2.

3. **Enter database password** when prompted (the one you generated in Task 1.2).

4. **Verify the link**:
   ```bash
   npx supabase status
   ```
   You should see your project details.

## Task 1.5: Configure Local Environment Variables

1. **Create `.env.local` file**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local`** with your development project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-dev-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-dev-anon-key-here
   ```

3. **Verify the file is ignored by git**:
   ```bash
   git status
   ```
   `.env.local` should NOT appear in the output.

## Task 1.6: Configure CORS Settings for Each Environment

### Development Environment

1. Navigate to your **development project** in Supabase dashboard
2. Go to: **Authentication** → **URL Configuration**
3. Set the following:
   - **Site URL**: `http://localhost:5173`
   - **Additional Redirect URLs**: Add these on separate lines:
     ```
     http://localhost:5173/auth/callback
     http://127.0.0.1:5173/auth/callback
     ```
4. Click **"Save"**

### Staging Environment

1. Navigate to your **staging project** in Supabase dashboard
2. Go to: **Authentication** → **URL Configuration**
3. Set the following:
   - **Site URL**: `https://your-staging-domain.com` (use your actual staging domain)
   - **Additional Redirect URLs**:
     ```
     https://your-staging-domain.com/auth/callback
     ```
4. Click **"Save"**

**Note**: You can update this later when you have your actual staging domain.

### Production Environment

1. Navigate to your **production project** in Supabase dashboard
2. Go to: **Authentication** → **URL Configuration**
3. Set the following:
   - **Site URL**: `https://yourdomain.com` (use your actual production domain)
   - **Additional Redirect URLs**:
     ```
     https://yourdomain.com/auth/callback
     https://www.yourdomain.com/auth/callback
     ```
4. Click **"Save"**

**Note**: You can update this later when you have your actual production domain.

## Verification Steps

After completing all manual steps, verify your setup:

1. **Verify Supabase CLI installation**:
   ```bash
   npx supabase --version
   ```
   Should show: `2.54.11` or higher

2. **Verify project link**:
   ```bash
   npx supabase status
   ```
   Should show your development project details.

3. **Verify environment variables**:
   ```bash
   cat .env.local
   ```
   Should show your actual development project URL and anon key.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Server should start without errors at `http://localhost:5173`.

## Acceptance Criteria Checklist

Verify all criteria are met:

- [ ] Supabase CLI installed and operational (v2.54.11+)
- [ ] Three separate Supabase projects created:
  - [ ] `story-pointer-dev`
  - [ ] `story-pointer-staging`
  - [ ] `story-pointer-prod`
- [ ] All project credentials documented securely (not in version control)
- [ ] Local repository linked to dev project
- [ ] `.env.local` file created with dev credentials
- [ ] `.env.local` confirmed in .gitignore
- [ ] CORS settings configured for dev environment
- [ ] CORS settings configured for staging environment (or placeholder)
- [ ] CORS settings configured for production environment (or placeholder)
- [ ] Development server starts without errors

## Troubleshooting

If you encounter issues, see the comprehensive troubleshooting section in:
- [docs/environment-setup.md#troubleshooting](./docs/environment-setup.md#troubleshooting)
- [docs/supabase-project-setup.md#troubleshooting](./docs/supabase-project-setup.md#troubleshooting)

### Common Issues

**"Could not resolve project ref"**
- Solution: Verify project ref is correct (found in Settings → General)
- Re-authenticate: `npx supabase login`

**"Invalid API key"**
- Solution: Verify you copied the `anon` key, not the `service_role` key
- Restart dev server after updating `.env.local`

**"CORS error"**
- Solution: Verify Site URL matches exactly (no trailing slash)
- Wait 1-2 minutes after saving CORS settings

## Next Steps

After completing Phase 1, you're ready to proceed with:

- **Phase 2**: Database Schema Implementation
- **Phase 3**: Authentication Configuration
- **Phase 4**: Row Level Security Policies
- **Phase 5**: Real-time Subscriptions
- **Phase 6**: TypeScript Integration
- **Phase 7**: Testing and Verification
- **Phase 8**: Documentation and Deployment

## Need Help?

Refer to the comprehensive guides:
- [Supabase Project Setup Guide](./docs/supabase-project-setup.md)
- [Environment Setup Guide](./docs/environment-setup.md)
- [Supabase Documentation](https://supabase.com/docs)
