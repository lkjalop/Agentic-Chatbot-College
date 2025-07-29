# Production Debugging Guide

## Check These Immediately:

### 1. Verify Deployment URL
- Go to your Vercel dashboard
- Check the latest deployment status
- Confirm you're testing the right domain (not a preview branch)

### 2. Check Environment Variables in Vercel
Required for production:
- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`  
- `GROQ_API_KEY`
- `NEON_DATABASE_URL`

### 3. Test API Directly
Visit this URL in browser to test:
```
https://your-vercel-domain.vercel.app/api/admin/test-vector
```

### 4. Check Browser Console
1. Open chat interface
2. Press F12 → Console tab
3. Send a message
4. Look for error messages or API responses

### 5. Manual Database Population
If auto-population fails, manually trigger:
```
POST https://your-vercel-domain.vercel.app/api/admin/load-sample-data
```

## Common Fixes:

### Fix 1: Environment Variables
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add missing variables
3. Redeploy

### Fix 2: Force Redeploy
1. Go to Vercel Dashboard → Deployments
2. Click "..." on latest deployment
3. Select "Redeploy"

### Fix 3: Clear Cache
1. Hard refresh browser (Ctrl+Shift+R)
2. Test in incognito mode

## Expected Behavior:
- First chat message takes 5-10 seconds (database population)
- Subsequent messages are instant
- Responses are conversational and persona-specific
- No generic error messages

## If Still Broken:
The issue is likely:
1. Missing environment variables in Vercel
2. Auto-population timing out (>30 seconds)
3. Vercel deployment not completing
4. Different error not caught by our fixes