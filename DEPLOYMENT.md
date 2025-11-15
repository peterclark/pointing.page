# Deployment Guide - pointing.page

## Production Environment

- **Domain**: https://pointing.page
- **Hosting**: Netlify
- **Database**: Supabase (Production)
- **CI/CD**: GitHub Actions

## Quick Deploy Checklist

- [x] Database migrations deployed to production
- [x] GitHub Actions workflow configured
- [ ] CORS configured for pointing.page
- [ ] Netlify site created and connected to GitHub
- [ ] Environment variables set in Netlify
- [ ] Custom domain configured in Netlify
- [ ] Production site tested end-to-end

## Netlify Deployment Steps

### 1. Create Netlify Site

1. Go to https://app.netlify.com/
2. Click "Add new site" > "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select your repository
5. Build settings (should auto-detect from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

### 2. Configure Environment Variables

In Netlify dashboard > Site configuration > Environment variables, add:

```
VITE_SUPABASE_URL=https://txjhdxiqilljatitmwdv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amhkeGlxaWxsamF0aXRtd2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NDA4NjAsImV4cCI6MjA3ODIxNjg2MH0.8AnWQY-rxPAVc6dddmEnNhywzPc9b1P3qQA9S3JR5uw
```

### 3. Configure Custom Domain

1. In Netlify dashboard > Domain management > Domains
2. Click "Add a domain"
3. Enter: `pointing.page`
4. Netlify will provide DNS records
5. Configure DNS with your domain registrar (see below)

### 4. DNS Configuration

Add these records at your domain registrar:

**For pointing.page:**
- Type: `A`
- Name: `@`
- Value: `75.2.60.5` (Netlify's load balancer)

**For www.pointing.page:**
- Type: `CNAME`
- Name: `www`
- Value: `[your-site].netlify.app`

**SSL Certificate:**
- Netlify will automatically provision SSL certificate (may take a few minutes)

## Deployment Workflow

### Automatic Deployments

- Every push to `main` branch triggers:
  1. GitHub Actions runs tests
  2. If tests pass, Netlify deploys automatically

### Manual Deploy

```bash
# Build locally
npm run build

# Test production build
npm run preview

# Push to GitHub (triggers auto-deploy)
git push origin main
```

## Environment Variables Reference

### Production (.env.production)
```
VITE_SUPABASE_URL=https://txjhdxiqilljatitmwdv.supabase.co
VITE_SUPABASE_ANON_KEY=[production-anon-key]
```

### Development (.env.local)
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=[local-anon-key]
```

## Post-Deployment Verification

1. Visit https://pointing.page
2. Create a test room
3. Copy the join link
4. Open in incognito window and join
5. Verify room code displays correctly
6. Test copying the shareable link

## Rollback Procedure

If issues are found in production:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or revert specific commit
git revert <commit-hash>
git push origin main
```

Netlify will automatically deploy the reverted version.

## Monitoring

- **Netlify Analytics**: https://app.netlify.com/ (deploy logs, bandwidth)
- **Supabase Dashboard**: https://app.supabase.com/project/txjhdxiqilljatitmwdv (database performance)
- **GitHub Actions**: https://github.com/[username]/[repo]/actions (test results)

## Support

- Netlify Docs: https://docs.netlify.com/
- Supabase Docs: https://supabase.com/docs
- Domain DNS Help: Contact your registrar

---

**Last Updated**: 2025-11-13
**Production URL**: https://pointing.page
