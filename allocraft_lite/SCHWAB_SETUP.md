# Schwab API Setup Guide

This guide will help you configure the Schwab API integration for Allocraft.

## Prerequisites

1. **Schwab Developer Account**: You need a Charles Schwab brokerage account and developer access
2. **Application Registration**: Register your application with Schwab

## Step 1: Register Your Application with Schwab

1. **Visit Schwab Developer Portal**
   - Go to: https://developer.schwab.com/
   - Sign in with your Schwab credentials

2. **Create a New Application**
   - Navigate to "My Apps" in the developer dashboard
   - Click "Create New App"
   - Fill in the application details:
     - **App Name**: `Allocraft Portfolio Tracker`
     - **Description**: `Personal portfolio tracking and wheel strategy management`
     - **Redirect URI**: `http://localhost:5173/auth/callback`

3. **Get Your Credentials**
   - After creating the app, you'll receive:
     - **Client ID** (App Key)
     - **Client Secret** (App Secret)
   - **⚠️ Important**: Keep these credentials secure and never commit them to version control

## Step 2: Configure Environment Variables

1. **Update your `.env.local` file**:
   ```bash
   VITE_API_BASE_URL=https://allocraft-backend.onrender.com

   # Schwab API Configuration
   VITE_SCHWAB_CLIENT_ID=your_actual_client_id_here
   VITE_SCHWAB_CLIENT_SECRET=your_actual_client_secret_here
   VITE_SCHWAB_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

2. **Replace the placeholder values**:
   - `your_actual_client_id_here` → Your actual Schwab Client ID
   - `your_actual_client_secret_here` → Your actual Schwab Client Secret

## Step 3: Test the Integration

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the Stocks page**:
   - Go to `http://localhost:5173/stocks`
   - You should see a "Schwab Integration" section

3. **Test the OAuth Flow**:
   - Click "Connect to Schwab"
   - You'll be redirected to Schwab's authorization page
   - Login with your Schwab credentials
   - Grant permissions to your application
   - You'll be redirected back to Allocraft

## Step 4: Verify Integration

After successful authentication, you should see:

1. **Account Information**: Your Schwab account details
2. **Portfolio Positions**: Your current stock/option positions
3. **Refresh Capability**: Ability to refresh data

## Features Available

### 🔐 OAuth Authentication
- Secure login flow using Schwab's OAuth 2.0
- Automatic token refresh
- Session management

### 📊 Portfolio Data
- Real-time account balances
- Current positions with P&L
- Position details (quantity, average price, market value)

### 🔄 Data Synchronization
- Manual refresh capability
- Automatic token refresh when expired
- Error handling and retry logic

## Troubleshooting

### Common Issues

1. **"Invalid Client ID" Error**
   - Verify your `VITE_SCHWAB_CLIENT_ID` in `.env.local`
   - Ensure there are no extra spaces or quotes

2. **"Redirect URI Mismatch" Error**
   - Verify the redirect URI in your Schwab app settings matches exactly:
     `http://localhost:5173/auth/callback`

3. **"Permission Denied" Error**
   - Ensure your Schwab account has API access enabled
   - Contact Schwab support if needed

4. **Environment Variables Not Loading**
   - Restart your development server after updating `.env.local`
   - Verify the file is in the correct location

### Debug Steps

1. **Check Console Logs**
   - Open browser developer tools
   - Look for any error messages in the console

2. **Verify Configuration**
   - Check that environment variables are loaded:
     ```javascript
     console.log('Schwab Config:', {
       clientId: import.meta.env.VITE_SCHWAB_CLIENT_ID,
       redirectUri: import.meta.env.VITE_SCHWAB_REDIRECT_URI
     });
     ```

3. **Test Network Requests**
   - Check the Network tab in developer tools
   - Verify API calls are being made to the correct endpoints

## Security Notes

- ✅ Environment variables are in `.gitignore`
- ✅ Client secret is not exposed in browser code
- ✅ Tokens are stored securely in localStorage
- ✅ Automatic token refresh prevents expired sessions

## API Endpoints Used

- **Authorization**: `https://api.schwabapi.com/v1/oauth/authorize`
- **Token Exchange**: `https://api.schwabapi.com/v1/oauth/token`
- **Accounts**: `https://api.schwabapi.com/v1/accounts`
- **Positions**: `https://api.schwabapi.com/v1/accounts/{accountId}/positions`

## Next Steps

Once the integration is working:

1. **Sync Portfolio Data**: Import your current positions
2. **Set Up Wheel Strategies**: Use real position data for wheel tracking
3. **Configure Alerts**: Set up notifications for position changes

---

**Need Help?** 
- Check the [Schwab API Documentation](https://developer.schwab.com/docs)
- Review the integration code in `src/services/schwabApi.ts`
- Check the React hooks in `src/hooks/useSchwab.ts`
