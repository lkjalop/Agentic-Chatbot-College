# 🚀 Deployment Checklist & Troubleshooting

## Pre-Deployment Checklist

### ✅ Build Verification
- [x] `npm run build` completes successfully
- [ ] `npm run type-check` passes without errors  
- [x] All safety tests pass: `npm run test:safety`
- [ ] No console errors in development mode

### ✅ Environment Variables (Vercel)
- [ ] GROQ_API_KEY set in Vercel dashboard
- [ ] NEXTAUTH_SECRET configured
- [ ] DATABASE_URL configured (if using database)
- [ ] All required API keys present

### ✅ Vercel Configuration
- [ ] Node.js version specified (18.x recommended)
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Install command: `npm install`

## Common Vercel Issues & Solutions

### Issue 1: API Key Missing at Build Time
```bash
# Error: GROQ_API_KEY is not defined
# Solution: Already handled with fallback in groq.ts
```

### Issue 2: Database Connection at Build Time
```bash
# Error: Database not available
# Solution: Already handled with adapter fallback
```

### Issue 3: Import Path Issues
```bash
# All imports verified using absolute paths
import { BasicSecurityAgent } from '@/lib/security/basic-security-agent';
```