# OAuth Setup Instructions

## Create New OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `alliance-tb-hub`
3. Navigate to **APIs & Services > Credentials**
4. Click **+ CREATE CREDENTIALS > OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Name: `TB-PWA-Local`
7. **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
8. Click **CREATE**
9. Copy the new Client ID and Client Secret to your .env.local

## OAuth Consent Screen Setup

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill required fields:
   - App name: `TB PWA`
   - User support email: your email
   - Developer contact: your email
4. **Save and Continue** through all steps
5. In **Test users** section, add your email address
6. **Publish App** or keep in Testing mode with your email as test user

## Required APIs

Make sure these APIs are enabled:
- Google+ API
- Google People API