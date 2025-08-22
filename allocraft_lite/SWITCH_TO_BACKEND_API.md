# 🔄 Switch from Direct Schwab API to Backend-Proxied API

## 🎯 **What This Solves**

The OAuth error you encountered ("We are unable to complete your request") is often caused by:
- CORS (Cross-Origin Resource Sharing) restrictions
- Client-side credential exposure
- Redirect URI mismatches
- Browser security policies

**Solution**: Route through your Render backend instead of calling Schwab directly.

## 🏗️ **Architecture Comparison**

### **Current (Direct API)** ❌
```
Frontend (localhost:5174) → Schwab API
```
**Issues:**
- CORS restrictions
- Credentials exposed in browser
- OAuth callback complexity
- Browser security limitations

### **New (Backend-Proxied)** ✅
```
Frontend → Your Render Backend → Schwab API
```
**Benefits:**
- No CORS issues
- Secure server-side credential handling
- Proper OAuth flow management
- Production-ready architecture

## 🚀 **Setup Steps**

### **Step 1: Update Your Backend**

I've already created the backend integration for you:

1. **New Backend Files Created:**
   - `fastapi_project/app/routers/schwab.py` - Schwab API router
   - `fastapi_project/.env.schwab` - Backend environment variables

2. **Backend Endpoints Available:**
   - `GET /schwab/auth-url` - Get OAuth authorization URL
   - `GET /schwab/callback` - Handle OAuth callback
   - `GET /schwab/accounts` - Get user accounts
   - `GET /schwab/accounts/{id}/positions` - Get positions
   - `POST /schwab/refresh-token` - Refresh access token
   - `GET /schwab/health` - Health check

### **Step 2: Deploy Backend Changes**

You need to deploy your updated backend to Render:

```bash
# Navigate to backend directory
cd Allocraft_Backend

# Install new dependency
pip install httpx

# Deploy to Render (your existing process)
git add .
git commit -m "Add Schwab API backend integration"
git push origin main
```

### **Step 3: Update Schwab App Settings**

In your Schwab Developer Portal:
1. **Current Redirect URI**: `http://localhost:5174/auth/callback`
2. **New Redirect URI**: `https://allocraft-backend.onrender.com/schwab/callback`

**Important**: Your backend will handle the OAuth callback and redirect back to your frontend.

### **Step 4: Test the Integration**

1. **Go to**: http://localhost:5174/stocks (or whatever port your dev server is using)
2. **Find the "API Mode Switcher"** section at the top
3. **Click "Switch to Backend"** - this will test your backend connection
4. **Test OAuth flow** using the backend-proxied mode

## 🔧 **Environment Configuration**

### **Backend Environment Variables**
Add these to your Render backend environment:
```bash
SCHWAB_CLIENT_ID=z39NyhcZwoSlmpZNYstf38Fidd0V0HeTWGMfD9AhWGUj0uOG
SCHWAB_CLIENT_SECRET=Ls1QL7VER1GENslDeoN8Wd8GhkEw5qxboS2OEIsZ6ANtCqxTGBW2ZY6KEcVLCTUU
SCHWAB_REDIRECT_URI=https://allocraft-backend.onrender.com/schwab/callback
FRONTEND_URL=http://localhost:5174
```

### **Frontend Environment Variables** (keep as-is)
```bash
VITE_API_BASE_URL=https://allocraft-backend.onrender.com
VITE_SCHWAB_CLIENT_ID=z39NyhcZwoSlmpZNYstf38Fidd0V0HeTWGMfD9AhWGUj0uOG
VITE_SCHWAB_CLIENT_SECRET=Ls1QL7VER1GENslDeoN8Wd8GhkEw5qxboS2OEIsZ6ANtCqxTGBW2ZY6KEcVLCTUU
VITE_SCHWAB_REDIRECT_URI=http://localhost:5174/auth/callback
```

## 🧪 **Testing Guide**

### **Step 1: Check API Mode Switcher**
On the Stocks page, you'll see a new "API Mode Switcher" component:
- **Blue box**: Direct API mode (current problematic mode)
- **Green box**: Backend-proxied mode (new recommended mode)

### **Step 2: Test Backend Connection**
1. Click **"Switch to Backend"**
2. It should show backend health status
3. If successful, you'll see backend configuration details

### **Step 3: Test OAuth Flow**
1. With backend mode selected
2. Click **"Connect to Schwab"** in the integration section
3. Should redirect to Schwab → Your Backend → Back to Frontend

## 🔍 **Troubleshooting**

### **"Backend connection failed"**
- Ensure your backend is deployed to Render
- Check that the new schwab.py router is included
- Verify environment variables are set in Render

### **"OAuth still failing"**
1. Update Schwab app redirect URI to: `https://allocraft-backend.onrender.com/schwab/callback`
2. Ensure backend environment variables are set correctly
3. Check Render logs for any backend errors

### **"Backend health check shows missing config"**
- Add environment variables to your Render service
- Redeploy the backend
- Test the health endpoint directly: `https://allocraft-backend.onrender.com/schwab/health`

## 🎉 **Benefits of Backend-Proxied API**

✅ **Security**: Credentials never leave your server  
✅ **CORS**: No browser cross-origin issues  
✅ **OAuth**: Proper server-side token management  
✅ **Reliability**: More stable than browser-based auth  
✅ **Production**: Architecture ready for production use  
✅ **Debugging**: Server logs for troubleshooting  

## 🚀 **Next Steps**

1. **Deploy backend changes** to Render
2. **Update Schwab redirect URI** in developer portal
3. **Switch to backend mode** on the frontend
4. **Test OAuth flow** end-to-end
5. **Enjoy working Schwab integration!** 🎊

---

**The backend integration is ready and should solve your OAuth issues!**
