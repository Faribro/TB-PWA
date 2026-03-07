# URGENT: Create New OAuth Credentials

## Step 1: Create New OAuth Client
1. Go to https://console.cloud.google.com/
2. Select project: alliance-tb-hub
3. Navigate to APIs & Services > Credentials
4. Click "+ CREATE CREDENTIALS" > "OAuth 2.0 Client IDs"
5. Application type: Web application
6. Name: TB-PWA-Production
7. Authorized JavaScript origins:
   - http://localhost:3000
   - https://hhxr-tb-engine.vercel.app
8. Authorized redirect URIs:
   - http://localhost:3000/api/auth/callback/google
   - https://hhxr-tb-engine.vercel.app/api/auth/callback/google
9. Click CREATE
10. Copy the new Client ID and Client Secret

## Step 2: Update Environment Variables
Replace these in both local and Vercel:
- GOOGLE_CLIENT_ID=NEW_CLIENT_ID_HERE
- GOOGLE_CLIENT_SECRET=NEW_CLIENT_SECRET_HERE

## Step 3: OAuth Consent Screen
1. Go to APIs & Services > OAuth consent screen
2. Add faridsayyed1010@gmail.com as test user
3. OR publish the app to production

## Current Issue
The error "invalid_client" means Google doesn't recognize the Client ID.
This could be because:
1. Wrong Client ID in environment variables
2. Client ID from different Google project
3. OAuth consent screen not properly configured