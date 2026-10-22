# Production Testing Checklist - pointing.page

## Pre-Launch Verification

- [x] Database migrations deployed to production
- [x] GitHub repository connected to Netlify
- [x] Environment variables configured in Netlify
- [x] CORS configured for pointing.page in Supabase
- [x] DNS nameservers pointed to Netlify
- [ ] DNS propagation complete
- [ ] SSL certificate provisioned

## Once DNS Propagates

### 1. Check Domain Accessibility

```bash
# Check if domain resolves
dig pointing.page

# Check if site is accessible
curl -I https://pointing.page
```

Or visit: https://pointing.page

### 2. Verify SSL Certificate

- Visit https://pointing.page
- Check for valid SSL (green padlock in browser)
- Netlify auto-provisions Let's Encrypt SSL

### 3. End-to-End Functionality Test

#### Test 1: Create a Room
1. Go to https://pointing.page
2. Click "Create Room"
3. Enter your name (e.g., "Alice")
4. Select Fibonacci or T-shirt
5. ✅ Verify: Room page loads with formatted room code

#### Test 2: Copy Shareable Link
1. On room page, click "Copy Link"
2. ✅ Verify: Toast notification appears "Link copied to clipboard!"
3. Paste link - should be format: `https://pointing.page/join/ABC12345`

#### Test 3: Join Room (Incognito/Private Window)
1. Copy the join link from Test 2
2. Open new incognito/private browser window
3. Paste the link and navigate
4. ✅ Verify: Automatically redirects to room page
5. ✅ Verify: Room code matches original room

#### Test 4: Invalid Room Code
1. Navigate to: https://pointing.page/join/INVALID99
2. ✅ Verify: Redirects to home with error toast
3. ✅ Verify: Toast says "Invalid room code format"

#### Test 5: Room Name Display
1. Create room with custom name "Sprint Planning"
2. ✅ Verify: Room name displayed prominently at top
3. ✅ Verify: Room code displayed below name

#### Test 6: localStorage Persistence
1. Create a room with name "Bob"
2. Note the URL
3. Refresh the page (F5 or Cmd+R)
4. ✅ Verify: Page reloads successfully
5. Create another room
6. ✅ Verify: Name pre-fills with "Bob"

#### Test 7: Mobile Responsiveness
1. Open https://pointing.page on mobile device
2. Or use browser DevTools > Toggle device toolbar
3. Test at different sizes:
   - 375px (iPhone SE)
   - 768px (iPad)
   - 1024px+ (Desktop)
4. ✅ Verify: Dialog fits screen, buttons tappable, no horizontal scroll

#### Test 8: Database Connection
1. Open browser DevTools > Network tab
2. Create a room
3. ✅ Verify: Successful API calls to txjhdxiqilljatitmwdv.supabase.co
4. ✅ Verify: No CORS errors in console
5. ✅ Verify: Room data persisted to production database

### 4. Performance Check

- [ ] Page load time < 3 seconds
- [ ] Lighthouse score > 90 (run in Chrome DevTools)
- [ ] No console errors or warnings

### 5. GitHub Actions Verification

1. Go to: https://github.com/peterclark/pointing.page/actions
2. ✅ Verify: Latest workflow run passed
3. ✅ Verify: Tests ran successfully

## Post-Launch Monitoring

### Check Netlify Analytics
- Visit: https://app.netlify.com/
- Monitor: Deploy logs, bandwidth usage, errors

### Check Supabase Dashboard
- Visit: https://app.supabase.com/project/txjhdxiqilljatitmwdv
- Monitor: Database performance, API requests, RLS policies

### Production Logs
- Netlify Functions logs (if applicable)
- Browser console for any client-side errors

## Troubleshooting

### DNS Not Resolving
```bash
# Check DNS propagation status
dig pointing.page
nslookup pointing.page

# Or use: https://dnschecker.org/
```
**Solution**: Wait up to 24 hours for full propagation

### SSL Certificate Not Provisioned
- Go to: Netlify Dashboard → Domain settings → HTTPS
- Click "Verify DNS configuration"
- May take 5-10 minutes after DNS propagates

### CORS Errors
- Check Supabase Dashboard → Settings → API → CORS Configuration
- Ensure `https://pointing.page` is in allowed origins
- Check browser console for specific CORS error

### Room Creation Fails
1. Check environment variables in Netlify
2. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
3. Check Supabase logs for database errors

## Success Criteria

All tests pass:
- ✅ Domain loads with SSL
- ✅ Create room works
- ✅ Join room works
- ✅ Copy link works
- ✅ Error handling works
- ✅ Mobile responsive
- ✅ No console errors
- ✅ Database persistence works

## Next Steps After Launch

1. **Share with team** - Get feedback
2. **Monitor errors** - Check Netlify and Supabase dashboards
3. **Plan next feature** - Voting & Reveal Flow (from roadmap)
4. **Analytics** (optional) - Add Google Analytics or Plausible

---

**Production URL**: https://pointing.page
**Last Updated**: 2025-11-13
**Status**: Awaiting DNS propagation
