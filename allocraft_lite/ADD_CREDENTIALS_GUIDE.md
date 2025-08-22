# 🔑 Add Your Schwab API Credentials

## Step 1: Get Your Schwab API Credentials

### A. Login to Schwab Developer Portal
1. Go to: **https://developer.schwab.com/**
2. Sign in with your Schwab account credentials
3. Navigate to **"My Apps"** in the dashboard

### B. Create/Access Your Application
1. If you don't have an app yet:
   - Click **"Create New App"**
   - App Name: `Allocraft Portfolio Tracker`
   - Description: `Personal portfolio tracking and wheel strategy management`
   - **Redirect URI**: `http://localhost:5173/auth/callback`

2. If you already have an app:
   - Click on your existing app name
   - Verify the Redirect URI is: `http://localhost:5173/auth/callback`

### C. Get Your Credentials
You'll see two important values:
- **App Key** (this is your Client ID)
- **Secret** (this is your Client Secret)

## Step 2: Add Credentials to Your Environment File

1. **Open the file**: `c:\Users\haloi\Documents\GitHub\Allocraft\Allocraft_Lite\allocraft_lite\.env.local`

2. **Replace the placeholder values** with your actual credentials:

```bash
VITE_API_BASE_URL=https://allocraft-backend.onrender.com

# Schwab API Configuration - PRODUCTION READY
VITE_SCHWAB_CLIENT_ID=YOUR_ACTUAL_APP_KEY_HERE
VITE_SCHWAB_CLIENT_SECRET=YOUR_ACTUAL_SECRET_HERE
VITE_SCHWAB_REDIRECT_URI=http://localhost:5173/auth/callback
```

### ⚠️ IMPORTANT: 
- Replace `YOUR_ACTUAL_APP_KEY_HERE` with your App Key from Schwab
- Replace `YOUR_ACTUAL_SECRET_HERE` with your Secret from Schwab
- Keep the quotes if they contain special characters
- Do NOT commit this file to git (it's already in .gitignore)

## Step 3: Restart Your Development Server

After updating the credentials:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it:
npm run dev
```

## Step 4: Test the Integration

1. **Navigate to**: http://localhost:5173/stocks
2. **Look for**: "Schwab Configuration Test" section
3. **Verify**: You should see ✅ marks for Client ID and Client Secret
4. **Test OAuth**: Click "Connect to Schwab" button

## API Endpoints Configured

### 🏦 Account & Trading (Production)
- **Accounts**: `https://api.schwabapi.com/trader/v1/accounts`
- **Positions**: `https://api.schwabapi.com/trader/v1/accounts/{accountId}`
- **Orders**: `https://api.schwabapi.com/trader/v1/accounts/{accountId}/orders`

### 📊 Market Data (Production)
- **Quotes**: `https://api.schwabapi.com/marketdata/v1/quotes`
- **Chains**: `https://api.schwabapi.com/marketdata/v1/chains`
- **Price History**: `https://api.schwabapi.com/marketdata/v1/pricehistory`

## Security Notes

✅ **Your credentials are secure**:
- Environment file is excluded from git
- Client secret is not exposed in browser
- Tokens are encrypted and stored securely
- OAuth flow follows industry standards

## Troubleshooting

### "Client ID Missing" Error
- Check that `.env.local` file exists in the correct location
- Verify no extra spaces or quotes around values
- Restart development server after changes

### "Redirect URI Mismatch" Error  
- Ensure exact match in Schwab app: `http://localhost:5173/auth/callback`
- Check for trailing slashes or http vs https

### "Invalid Client Credentials" Error
- Double-check your App Key and Secret from Schwab portal
- Ensure credentials are for the correct environment (production)

---

**🚀 Once you add your credentials, you'll be able to:**
- Import your real Schwab account data
- View live portfolio positions
- Track wheel strategies with real-time data
- Access market data for analysis
