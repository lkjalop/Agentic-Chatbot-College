# Google OAuth Setup Guide

## Prerequisites
- Google Cloud Console account
- Access to your application's domain

## Step 1: Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the consent screen:
   - Choose "External" (for testing) or "Internal" (for organization use)
   - Fill in app name, user support email, and developer contact
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if using "External"

4. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "Digital Career Coach"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

## Step 3: Configure Environment Variables

Update your `.env.local` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-key"
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use online generator: https://generate-secret.vercel.app/32

## Step 4: Update Database Schema

The database schema has been updated with new tables for user management and analytics. To apply these changes:

1. Make sure your database connection is working
2. Run the database migration:
   ```bash
   pnpm db:push
   ```

## Step 5: Test OAuth Integration

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Navigate to your application
3. You should see Google Sign-In buttons
4. Test the authentication flow

## Troubleshooting

### Common Issues

1. **"Error 400: invalid_request"**
   - Check that redirect URIs match exactly in Google Console
   - Ensure no trailing slashes in URLs

2. **"Error 403: access_denied"**
   - Verify OAuth consent screen is configured
   - Check if user is added to test users (for external apps)

3. **"NEXTAUTH_URL mismatch"**
   - Ensure NEXTAUTH_URL matches your actual domain
   - Don't use `localhost` in production

4. **Database connection errors**
   - Verify your NEON_DATABASE_URL is correct
   - Check if new tables were created successfully

### OAuth Consent Screen Tips

- Use clear, descriptive app name
- Provide privacy policy and terms of service links for production
- Request only necessary scopes
- Add appropriate app logo and description

## Security Considerations

- Never commit OAuth credentials to version control
- Use environment-specific credentials (dev/staging/prod)
- Implement proper session management
- Consider IP allowlisting for production environments
- Regularly rotate OAuth secrets

## Production Deployment

Before deploying to production:

1. Update OAuth credentials with production domain
2. Set NEXTAUTH_URL to production URL
3. Generate new NEXTAUTH_SECRET for production
4. Configure proper environment variables in hosting platform
5. Test OAuth flow thoroughly in production environment

## Analytics & Privacy

The enhanced Phase 7-8 implementation includes:

- User analytics with privacy controls
- GDPR-compliant data export/deletion
- Personalized search based on user profiles
- Comprehensive logging and monitoring

Users can:
- Control analytics consent
- Export their data
- Delete their account and all data
- View personalized analytics dashboard