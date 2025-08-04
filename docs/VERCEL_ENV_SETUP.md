# 🔧 Vercel Environment Setup Guide

## Required Environment Variables for Production

Add these environment variables in the Vercel dashboard:

### **Essential for AI Features**
```
GROQ_API_KEY=<your-groq-api-key>
UPSTASH_VECTOR_REST_URL=<your-upstash-vector-url>
UPSTASH_VECTOR_REST_TOKEN=<your-upstash-vector-token>
```

### **Authentication & Security**
```
NODE_ENV=production
NEXTAUTH_SECRET=<generate-secure-secret>
JWT_SECRET=<generate-secure-jwt-secret-32-chars>
ENCRYPTION_KEY=<generate-32-char-encryption-key>
```

### **Database (Optional)**
```
NEON_DATABASE_URL=<your-neon-database-url>
NEON_DATABASE_URL_DIRECT=<your-neon-direct-url>
```

### **Voice Features (Optional)**
```
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>
DEEPGRAM_API_KEY=<your-deepgram-key>
ELEVENLABS_API_KEY=<your-elevenlabs-key>
```

## How to Add Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable with Production scope
3. Redeploy the application

## Notes

- GROQ_API_KEY is essential for AI responses
- System has fallbacks for missing variables
- Voice features are optional for core functionality
- All secrets should be generated uniquely for production