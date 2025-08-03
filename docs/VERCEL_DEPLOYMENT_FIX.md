# Quick Vercel Deployment Fix

## Issue
Vercel CLI token expired, needs re-authentication.

## Quick Fix Steps

1. **Login to Vercel**:
   ```bash
   vercel login
   # Choose "Continue with GitHub" (or your preferred method)
   # Follow browser authentication
   ```

2. **Deploy to Production**:
   ```bash
   vercel --prod --yes
   ```

3. **Expected Output**:
   ```
   ✅ Production: https://your-project-name.vercel.app
   ```

## If Still Failing

Check these common issues:

### Environment Variables Missing
```bash
# Check if all required env vars are set in Vercel dashboard
- UPSTASH_VECTOR_REST_URL
- UPSTASH_VECTOR_REST_TOKEN  
- NEON_DATABASE_URL
- GROQ_API_KEY
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
```

### Build Errors
```bash
# Test local build first
npm run build

# If build fails locally, fix before deploying
npm run type-check
```

### Domain/Project Issues
```bash
# If project not found, link to existing project
vercel link

# Or create new project
vercel --name ai-career-assistant
```

## Fallback: Manual Deployment via GitHub

If CLI keeps failing:
1. Go to https://vercel.com/dashboard
2. "Add New" → "Project"  
3. Import from GitHub: your repository
4. Add environment variables
5. Deploy

## Expected Demo URL
Once deployed, you'll get:
`https://agentic-chatbot-college.vercel.app` (or similar)

Basic auth: `student` / `ea2024`