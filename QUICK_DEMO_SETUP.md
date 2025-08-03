# 🚀 Quick Demo Setup (2 Minutes)

## Vercel Deployment (FAST)
```bash
# 1. Login (browser will open)
vercel login
# Choose "Continue with GitHub"

# 2. Deploy instantly  
vercel --prod --yes

# 3. Get URL
# Copy the production URL for your resume/portfolio
```

## Environment Variables (If Needed)
```bash
# Add these in Vercel dashboard if deployment fails:
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-random-secret-here

# Optional (system works without these):
UPSTASH_VECTOR_REST_URL=your-url
GROQ_API_KEY=your-key
```

## Demo Credentials
- **URL**: Your Vercel deployment URL
- **Login**: `student` / `ea2024`
- **Features**: Multi-agent chat, diagnostic panel, mobile responsive

## 30-Second Demo Script
1. "Hi, I need career advice for business analyst roles in Australia"
2. Click gear icon → Show "Under the Hood" diagnostics  
3. "I'm from India and struggling with visa timeline pressure"
4. Show persona matching: "Rohan Patel" with similarity score
5. Try voice: Click mic, say "help with interview preparation"

## Resume-Ready URL
Once deployed, add to resume as:
**Live Demo**: https://your-project.vercel.app (student/ea2024)