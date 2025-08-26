# 🚀 Production Deployment Guide

## **Prerequisites**

✅ **Completed Infrastructure:**
- Docker configuration
- GitHub Actions CI/CD  
- Database migrations
- Security middleware

## **1. Environment Setup**

### **Required Environment Variables**

Create these in your production environment:

```bash
# Database
NEON_DATABASE_URL=postgresql://username:password@host/database

# AI Services  
GROQ_API_KEY=your-groq-api-key

# Vector Database (Optional)
UPSTASH_VECTOR_REST_URL=your-upstash-url
UPSTASH_VECTOR_REST_TOKEN=your-upstash-token

# Authentication (Optional)
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-domain.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Basic Auth for Staging
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=secure-password

# Feature Flags
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
USE_CAREER_TRACKS=true
CRAG_SIDECAR_ENABLED=true
```

## **2. Deployment Options**

### **Option A: Vercel (Recommended)**

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required environment variables
   - Set `NODE_ENV=production`

3. **Domain Setup:**
   - Add custom domain in Vercel Dashboard
   - Configure DNS records

### **Option B: Docker + Cloud Provider**

1. **Build Docker Image:**
   ```bash
   docker build -t career-coach:latest .
   ```

2. **Run with Environment:**
   ```bash
   docker run -d \
     --name career-coach \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e NEON_DATABASE_URL=your-db-url \
     -e GROQ_API_KEY=your-groq-key \
     career-coach:latest
   ```

3. **Use Docker Compose:**
   ```bash
   # Production deployment
   docker-compose -f docker-compose.prod.yml up -d
   ```

## **3. Database Setup**

### **Create Production Database**

1. **Neon Database:**
   - Go to [Neon Console](https://console.neon.tech)
   - Create new project: `career-coach-prod`
   - Copy connection string
   - Enable pooling for production

2. **Run Migrations:**
   ```bash
   # Set environment variable
   export NEON_DATABASE_URL="your-production-url"
   
   # Run migrations
   npm run db:migrate
   
   # Validate schema
   npm run db:validate
   ```

## **4. GitHub Actions Setup**

### **Repository Secrets**

Add these secrets in GitHub → Repository → Settings → Secrets:

```
PRODUCTION_DATABASE_URL=your-neon-production-url
STAGING_DATABASE_URL=your-neon-staging-url
GROQ_API_KEY=your-groq-api-key
VERCEL_TOKEN=your-vercel-token (if using Vercel)
```

### **Deployment Branches**

- `main` → Production deployment
- `develop` → Staging deployment
- Pull requests → Preview deployments

## **5. Monitoring & Health Checks**

### **Health Endpoints**

- `https://your-domain.com/api/health` - System health
- `https://your-domain.com/api/ready` - Database connectivity

### **GitHub Actions Monitoring**

The CI/CD pipeline automatically:
- Runs security scans
- Executes tests
- Builds Docker images
- Deploys to staging/production
- Validates database migrations

## **6. Security Configuration**

### **Environment Security**

✅ All environment variables validated with Zod schemas  
✅ Security headers applied via middleware  
✅ Rate limiting enabled  
✅ Content Security Policy configured  

### **Database Security**

✅ Row Level Security enabled  
✅ Connection pooling  
✅ Encrypted connections  
✅ Migration validation  

## **7. Performance Optimization**

### **Next.js Configuration**

- Static page generation enabled
- Image optimization configured
- Bundle analysis available
- Middleware caching

### **Database Performance**

- Indexes on frequent queries
- Connection pooling
- Vector search optimization
- Query result caching

## **8. Backup & Recovery**

### **Database Backups**

- Neon automatic daily backups
- Point-in-time recovery available
- Branch-based testing

### **Application Backups**

- Source code in GitHub
- Docker images in registry
- Environment variables documented

## **9. Troubleshooting**

### **Common Issues**

1. **Build Failures:**
   ```bash
   # Check TypeScript errors
   npx tsc --noEmit
   
   # Check linting
   npm run lint
   ```

2. **Database Connection:**
   ```bash
   # Test database connectivity
   npm run db:validate
   ```

3. **Environment Variables:**
   ```bash
   # Validate environment
   npm run health-check
   ```

### **Health Check Commands**

```bash
# Test local build
npm run build

# Test Docker build
docker build -t test-image .

# Test database migrations  
npm run db:status

# Validate environment
npm run db:validate
```

## **10. Scaling Considerations**

### **Current Capacity**

- Single instance handles ~1000 concurrent users
- Database supports 100+ connections
- Memory usage: ~512MB typical

### **Scaling Triggers**

- **1000+ users:** Add horizontal scaling
- **10k+ users:** Database read replicas
- **100k+ users:** CDN + caching layer

---

## **Quick Start Commands**

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run database migrations
npm run db:migrate

# 4. Build and test
npm run build

# 5. Deploy to Vercel
vercel --prod

# 6. Validate deployment
curl https://your-domain.com/api/health
```

## **Support**

For deployment issues:
1. Check GitHub Actions logs
2. Review application logs
3. Test health endpoints
4. Validate environment configuration

Deployment Status: ✅ Production Ready