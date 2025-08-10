Deploying Allocraft Lite (Frontend)

Overview
- React + Vite static site
- Needs VITE_API_BASE_URL to point to the backend

Render.com (static site)
1) Push to GitHub; create a new Static Site in Render for Allocraft_Lite/allocraft_lite.
2) Build command: npm ci && npm run build
3) Publish directory: dist
4) Environment variable:
   - VITE_API_BASE_URL=https://<your-backend>.onrender.com
5) Deploy and test. Login flow needs the backend auth endpoints reachable from the origin.

Local override
- In allocraft_lite/.env or .env.local set VITE_API_BASE_URL=http://localhost:8000
